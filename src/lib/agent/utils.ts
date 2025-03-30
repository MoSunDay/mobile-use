/**
 * Check if an error is an authentication error based on its message content
 * @param error - The error to check
 * @returns True if the error is an authentication error, false otherwise
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('auth') ||
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('credential')
    );
  }
  return false;
}

/**
 * Gets a brief description of an error
 * @param error - The error object
 * @returns A string describing the error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
