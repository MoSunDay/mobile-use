import { z } from 'zod';
import { BaseAgent, type BaseAgentOptions, type ExtraAgentOptions } from './base';
import { createLogger } from '../../utils/logger';
import { ActionResult, type AgentOutput } from '../types';
import type { Action } from '../actions/builder';
import { buildDynamicActionSchema } from '../actions/builder';
import { agentBrainSchema } from '../types';
import { type BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Actors, ExecutionState } from '../event/types';
import { isAuthenticationError } from '../utils';
import { ChatModelAuthError } from './errors';
import { jsonNavigatorOutputSchema } from '../actions/json_schema';
import { geminiNavigatorOutputSchema } from '../actions/json_gemini';
const logger = createLogger('NavigatorAgent');

export class NavigatorActionRegistry {
  private actions: Record<string, Action> = {};

  constructor(actions: Action[]) {
    for (const action of actions) {
      this.registerAction(action);
    }
  }

  registerAction(action: Action): void {
    this.actions[action.name()] = action;
  }

  unregisterAction(name: string): void {
    delete this.actions[name];
  }

  getAction(name: string): Action | undefined {
    return this.actions[name];
  }

  setupModelOutputSchema(): z.ZodType {
    const actionSchema = buildDynamicActionSchema(Object.values(this.actions));
    return z.object({
      current_state: agentBrainSchema,
      action: z.array(actionSchema),
    });
  }
}

export interface NavigatorResult {
  done: boolean;
}

export class NavigatorAgent extends BaseAgent<z.ZodType, NavigatorResult> {
  private actionRegistry: NavigatorActionRegistry;
  private jsonSchema: Record<string, unknown>;

  constructor(
    actionRegistry: NavigatorActionRegistry,
    options: BaseAgentOptions,
    extraOptions?: Partial<ExtraAgentOptions>
  ) {
    super(actionRegistry.setupModelOutputSchema(), options, { ...extraOptions, id: 'navigator' });

    this.actionRegistry = actionRegistry;

    this.jsonSchema = this.modelName.startsWith('gemini')
      ? geminiNavigatorOutputSchema
      : jsonNavigatorOutputSchema;

    // logger.info('Navigator zod schema', JSON.stringify(zodToJsonSchema(this.modelOutputSchema), null, 2));
  }

  async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
    // Use structured output
    if (this.withStructuredOutput) {
      const structuredLlm = this.chatLLM.withStructuredOutput(this.jsonSchema, {
        includeRaw: true,
        name: this.modelOutputToolName,
      });

      let response = undefined;
      try {
        // logger.info(
        //   'Navigator LLM invoke',
        //   JSON.stringify(inputMessages[inputMessages.length - 1], null, 2)
        // );
        response = await structuredLlm.invoke(inputMessages, {
          ...this.callOptions,
        });
        if (response.parsed) {
          // logger.info('Navigator LLM response', JSON.stringify(response.parsed, null, 2));
          return response.parsed;
        }
      } catch (error) {
        const errorMessage = `Failed to invoke ${this.modelName} with structured output: ${error}`;
        throw new Error(errorMessage);
      }

      // Use type assertion to access the properties
      const rawResponse = response.raw as BaseMessage & {
        tool_calls?: Array<{
          args: {
            currentState: typeof agentBrainSchema._type;
            action: z.infer<ReturnType<typeof buildDynamicActionSchema>>;
          };
        }>;
      };

      // sometimes LLM returns an empty content, but with one or more tool calls, so we need to check the tool calls
      if (rawResponse.tool_calls && rawResponse.tool_calls.length > 0) {
        logger.info('Navigator structuredLlm tool call with empty content', rawResponse.tool_calls);
        // only use the first tool call
        const toolCall = rawResponse.tool_calls[0];
        return {
          current_state: toolCall.args.currentState,
          action: [...toolCall.args.action],
        };
      }
      throw new Error('Could not parse response');
    }
    throw new Error('Navigator needs to work with LLM that supports tool calling');
  }

  async execute(): Promise<AgentOutput<NavigatorResult>> {
    const agentOutput: AgentOutput<NavigatorResult> = {
      id: this.id,
    };

    let cancelled = false;

    try {
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_START, 'Navigating...');

      const messageManager = this.context.messageManager;
      // add the mobile state message
      await this.addStateMessageToMemory();
      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }

      // call the model to get the actions to take
      const inputMessages = messageManager.getMessages();
      const modelOutput = await this.invoke(inputMessages);
      // emit navigatorlog event
      this.context.emitEvent(
        Actors.NAVIGATOR,
        ExecutionState.STEP_LOG,
        this.getNavigatorLogMessage(modelOutput)
      );
      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }
      // remove the last state message from memory before adding the model output
      this.removeLastStateMessageFromMemory();
      this.addModelOutputToMemory(modelOutput);

      // take the actions
      const actionResults = await this.doMultiAction(modelOutput);
      this.context.actionResults = actionResults;

      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }
      // emit event
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_OK, 'Navigation completed');
      let done = false;
      if (actionResults.length > 0 && actionResults[actionResults.length - 1].isDone) {
        done = true;
      }
      agentOutput.result = { done };
      return agentOutput;
    } catch (error) {
      this.removeLastStateMessageFromMemory();
      // Check if this is an authentication error
      if (isAuthenticationError(error)) {
        throw new ChatModelAuthError(
          'Navigator API Authentication failed. Please verify your API key',
          error
        );
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = `Navigation failed: ${errorMessage}`;
      logger.error(errorString);
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_FAIL, errorString);
      agentOutput.error = errorMessage;
      return agentOutput;
    } finally {
      // if the task is cancelled, remove the last state message from memory and emit event
      if (cancelled) {
        this.removeLastStateMessageFromMemory();
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.STEP_CANCEL,
          'Navigation cancelled'
        );
      }
    }
  }

  protected getNavigatorLogMessage(modelOutput: this['ModelOutput']): string {
    const currentState = modelOutput.current_state;
    const actions = modelOutput.action;
    /*
    format of currentState:
    "page_summary": "The comments page for the post 'Coding Isn't Programming' is open. There are multiple comments with links embedded in them.",
    "evaluation_previous_goal": "Success - The comments section of the 4th post is open as intended.",
    "memory": "Navigated to the comments section of the 4th post titled 'Coding Isn't Programming'. Need to count the links on this page.",
    "next_goal": "Count the number of links on the comments page."

    desired display example:
        logger.debug(f'🤖 {emoji} Page summary: {response.current_state.page_summary}')
        logger.info(f'{emoji} Eval: {response.current_state.evaluation_previous_goal}')
        logger.info(f'🧠 Memory: {response.current_state.memory}')
        logger.info(f'🎯 Next goal: {response.current_state.next_goal}')
        for i, action in enumerate(response.action):
			logger.info(f'🛠️  Action {i + 1}/{len(response.action)}: {action.model_dump_json(exclude_unset=True)}')
    */
    let emoji = '🤷';
    if (currentState['evaluation_previous_goal'].includes('Success')) {
      emoji = '👍';
    } else if (currentState['evaluation_previous_goal'].includes('Failed')) {
      emoji = '⚠';
    }
    let display = `
    🤖 ${emoji} Page summary: ${currentState['page_summary']}
    ${emoji} Eval: ${currentState['evaluation_previous_goal']}
    🧠 Memory: ${currentState['memory']}
    🎯 Next goal: ${currentState['next_goal']}
    `;
    for (let i = 0; i < actions.length; i++) {
      display += `\n 🛠️  Action ${i + 1}/${actions.length}: ${JSON.stringify(actions[i])}`;
    }

    return display;
  }

  /**
   * Add the state message to the memory
   */
  public async addStateMessageToMemory() {
    if (this.context.stateMessageAdded) {
      return;
    }

    const messageManager = this.context.messageManager;
    const options = this.context.options;
    // Handle results that should be included in memory
    if (this.context.actionResults.length > 0) {
      let index = 0;
      for (const r of this.context.actionResults) {
        if (r.includeInMemory) {
          if (r.extractedContent) {
            const msg = new HumanMessage(`Action result: ${r.extractedContent}`);
            // logger.info('Adding action result to memory', msg.content);
            messageManager.addMessageWithTokens(msg);
          }
          if (r.error) {
            const msg = new HumanMessage(
              `Action error: ${r.error.toString().slice(-options.maxErrorLength)}`
            );
            logger.info('Adding action error to memory', msg.content);
            messageManager.addMessageWithTokens(msg);
          }
          // reset this action result to empty, we dont want to add it again in the state message
          this.context.actionResults[index] = new ActionResult();
        }
        index++;
      }
    }

    const state = await this.prompt.getUserMessage(this.context);
    logger.info('State message to AI: ', state.content);
    messageManager.addStateMessage(state);
    this.context.stateMessageAdded = true;
  }

  /**
   * Remove the last state message from the memory
   */
  protected async removeLastStateMessageFromMemory() {
    if (!this.context.stateMessageAdded) return;
    const messageManager = this.context.messageManager;
    messageManager.removeLastStateMessage();
    this.context.stateMessageAdded = false;
  }

  private async doMultiAction(response: this['ModelOutput']): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    let errCount = 0;

    logger.info('Actions', JSON.stringify(response.action, null, 2));
    // sometimes response.action is a string, but not an array as expected, so we need to parse it as an array
    let actions: Record<string, unknown>[] = [];
    if (Array.isArray(response.action)) {
      // if the item is null, skip it
      actions = response.action.filter((item: unknown) => item !== null);
      if (actions.length === 0) {
        logger.warn('No valid actions found', response.action);
      }
    } else if (typeof response.action === 'string') {
      try {
        logger.warn('Unexpected action format', response.action);
        // try to parse the action as an JSON object
        actions = JSON.parse(response.action);
      } catch (error) {
        logger.error('Invalid action format', response.action);
        throw new Error('Invalid action output format');
      }
    } else {
      // if the action is neither an array nor a string, it should be an object
      actions = [response.action];
    }

    for (const action of actions) {
      const actionName = Object.keys(action)[0];
      const actionArgs = action[actionName];
      try {
        // check if the task is paused or stopped
        if (this.context.paused || this.context.stopped) {
          return results;
        }

        const result = await this.actionRegistry.getAction(actionName)?.call(actionArgs);
        if (result === undefined) {
          throw new Error(`Action ${actionName} not exists or returned undefined`);
        }
        results.push(result);
        // check if the task is paused or stopped
        if (this.context.paused || this.context.stopped) {
          return results;
        }
        // TODO: wait for 1 second for now, need to optimize this to avoid unnecessary waiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('doAction error', actionName, actionArgs, errorMessage);
        // unexpected error, emit event
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_FAIL, errorMessage);
        errCount++;
        if (errCount > 3) {
          throw new Error('Too many errors in actions');
        }
        results.push(
          new ActionResult({
            error: errorMessage,
            isDone: false,
            includeInMemory: true,
          })
        );
      }
    }
    return results;
  }
}
