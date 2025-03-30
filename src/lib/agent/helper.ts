import { type ProviderConfig, type ModelConfig, ProviderTypeEnum } from '@/lib/settings';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

const maxTokens = 1024 * 4;

function isOpenAIOModel(modelName: string): boolean {
  return modelName.startsWith('openai/o') || modelName.startsWith('o');
}

function createOpenAIChatModel(
  providerConfig: ProviderConfig,
  modelConfig: ModelConfig
): BaseChatModel {
  const args: {
    model: string;
    apiKey?: string;
    configuration?: Record<string, unknown>;
    modelKwargs?: { max_completion_tokens: number };
    topP?: number;
    temperature?: number;
    maxTokens?: number;
  } = {
    model: modelConfig.modelName,
    apiKey: providerConfig.apiKey,
  };

  if (providerConfig.baseUrl) {
    args.configuration = {
      baseURL: providerConfig.baseUrl,
    };
  }
  // custom provider may have no api key
  if (providerConfig.apiKey) {
    args.apiKey = providerConfig.apiKey;
  }

  // O series models have different parameters
  if (isOpenAIOModel(modelConfig.modelName)) {
    args.modelKwargs = {
      max_completion_tokens: maxTokens,
    };
  } else {
    args.topP = (modelConfig.parameters?.topP ?? 0.1) as number;
    args.temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
    args.maxTokens = maxTokens;
  }
  return new ChatOpenAI(args);
}

// create a chat model based on the agent name, the model name and provider
export function createChatModel(
  providerConfig: ProviderConfig,
  modelConfig: ModelConfig
): BaseChatModel {
  const temperature = (modelConfig.parameters?.temperature ?? 0.1) as number;
  const topP = (modelConfig.parameters?.topP ?? 0.1) as number;

  switch (modelConfig.provider) {
    case ProviderTypeEnum.OpenAI: {
      return createOpenAIChatModel(providerConfig, modelConfig);
    }
    case ProviderTypeEnum.Anthropic: {
      const args = {
        model: modelConfig.modelName,
        apiKey: providerConfig.apiKey,
        maxTokens,
        temperature,
        topP,
        clientOptions: {},
      };
      return new ChatAnthropic(args);
    }
    // For providers that have missing dependencies, fall back to OpenAI
    case ProviderTypeEnum.DeepSeek:
    case ProviderTypeEnum.Gemini:
    case ProviderTypeEnum.Grok:
    case ProviderTypeEnum.Ollama:
    default: {
      // Since we're missing the dependencies, use OpenAI as a fallback
      console.warn(
        `Using OpenAI as fallback for ${modelConfig.provider} provider (missing dependencies)`
      );
      return createOpenAIChatModel(providerConfig, modelConfig);
    }
  }
}
