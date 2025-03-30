import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api:health');

/**
 * Health check endpoint
 *
 * This endpoint is used to verify that the server is running correctly.
 * It returns a 200 status with a simple JSON response.
 *
 * @returns {NextResponse} A response with status 200 and a JSON body
 */
export async function GET() {
  logger.info('Health check requested');

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 }
  );
}
