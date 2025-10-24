import { useEffect, useState } from 'react';

interface UseAIFeatureOptions<T> {
  visible: boolean;
  conversationId: string;
  fetchFunction: (conversationId: string, ...args: any[]) => Promise<T>;
  dependencies?: any[];
}

interface UseAIFeatureResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

/**
 * Custom hook for AI feature modals with standard loading/error/data pattern
 */
export function useAIFeature<T>({
  visible,
  conversationId,
  fetchFunction,
  dependencies = [],
}: UseAIFeatureOptions<T>): UseAIFeatureResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await fetchFunction(conversationId, ...dependencies);
      setData(result as T);
    } catch (err: any) {
      console.error('AI feature error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, conversationId, ...dependencies]);

  return { data, loading, error, reload: load };
}

