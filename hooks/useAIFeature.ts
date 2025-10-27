/**
 * useAIFeature Hook
 * Centralized error handling and loading states for all AI features
 * Auto-fetches on mount when modal becomes visible
 */

import { useEffect, useRef, useState } from 'react';
import { UserFriendlyError, translateError } from '../utils/errorTranslator';
import { ErrorLogger } from '../utils/errorLogger';

interface UseAIFeatureOptions<T> {
  visible: boolean;
  conversationId: string;
  fetchFunction: (conversationId: string, ...args: any[]) => Promise<T>;
  dependencies?: any[];
}

interface UseAIFeatureResult<T> {
  data: T | null;
  loading: boolean;
  loadingSlowly: boolean; // True after 5 seconds of loading
  error: UserFriendlyError | null;
  reload: () => Promise<void>;
}

/**
 * Custom hook for AI feature modals with standard loading/error/data pattern
 * Includes progressive loading state for better UX on slow operations
 * Now with user-friendly error messages and developer logging
 */
export function useAIFeature<T>({
  visible,
  conversationId,
  fetchFunction,
  dependencies = [],
}: UseAIFeatureOptions<T>): UseAIFeatureResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSlowly, setLoadingSlowly] = useState(false);
  const [error, setError] = useState<UserFriendlyError | null>(null);
  const slowLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadingSlowly(false);
    setError(null);

    // Set "loading slowly" state after 5 seconds
    slowLoadingTimerRef.current = setTimeout(() => {
      setLoadingSlowly(true);
    }, 5000);

    try {
      const result = await fetchFunction(conversationId, ...dependencies);
      setData(result as T);
    } catch (err: any) {
      console.error('[useAIFeature] Error:', err);
      
      // Translate to user-friendly error
      const friendlyError = translateError(err);
      setError(friendlyError);
      
      // Log for developers
      ErrorLogger.log(err, {
        conversationId,
        feature: 'ai_feature_hook',
        action: 'fetch',
        metadata: { dependencies },
      });
    } finally {
      // Clear the slow loading timer
      if (slowLoadingTimerRef.current) {
        clearTimeout(slowLoadingTimerRef.current);
        slowLoadingTimerRef.current = null;
      }
      setLoading(false);
      setLoadingSlowly(false);
    }
  };

  // Auto-fetch when modal becomes visible
  useEffect(() => {
    if (visible) {
      load();
    }

    // Cleanup timer on unmount
    return () => {
      if (slowLoadingTimerRef.current) {
        clearTimeout(slowLoadingTimerRef.current);
      }
    };
  }, [visible, conversationId, ...dependencies]);

  const reload = async () => {
    await load();
  };

  return {
    data,
    loading,
    loadingSlowly,
    error,
    reload,
  };
}
