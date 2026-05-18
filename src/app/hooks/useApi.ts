import { useState, useCallback, useRef } from 'react';

export interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

export interface UseApiResult<T = any> {
  loading: boolean;
  error: Error | null;
  data: T | null;
  execute: (params?: any) => Promise<T>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (params?: any) => Promise<T>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const retryCountRef = useRef(0);

  const execute = useCallback(async (params?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    
    const { retryCount = 3, retryDelay = 1000 } = options;
    
    const attempt = async (attemptNumber: number): Promise<T> => {
      try {
        const result = await apiFunction(params);
        setData(result);
        setError(null);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (attemptNumber < retryCount) {
          console.warn(`API call failed, retrying (${attemptNumber + 1}/${retryCount}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attemptNumber)));
          return attempt(attemptNumber + 1);
        }
        
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    };

    return attempt(0);
  }, [apiFunction, options]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    retryCountRef.current = 0;
  }, []);

  return { loading, error, data, execute, reset };
}
