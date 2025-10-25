import { useEffect, useRef, useState } from 'react';

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
  error: string;
  reload: () => Promise<void>;
}

/**
 * Custom hook for AI feature modals with standard loading/error/data pattern
 * Includes progressive loading state for better UX on slow operations
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
  const [error, setError] = useState('');
  const slowLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadingSlowly(false);
    setError('');

    // Set "loading slowly" state after 5 seconds
    slowLoadingTimerRef.current = setTimeout(() => {
      setLoadingSlowly(true);
    }, 5000);

    try {
      const result = await fetchFunction(conversationId, ...dependencies);
      setData(result as T);
    } catch (err: any) {
      console.error('AI feature error:', err);
      setError(err.message || 'An error occurred');
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

  useEffect(() => {
    if (visible) {
      load();
    } else {
      // Clean up timer when modal closes
      if (slowLoadingTimerRef.current) {
        clearTimeout(slowLoadingTimerRef.current);
        slowLoadingTimerRef.current = null;
      }
      setLoadingSlowly(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conversationId, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slowLoadingTimerRef.current) {
        clearTimeout(slowLoadingTimerRef.current);
      }
    };
  }, []);

  return { data, loading, loadingSlowly, error, reload: load };
}

