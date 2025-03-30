import {
  type AgentNameEnum,
  llmProviderModelNames,
  llmProviderParameters,
  ProviderTypeEnum,
} from './types';

// Interface for a single provider configuration
export interface ProviderConfig {
  name?: string; // Display name in the options
  type?: ProviderTypeEnum; // Help to decide which LangChain ChatModel package to use
  apiKey: string; // Must be provided, but may be empty for local models
  baseUrl?: string; // Optional base URL if provided
  modelNames?: string[]; // Chosen model names, if not provided use hardcoded names from llmProviderModelNames
  createdAt?: number; // Timestamp in milliseconds when the provider was created
}

// Interface for storing multiple LLM provider configurations
// The key is the provider id, which is the same as the provider type for built-in providers, but is custom for custom providers
export interface LLMKeyRecord {
  providers: Record<string, ProviderConfig>;
}

// Helper function to determine provider type from provider name
// Make sure to update this function if you add a new provider type
export function getProviderTypeByProviderId(providerId: string): ProviderTypeEnum {
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
    case ProviderTypeEnum.Anthropic:
    case ProviderTypeEnum.DeepSeek:
    case ProviderTypeEnum.Gemini:
    case ProviderTypeEnum.Grok:
    case ProviderTypeEnum.Ollama:
      return providerId;
    default:
      return ProviderTypeEnum.CustomOpenAI;
  }
}

// Helper function to get display name from provider id
// Make sure to update this function if you add a new provider type
export function getDefaultDisplayNameFromProviderId(providerId: string): string {
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
      return 'OpenAI';
    case ProviderTypeEnum.Anthropic:
      return 'Anthropic';
    case ProviderTypeEnum.DeepSeek:
      return 'DeepSeek';
    case ProviderTypeEnum.Gemini:
      return 'Gemini';
    case ProviderTypeEnum.Grok:
      return 'Grok';
    case ProviderTypeEnum.Ollama:
      return 'Ollama';
    default:
      return providerId; // Use the provider id as display name for custom providers by default
  }
}

// Get default configuration for built-in providers
// Make sure to update this function if you add a new provider type
export function getDefaultProviderConfig(providerId: string): ProviderConfig {
  switch (providerId) {
    case ProviderTypeEnum.OpenAI:
    case ProviderTypeEnum.Anthropic:
    case ProviderTypeEnum.DeepSeek:
    case ProviderTypeEnum.Gemini:
    case ProviderTypeEnum.Grok:
      return {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || '',
        name: getDefaultDisplayNameFromProviderId(providerId),
        type: providerId,
        modelNames: [...(llmProviderModelNames[providerId] || [])],
        createdAt: Date.now(),
      };

    case ProviderTypeEnum.Ollama:
      return {
        apiKey: 'ollama', // Set default API key for Ollama
        name: getDefaultDisplayNameFromProviderId(ProviderTypeEnum.Ollama),
        type: ProviderTypeEnum.Ollama,
        modelNames: [],
        baseUrl: 'http://localhost:11434',
        createdAt: Date.now(),
      };
    default:
      return {
        apiKey: '',
        name: getDefaultDisplayNameFromProviderId(providerId),
        type: ProviderTypeEnum.CustomOpenAI,
        baseUrl: '',
        modelNames: [],
        createdAt: Date.now(),
      };
  }
}

export function getDefaultAgentModelParams(
  providerId: string,
  agentName: AgentNameEnum
): Record<string, number> {
  const newParameters = llmProviderParameters[providerId as keyof typeof llmProviderParameters]?.[
    agentName
  ] || {
    temperature: 0.1,
    topP: 0.1,
  };
  return newParameters;
}

// Helper function to ensure backward compatibility for provider configs
function ensureBackwardCompatibility(providerId: string, config: ProviderConfig): ProviderConfig {
  const updatedConfig = { ...config };
  if (!updatedConfig.name) {
    updatedConfig.name = getDefaultDisplayNameFromProviderId(providerId);
  }
  if (!updatedConfig.type) {
    updatedConfig.type = getProviderTypeByProviderId(providerId);
  }
  if (!updatedConfig.modelNames) {
    updatedConfig.modelNames =
      llmProviderModelNames[providerId as keyof typeof llmProviderModelNames] || [];
  }
  if (!updatedConfig.createdAt) {
    // if createdAt is not set, set it to "03/04/2025" for backward compatibility
    updatedConfig.createdAt = new Date('03/04/2025').getTime();
  }
  return updatedConfig;
}
