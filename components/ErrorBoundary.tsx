/**
 * Error Boundary Component
 * Catches errors in React component tree and displays fallback UI
 */

import React from 'react';
import { ErrorLogger } from '../utils/errorLogger';
import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactElement;
  level?: 'app' | 'screen' | 'feature';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const level = this.props.level || 'app';
    
    // Log error with context
    ErrorLogger.log(error, {
      feature: 'error_boundary',
      action: 'component_crash',
      metadata: {
        level,
        componentStack: errorInfo.componentStack,
      },
    });
    
    console.error(`[ErrorBoundary:${level}]`, error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      
      // Default fallback based on level
      return (
        <ErrorFallback
          level={this.props.level || 'app'}
          error={this.state.error}
          onRetry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

