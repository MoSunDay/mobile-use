'use client';

import { AgentMessage, AgentMessageType } from '@/types/agent';
import { FiUser, FiCpu, FiInfo, FiAlertCircle, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

interface AgentOutputProps {
  message: AgentMessage;
}

export default function AgentOutput({ message }: AgentOutputProps) {
  const getIcon = () => {
    switch (message.type) {
      case AgentMessageType.USER:
        return <FiUser className="h-5 w-5" />;
      case AgentMessageType.AGENT:
        return <FiCpu className="h-5 w-5" />;
      case AgentMessageType.SYSTEM:
        return <FiInfo className="h-5 w-5" />;
      case AgentMessageType.ERROR:
        return <FiAlertCircle className="h-5 w-5 text-red-500" />;
      case AgentMessageType.THINKING:
        return <FiClock className="h-5 w-5 animate-pulse" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (message.type) {
      case AgentMessageType.USER:
        return 'bg-blue-50';
      case AgentMessageType.AGENT:
        return 'bg-white';
      case AgentMessageType.SYSTEM:
        return 'bg-gray-50';
      case AgentMessageType.ERROR:
        return 'bg-red-50';
      case AgentMessageType.THINKING:
        return 'bg-yellow-50';
      default:
        return 'bg-white';
    }
  };

  return (
    <div className={`mb-4 p-4 rounded-lg ${getBackgroundColor()}`}>
      <div className="flex items-start">
        <div className="mr-3 mt-1">{getIcon()}</div>
        <div className="flex-1">
          <div className="prose max-w-none">
            {message.type === AgentMessageType.AGENT ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-2">{message.timestamp.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}
