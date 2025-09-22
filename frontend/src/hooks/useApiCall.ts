import { useState, useCallback } from 'react';
import { parseApiError, shouldRetry, type ApiError } from '@/lib/errorHandling';
import { useErrorToast, useSuccessToast } from '@/components/ui/toast';

interface UseApiCallOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseApiCallReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export const useApiCall = <T = any>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions = {}
): UseApiCallReturn<T> => {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage,
    maxRetries = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const errorToast = useErrorToast();
  const successToast = useSuccessToast();

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      let attempt = 0;
      
      while (attempt <= maxRetries) {
        try {
          setLoading(true);
          setError(null);

          const response = await apiFunction(...args);
          const result = response.data || response;

          setData(result);
          
          if (showSuccessToast) {
            successToast(successMessage || 'Operation completed successfully');
          }

          return result;
        } catch (err) {
          const apiError = parseApiError(err);
          
          // Check if we should retry
          if (attempt < maxRetries && shouldRetry(apiError, attempt, maxRetries)) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }

          setError(apiError);
          
          if (showErrorToast) {
            errorToast(apiError.message, apiError.error);
          }

          return null;
        } finally {
          setLoading(false);
        }
      }

      return null;
    },
    [apiFunction, maxRetries, retryDelay, showSuccessToast, showErrorToast, successMessage, errorToast, successToast]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

// Specialized hooks for common operations
export const useApiMutation = <T = any>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions = {}
) => {
  return useApiCall<T>(apiFunction, {
    showSuccessToast: true,
    showErrorToast: true,
    ...options,
  });
};

export const useApiQuery = <T = any>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions = {}
) => {
  return useApiCall<T>(apiFunction, {
    showSuccessToast: false,
    showErrorToast: true,
    maxRetries: 2,
    ...options,
  });
};

// Hook for form submissions with validation error handling
export const useFormSubmission = <T = any>(
  apiFunction: (...args: any[]) => Promise<any>,
  options: UseApiCallOptions & {
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  } = {}
) => {
  const { onSuccess, onError, ...apiOptions } = options;
  
  const {
    data,
    loading,
    error,
    execute: baseExecute,
    reset,
  } = useApiCall<T>(apiFunction, {
    showSuccessToast: true,
    showErrorToast: false, // Handle errors manually for forms
    ...apiOptions,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      const result = await baseExecute(...args);
      
      if (result && onSuccess) {
        onSuccess(result);
      } else if (error && onError) {
        onError(error);
      }
      
      return result;
    },
    [baseExecute, onSuccess, onError, error]
  );

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};