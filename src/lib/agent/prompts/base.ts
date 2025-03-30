import { HumanMessage, type SystemMessage } from '@langchain/core/messages';
import type { AgentContext } from '../types';
import { createLogger } from '../../utils/logger';
import { formatElementsList } from '@/lib/mobile/androidViewProcessor';

const logger = createLogger('Prompt:base');

/**
 * Abstract base class for all prompt types
 */
abstract class BasePrompt {
  /**
   * Returns the system message that defines the AI's role and behavior
   * @returns SystemMessage from LangChain
   */
  abstract getSystemMessage(): SystemMessage;

  /**
   * Returns the user message for the specific prompt type
   * @param context - Optional context data needed for generating the user message
   * @returns HumanMessage from LangChain
   */
  abstract getUserMessage(context: AgentContext): Promise<HumanMessage>;

  async buildMobileStateUserMessage(context: AgentContext): Promise<HumanMessage> {
    const mobileState = await context.mobileContext.getState();
    const stateDescription = `
    Current app: ${mobileState.currentApp}
    Other available apps:
    ${mobileState.activeApps.join('\n')}
    Interactive elements:
    ${formatElementsList(mobileState.interactiveElements)}
    `;

    if (mobileState.screenshot && context.options.useVision) {
      return new HumanMessage({
        content: [
          { type: 'text', text: stateDescription },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${mobileState.screenshot}` },
          },
        ],
      });
    }

    return new HumanMessage(stateDescription);
  }
}

export { BasePrompt };
