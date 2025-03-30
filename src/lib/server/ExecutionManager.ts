import { Executor } from '@/lib/agent/executor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ExecutionManager');

/**
 * Server-side singleton for managing executor instances
 * This ensures we manage resources properly during execution
 */
export class ExecutionManager {
  private static instance: ExecutionManager;
  private activeExecutors: Map<string, Executor> = new Map();
  private isInitialized = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ExecutionManager {
    if (!ExecutionManager.instance) {
      ExecutionManager.instance = new ExecutionManager();
    }
    return ExecutionManager.instance;
  }

  /**
   * Store an executor instance for a session
   */
  public setExecutor(sessionId: string, executor: Executor): void {
    this.activeExecutors.set(sessionId, executor);
    logger.info(`Executor registered for session: ${sessionId}`);
  }

  /**
   * Get an executor instance for a session
   */
  public getExecutor(sessionId: string): Executor | undefined {
    return this.activeExecutors.get(sessionId);
  }

  /**
   * Remove an executor instance for a session
   */
  public removeExecutor(sessionId: string): boolean {
    logger.info(`Removing executor for session: ${sessionId}`);
    return this.activeExecutors.delete(sessionId);
  }

  /**
   * Check if an executor exists for a session
   */
  public hasExecutor(sessionId: string): boolean {
    return this.activeExecutors.has(sessionId);
  }

  /**
   * Get all active executor session IDs
   */
  public getAllSessionIds(): string[] {
    return Array.from(this.activeExecutors.keys());
  }

  /**
   * Clean up resources when shutting down
   */
  public async cleanup(): Promise<void> {
    logger.info('Cleaning up resources');

    // Clean up all executors
    for (const [sessionId, executor] of this.activeExecutors.entries()) {
      try {
        await executor.cleanup();
      } catch (error) {
        logger.error(`Error cleaning up executor ${sessionId}:`, error);
      }
    }
    this.activeExecutors.clear();

    this.isInitialized = false;
  }
}

// Export a default getter function for the singleton
export default function getExecutionManager(): ExecutionManager {
  return ExecutionManager.getInstance();
}
