import { NextRequest, NextResponse } from 'next/server';
import { getDefaultProviderConfig, ProviderTypeEnum } from '@/lib/settings';
import { Executor } from '@/lib/agent/executor';
import { createChatModel } from '@/lib/agent/helper';
import { EventEmitter } from 'events';
import { createLogger } from '@/lib/utils/logger';
import getExecutionManager from '@/lib/server/executionManager';
import { AgentEvent } from '@/lib/agent/event/types';
import Appium from '@/lib/mobile/appium';

const logger = createLogger('API:Agent');

// Create a new EventEmitter instance for each session
const sessionEventEmitters = new Map<string, EventEmitter>();

export async function GET(request: NextRequest) {
  logger.info('Recvd GET request for Executor SSE events');

  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const executionManager = getExecutionManager();
  logger.debug(`Execution Manager: ${executionManager.getAllSessionIds()}`);
  const executor = executionManager.getExecutor(sessionId);

  if (!executor) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Create a new EventEmitter for this session if it doesn't exist
  if (!sessionEventEmitters.has(sessionId)) {
    sessionEventEmitters.set(sessionId, new EventEmitter());
  }

  const emitter = sessionEventEmitters.get(sessionId)!;

  // Create response stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to the events
      const listener = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      emitter.on('message', listener);

      // Subscribe to events from the executor
      executor.subscribeExecutionEvents(async (event: AgentEvent) => {
        // Forward the event to the emitter
        emitter.emit('message', event);
        return Promise.resolve();
      });

      // Handle connection close
      request.signal.addEventListener('abort', () => {
        emitter.removeListener('message', listener);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    logger.info('POST request received');
    const data = await request.json();
    const { task, sessionId } = data;

    if (!task || !sessionId) {
      return NextResponse.json({ error: 'Task and session ID are required' }, { status: 400 });
    }

    const executionManager = getExecutionManager();

    // Check if an executor already exists for this session
    if (executionManager.hasExecutor(sessionId)) {
      return NextResponse.json({ error: 'Session already exists' }, { status: 409 });
    }

    // Initialize mobile context
    const appium = new Appium();
    const mobileContext = await appium.newContext();

    // Get the language model
    const providerConfig = getDefaultProviderConfig(ProviderTypeEnum.OpenAI);
    const modelConfig = {
      provider: ProviderTypeEnum.OpenAI,
      modelName: 'gpt-4o',
    };
    const model = createChatModel(providerConfig, modelConfig);

    // Create a new executor
    const executor = new Executor(task, sessionId, mobileContext, model);

    // Store the executor
    executionManager.setExecutor(sessionId, executor);

    //TESTING without llm calls
    let testMode = false;
    // testMode = true;
    if (testMode) {
      // cleanup after n seconds
      setTimeout(() => {
        executor.cleanup();
        executionManager.removeExecutor(sessionId);
      }, 5000);
      return NextResponse.json({ success: true, testMode: true });
    }

    // Start execution in the background
    executor
      .execute()
      .catch(error => {
        logger.error(`Error executing task for session ${sessionId}:`, error);
      })
      .finally(() => {
        executor.cleanup();
        executionManager.removeExecutor(sessionId);
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  logger.info('DELETE request received');
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const executionManager = getExecutionManager();
  const executor = executionManager.getExecutor(sessionId);

  if (!executor) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  try {
    // Cancel the task
    await executor.cancel();

    // Remove the executor
    executionManager.removeExecutor(sessionId);

    // Clean up event emitter
    sessionEventEmitters.delete(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error cancelling task for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
