import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchApiData, getErrorCode } from '@/lib/utils';

// ============================================================================
// 通用 API Query Hook
// ============================================================================

interface UseApiQueryOptions<T> {
  url: string | ((params: URLSearchParams) => string);
  params?: Record<string, string | number | boolean | undefined>;
  transform?: (data: unknown) => T;
  enabled?: boolean;
}

interface UseApiQueryReturn<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useApiQuery<T>(options: UseApiQueryOptions<T>): UseApiQueryReturn<T> {
  const { url, params = {}, transform, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const paramsString = JSON.stringify(params);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setError(null);
    setLoading(true);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });

      const finalUrl =
        typeof url === 'function' ? url(searchParams) : `${url}?${searchParams.toString()}`;
      const response = await fetchApiData<unknown>(finalUrl, {
        signal: abortControllerRef.current.signal,
      });
      const transformedData = transform ? transform(response) : (response as T);
      setData(transformedData);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(getErrorCode(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, paramsString, transform]);

  useEffect(() => {
    if (enabled) {
      void reload();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [reload, enabled]);

  return {
    data,
    error,
    loading,
    reload,
  };
}

// ============================================================================
// 通用 API Query Hook（返回数组）
// ============================================================================

interface UseApiQueryArrayOptions<T> extends Omit<UseApiQueryOptions<T[]>, 'transform'> {
  itemsKey?: string;
}

interface UseApiQueryArrayReturn<T> {
  items: T[];
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useApiQueryArray<T>(
  options: UseApiQueryArrayOptions<T>,
): UseApiQueryArrayReturn<T> {
  const { itemsKey = 'items', ...rest } = options;

  const { data, error, loading, reload } = useApiQuery<T[]>({
    ...rest,
    transform: (response) => {
      if (response && typeof response === 'object') {
        const record = response as Record<string, T[]>;
        if (Object.prototype.hasOwnProperty.call(record, itemsKey)) {
          return record[itemsKey] ?? [];
        }
      }
      return Array.isArray(response) ? response : [];
    },
  });

  return {
    items: data ?? [],
    error,
    loading,
    reload,
  };
}

// ============================================================================
// 通用 API Query Hook（返回对象）
// ============================================================================

interface UseApiQueryObjectOptions<T> extends UseApiQueryOptions<T> {
  defaultValue?: T;
}

interface UseApiQueryObjectReturn<T> {
  data: T;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useApiQueryObject<T>(
  options: UseApiQueryObjectOptions<T>,
): UseApiQueryObjectReturn<T> {
  const { defaultValue, ...rest } = options;

  const { data, error, loading, reload } = useApiQuery<T>(rest);

  return {
    data: data ?? defaultValue ?? ({} as T),
    error,
    loading,
    reload,
  };
}
