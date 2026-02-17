// Error message sanitization for production
// Prevents leaking sensitive information in error messages

/**
 * Sanitizes error messages for production
 * @param error - The error object
 * @param isDev - Whether running in development mode
 * @returns Safe error message for production, detailed message for development
 */
export function sanitizeError(error: unknown, isDev: boolean): string {
  if (isDev) {
    // Development: return full error details
    return (error as Error).message || 'Unknown error'
  }

  // Production: return generic messages only
  // Never expose stack traces, database errors, or internal details
  const errorMessage = (error as Error).message || ''

  // Map specific error patterns to safe messages
  if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('already exists')) {
    return 'This resource already exists'
  }

  if (errorMessage.includes('NOT NULL constraint') || errorMessage.includes('required')) {
    return 'Missing required fields'
  }

  if (errorMessage.includes('FOREIGN KEY constraint')) {
    return 'Invalid reference to related resource'
  }

  if (errorMessage.includes('no such table') || errorMessage.includes('no such column')) {
    return 'Database configuration error'
  }

  if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Unauthorized')) {
    return 'Invalid credentials'
  }

  // Default: generic error message
  return 'An error occurred. Please try again.'
}

/**
 * Type guard to check if error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}
