/**
 * Error Fallback UI Components
 * Different UIs for app-level, screen-level, and feature-level errors
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translateError, UserFriendlyError } from '../utils/errorTranslator';

interface ErrorFallbackProps {
  level: 'app' | 'screen' | 'feature';
  error: Error;
  onRetry?: () => void;
}

export function ErrorFallback({ level, error, onRetry }: ErrorFallbackProps) {
  const friendly = translateError(error);
  
  if (level === 'app') {
    return <FullScreenError error={friendly} onRetry={onRetry} />;
  }
  
  if (level === 'screen') {
    return <ScreenError error={friendly} onRetry={onRetry} />;
  }
  
  return <InlineError error={friendly} onRetry={onRetry} />;
}

// Full-screen error (catastrophic failures)
function FullScreenError({ error, onRetry }: { error: UserFriendlyError; onRetry?: () => void }) {
  return (
    <View style={styles.fullScreen}>
      <Text style={styles.errorIconLarge}>⚠️</Text>
      <Text style={styles.errorTitleLarge}>
        {error.title || 'App Error'}
      </Text>
      <Text style={styles.errorMessage}>
        {error.message || 'The app encountered an unexpected error.'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButtonLarge}>
          <Text style={styles.retryText}>Restart App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Screen-level error (navigation preserved)
function ScreenError({ error, onRetry }: { error: UserFriendlyError; onRetry?: () => void }) {
  const router = useRouter();
  
  return (
    <View style={styles.screenError}>
      <Text style={styles.errorIcon}>😕</Text>
      <Text style={styles.errorTitle}>
        {error.title || 'Something Went Wrong'}
      </Text>
      <Text style={styles.errorMessage}>
        {error.message || "We couldn't load this screen."}
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.primaryButton}>
            <Text style={styles.buttonTextPrimary}>{error.action || 'Retry'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Feature-level error (inline, dismissible)
function InlineError({ error, onRetry }: { error: UserFriendlyError; onRetry?: () => void }) {
  return (
    <View style={styles.inlineError}>
      <Text style={styles.inlineTitle}>
        {error.title || 'Feature Unavailable'}
      </Text>
      <Text style={styles.inlineMessage}>
        {error.message || 'This feature is temporarily unavailable.'}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.inlineRetry}>
          <Text style={styles.inlineRetryText}>{error.action || 'Try Again'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen error styles
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorIconLarge: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitleLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButtonLarge: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Screen-level error styles
  screenError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Inline error styles
  inlineError: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 16,
    borderRadius: 8,
    marginVertical: 12,
  },
  inlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  inlineMessage: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  inlineRetry: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFC107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  inlineRetryText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
});

