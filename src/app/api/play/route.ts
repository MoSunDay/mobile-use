import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import getExecutionManager from '@/lib/server/executionManager';
import fs from 'fs/promises';
import sharp from 'sharp';

const logger = createLogger('API:Play');

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    logger.error('Session ID is required but was not provided');
    return new Response('Session ID is required', { status: 400 });
  }

  logger.info(`Getting Page to stream for session: ${sessionId}`);
  const executionManager = getExecutionManager();
  logger.debug(`Execution Manager: ${executionManager.getAllSessionIds()}`);
  const executor = executionManager.getExecutor(sessionId);

  if (!executor) {
    logger.error(`!!Executor not found for session: ${sessionId}`);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  const mobileContext = executor.context.mobileContext;

  logger.info(`Setting up screen streaming for session: ${sessionId}`);

  async function compressPngBuffer(inputBuffer) {
    try {
      const compressedBuffer = await sharp(inputBuffer)
        .png({
          compressionLevel: 9, // Maximum compression
          adaptiveFiltering: true, // Enable adaptive filtering
          palette: true, // Use palette-based output
          quality: 80, // Set quality to 80
        })
        .toBuffer();
      return compressedBuffer;
    } catch (error) {
      console.error('Error during compression:', error);
      throw error;
    }
  }

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start: async controller => {
      try {
        // Function to send event to this client
        const sendEvent = (data: string) => {
          controller.enqueue(encoder.encode(`data: data:image/png;base64,${data}\n\n`));
        };

        // Send initial connection message
        // sendEvent(JSON.stringify({ type: 'connected' }));

        const sendScreenshots = async () => {
          try {
            const screenshot = await mobileContext.base64Screenshot();
            const screenshotBuffer = Buffer.from(screenshot, 'base64');
            const screenshotCompressed = await compressPngBuffer(screenshotBuffer);

            // const timestamp = Date.now();
            // const filePath = `tmp/screenshot-${timestamp}.png`;
            // await fs.writeFile(filePath, screenshotCompressed);
            // logger.info(`Screenshot saved to ${filePath}`);

            sendEvent(screenshotCompressed.toString('base64'));
          } catch (error) {
            logger.error('Error capturing screenshot:', error);
            controller.error(error);
          }
        };

        // Run the screenshot capture in a loop every second
        const intervalId = setInterval(sendScreenshots, 1000);

        // Clean up interval when connection closes
        request.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          logger.info(`Cleaning up screen stream for session: ${sessionId}`);
        });
      } catch (error) {
        logger.error('Error in stream setup:', error);
        controller.error(error);
      }
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
