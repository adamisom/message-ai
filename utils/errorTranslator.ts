/**
 * Error Translation Service
 * Converts technical errors into user-friendly messages
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export function translateError(error: Error): UserFriendlyError {
  const errorMessage = error.message.toLowerCase();
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch failed')) {
    return {
      title: 'Connection Issue',
      message: 'Unable to reach the server. Please check your internet connection.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Firestore permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('insufficient')) {
    return {
      title: 'Access Denied',
      message: "You don't have permission to perform this action.",
      action: 'Contact Support',
      severity: 'error',
    };
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota exceeded')) {
    return {
      title: 'Too Many Requests',
      message: "You've reached the usage limit. Please try again in a few minutes.",
      action: 'Wait',
      severity: 'warning',
    };
  }
  
  // Authentication errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthenticated')) {
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please log in again.',
      action: 'Log In',
      severity: 'warning',
    };
  }
  
  // AI service errors
  if (errorMessage.includes('anthropic') || errorMessage.includes('openai') || errorMessage.includes('ai')) {
    return {
      title: 'AI Service Unavailable',
      message: 'The AI feature is temporarily unavailable. Please try again in a moment.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout')) {
    return {
      title: 'Request Timed Out',
      message: 'This is taking longer than expected. Please try again.',
      action: 'Retry',
      severity: 'warning',
    };
  }
  
  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry',
    severity: 'error',
  };
}

