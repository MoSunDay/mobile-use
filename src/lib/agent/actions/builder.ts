import { ActionResult, type AgentContext } from '../types';
import {
  clickElementActionSchema,
  doneActionSchema,
  inputTextActionSchema,
  scrollDownActionSchema,
  scrollToTextActionSchema,
  scrollUpActionSchema,
  type ActionSchema,
} from './schemas';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ExecutionState, Actors } from '../event/types';

const logger = createLogger('Action');

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/**
 * An action is a function that takes an input and returns an ActionResult
 */
export class Action {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly handler: (input: any) => Promise<ActionResult>,
    public readonly schema: ActionSchema
  ) {}

  async call(input: unknown): Promise<ActionResult> {
    // Validate input before calling the handler
    const schema = this.schema.schema;

    // check if the schema is schema: z.object({}), if so, ignore the input
    const isEmptySchema =
      schema instanceof z.ZodObject &&
      Object.keys((schema as z.ZodObject<Record<string, z.ZodTypeAny>>).shape || {}).length === 0;

    if (isEmptySchema) {
      return await this.handler({});
    }

    const parsedArgs = this.schema.schema.safeParse(input);
    if (!parsedArgs.success) {
      const errorMessage = parsedArgs.error.message;
      throw new InvalidInputError(errorMessage);
    }
    return await this.handler(parsedArgs.data);
  }

  name() {
    return this.schema.name;
  }

  /**
   * Returns the prompt for the action
   * @returns {string} The prompt for the action
   */
  prompt() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schemaShape = (this.schema.schema as z.ZodObject<any>).shape || {};
    const schemaProperties = Object.entries(schemaShape).map(([key, value]) => {
      const zodValue = value as z.ZodTypeAny;
      return `'${key}': {'type': '${zodValue.description}', ${zodValue.isOptional() ? "'optional': true" : "'required': true"}}`;
    });

    const schemaStr =
      schemaProperties.length > 0
        ? `{${this.name()}: {${schemaProperties.join(', ')}}}`
        : `{${this.name()}: {}}`;

    return `${this.schema.description}:\n${schemaStr}`;
  }
}

// TODO: can not make every action optional, don't know why
export function buildDynamicActionSchema(actions: Action[]): z.ZodType {
  let schema = z.object({});
  for (const action of actions) {
    // create a schema for the action, it could be action.schema.schema or null
    // but don't use default: null as it causes issues with Google Generative AI
    const actionSchema = action.schema.schema.nullable().describe(action.schema.description);
    schema = schema.extend({
      [action.name()]: actionSchema,
    });
  }
  return schema.partial();
}

export class ActionBuilder {
  private readonly context: AgentContext;
  private readonly extractorLLM: BaseChatModel;

  constructor(context: AgentContext, extractorLLM: BaseChatModel) {
    this.context = context;
    this.extractorLLM = extractorLLM;
  }

  buildAppiumActions(): Action[] {
    const actions: Action[] = [];

    const done = new Action(async (input: z.infer<typeof doneActionSchema.schema>) => {
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, doneActionSchema.name);
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, input.text);
      return new ActionResult({
        isDone: true,
        extractedContent: input.text,
      });
    }, doneActionSchema);
    actions.push(done);

    const clickElement = new Action(
      async (input: z.infer<typeof clickElementActionSchema.schema>) => {
        const todo = input.desc || `Click element with index ${input.index}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, todo);
        await this.context.mobileContext.clickElement(input.index);
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, todo);
        return new ActionResult({ extractedContent: todo, includeInMemory: true });
      },
      clickElementActionSchema
    );
    actions.push(clickElement);

    const inputText = new Action(async (input: z.infer<typeof inputTextActionSchema.schema>) => {
      const todo = input.desc || `Input text into index ${input.index}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, todo);
      await this.context.mobileContext.inputText(input.index, input.text);
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, todo);
      return new ActionResult({ extractedContent: todo, includeInMemory: true });
    }, inputTextActionSchema);
    actions.push(inputText);

    const scrollDown = new Action(async (input: z.infer<typeof scrollDownActionSchema.schema>) => {
      const todo = input.desc || `Scroll down the page by ${input.amount}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, todo);
      await this.context.mobileContext.scrollDown(input.amount);
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, todo);
      return new ActionResult({ extractedContent: todo, includeInMemory: true });
    }, scrollDownActionSchema);
    actions.push(scrollDown);

    const scrollUp = new Action(async (input: z.infer<typeof scrollUpActionSchema.schema>) => {
      const todo = input.desc || `Scroll up the page by ${input.amount}`;
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, todo);
      await this.context.mobileContext.scrollUp(input.amount);
      this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, todo);
      return new ActionResult({ extractedContent: todo, includeInMemory: true });
    }, scrollUpActionSchema);
    actions.push(scrollUp);

    const scrollToText = new Action(
      async (input: z.infer<typeof scrollToTextActionSchema.schema>) => {
        const todo = input.desc || `Scroll to text ${input.text}`;
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, todo);
        await this.context.mobileContext.scrollToText(input.text);
        this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, todo);
        return new ActionResult({ extractedContent: todo, includeInMemory: true });
      },
      scrollToTextActionSchema
    );
    actions.push(scrollToText);
    return actions;
  }
}
