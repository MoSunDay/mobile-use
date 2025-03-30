export enum AgentMessageType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  ERROR = 'error',
  THINKING = 'thinking',
}

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  content: string;
  timestamp: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'log';
  content: string;
  timestamp: Date;
}
