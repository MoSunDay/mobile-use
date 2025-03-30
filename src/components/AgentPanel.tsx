'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { Actors, ExecutionState } from '@/lib/agent/event/types';
import DeviceStream from './DeviceStream';
import { Message } from '@/types/agent';

export default function AgentPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [showDevice, setShowDevice] = useState(false);
  const [forceStopDevice, setForceStopDevice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session ID
  useEffect(() => {
    if (!sessionId) {
      setSessionId(uuidv4());
    }
  }, [sessionId]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const setupExecutorSSE = (sessionId: string | null) => {
    if (!sessionId) return;
    // Close any existing event source
    if (eventSource) {
      eventSource.close();
    }

    // Create a new EventSource connection
    const newEventSource = new EventSource(`/api/agent?sessionId=${sessionId}`);
    setEventSource(newEventSource);

    // Handle SSE events
    newEventSource.onopen = () => {
      console.log('Executor SSE connection established');
    };

    newEventSource.onerror = error => {
      console.error('Executor SSE error:', error);
      newEventSource.close();
      setEventSource(null);
      setIsLoading(false);
      // Trigger device stream to finalize video
      setForceStopDevice(true);

      // Add error message to the chat
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Lost connection to server',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    };

    // Listen for all messages and process based on event type
    newEventSource.onmessage = event => {
      try {
        const agentEvent = JSON.parse(event.data);
        // console.log('Received SSE event:', event.data);

        // const newMessage: Message = {
        //   id: uuidv4(),
        //   role: 'log',
        //   content: `${JSON.stringify(agentEvent, null, 2)}`,
        //   timestamp: new Date(),
        // };
        // setMessages(prev => [...prev, newMessage]);

        // Process events based on actor and state
        if (agentEvent.actor === Actors.PLANNER) {
          if (agentEvent.state === ExecutionState.STEP_START) {
            // Planner is thinking
            const newMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: '🧠 Planning...',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
          } else if (agentEvent.state === ExecutionState.STEP_OK) {
            // Planner has a reasoning
            const newMessage: Message = {
              id: uuidv4(),
              role: 'assistant',
              content: `## Planning\n${agentEvent.data.details}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
          }
        }
        // System events for task status
        else if (agentEvent.actor === Actors.SYSTEM) {
          if (agentEvent.state === ExecutionState.TASK_START) {
            // Task started
            const newMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: '🔄 Task started',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
          } else if (agentEvent.state === ExecutionState.TASK_OK) {
            // Task completed successfully
            const newMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: '✅ Task complete!',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
            // Close the connection since task is complete
            newEventSource.close();
            setEventSource(null);
            setIsLoading(false);
            // Finalize device recording
            setForceStopDevice(true);
          } else if (agentEvent.state === ExecutionState.TASK_FAIL) {
            // Task failed
            const newMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: `❌ Error: ${agentEvent.data.details}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);

            // Close the connection since task failed
            newEventSource.close();
            setEventSource(null);
            setIsLoading(false);
            // Finalize device recording
            setForceStopDevice(true);
          } else if (agentEvent.state === ExecutionState.TASK_CANCEL) {
            // Task cancelled
            const newMessage: Message = {
              id: uuidv4(),
              role: 'system',
              content: '🚫 Task cancelled',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);

            // Close the connection since task is cancelled
            newEventSource.close();
            setEventSource(null);
            setIsLoading(false);
            // Finalize device recording
            setForceStopDevice(true);
          }
        }
        // Navigator or other agent events - provides observations
        else if (agentEvent.actor === Actors.NAVIGATOR) {
          if (agentEvent.state === ExecutionState.STEP_LOG) {
            const newMessage: Message = {
              id: uuidv4(),
              role: 'assistant',
              content: `## Observation\n${agentEvent.data.details}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, newMessage]);
          }
        }
        // Validator events - provides validation of the task
        else if (agentEvent.actor === Actors.VALIDATOR) {
          const newMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `## Validaton\n${agentEvent.data.details}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, newMessage]);
        }
        // Any message could be "next steps" if details contains specific formatting
        if (agentEvent.data?.details && agentEvent.data.details.includes('Next steps:')) {
          const newMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: `## Next Steps\n${agentEvent.data.details.split('Next steps:')[1].trim()}`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (err) {
        console.error('Error processing event:', err);
      }
    };

    return newEventSource;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Reset forceStop flag when starting a new session
    setForceStopDevice(false);

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Ensure we have a session ID
      // const currentSessionId = sessionId || uuidv4();
      // if (!sessionId) {
      //   setSessionId(currentSessionId);
      // }
      if (!sessionId) {
        throw new Error('No sessionId found');
      }
      setShowDevice(false);

      // Call the API to start the task
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: content,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process task');
      }

      // Setup SSE connection after making the POST request.
      // This is because the POST request will return a sessionId, which is used to setup the SSE connection.
      setupExecutorSSE(sessionId);
      // Show device window with a slight delay to ensure everything is initialized
      setTimeout(() => {
        setShowDevice(true);
      }, 2000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');

      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: `Error: ${err instanceof Error ? err.message : 'An unknown error occurred'}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);

      // Close SSE connection if there's an error
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      setShowDevice(false);
    }
  };

  const handleStopTask = async () => {
    if (!sessionId) return;

    try {
      // Signal to device stream to stop recording and finalize video
      setForceStopDevice(true);

      await fetch(`/api/agent?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      // Add system message
      const systemMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Task cancelled by user',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, systemMessage]);
      setIsLoading(false);

      // Close SSE connection
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    } catch (err) {
      console.error('Error stopping task:', err);
    }
  };

  return (
    <div className="flex flex-col h-full m-2 bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="border-b p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStopTask={handleStopTask}
        />
      </div>

      <div className="flex flex-row max-h-[780px]">
        <div className="flex-1 border-2 p-4 overflow-auto">
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        <div className="w-[1024px] h-[780px]">
          {showDevice && (
            <DeviceStream
              sessionId={sessionId || ''}
              width="100%"
              height="100%"
              forceStop={forceStopDevice}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 mx-4">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
