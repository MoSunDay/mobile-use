'use client';

import { useState, FormEvent } from 'react';
import { FiSend, FiStopCircle, FiTrash2 } from 'react-icons/fi';

interface TaskInputProps {
  onSubmit: (task: string) => void;
  onStop: () => void;
  onClear: () => void;
  isProcessing: boolean;
}

export default function TaskInput({ onSubmit, onStop, onClear, isProcessing }: TaskInputProps) {
  const [task, setTask] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (task.trim() && !isProcessing) {
      onSubmit(task);
      setTask('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="Enter a task for the agent..."
          className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          rows={3}
          disabled={isProcessing}
        />
      </div>
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
            disabled={isProcessing}
          >
            <FiTrash2 className="mr-2" />
            Clear
          </button>
        </div>
        <div className="flex space-x-2">
          {isProcessing && (
            <button
              type="button"
              onClick={onStop}
              className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
            >
              <FiStopCircle className="mr-2" />
              Stop
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!task.trim() || isProcessing}
          >
            <FiSend className="mr-2" />
            {isProcessing ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </div>
    </form>
  );
}
