'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiStopCircle } from 'react-icons/fi';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  onStopTask: () => void;
}

export default function ChatInput({ onSendMessage, isLoading, onStopTask }: ChatInputProps) {
  const task = `
open google chrome app and search for articles on vibe coding
`;
  const [message, setMessage] = useState(task.trim());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a task or question..."
        className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[50px] max-h-[150px]"
        disabled={isLoading}
      />
      <div className="ml-2 flex">
        {isLoading ? (
          <button
            type="button"
            onClick={onStopTask}
            className="bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Stop task"
          >
            <FiStopCircle className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-primary-600 text-white rounded-lg p-3 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <FiSend className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}
