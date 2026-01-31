import {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type RefObject,
} from 'react';

export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}

export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList,
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, deps);
}

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay],
  );
}

export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay],
  );
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => isMountedRef.current;
}

export function useAsyncData<T>(
  asyncFunction: () => Promise<T>,
  deps: DependencyList = [],
): {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  const refresh = useCallback(() => {
    setLoading(true);
    asyncFunction()
      .then((result) => {
        if (isMounted()) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted()) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted()) {
          setLoading(false);
        }
      });
  }, [asyncFunction, isMounted]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refresh };
}

export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
): [RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) {
        setIsIntersecting(entry.isIntersecting);
      }
    }, options);

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [options.root, options.rootMargin, options.threshold]);

  return [ref, isIntersecting];
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn('Error saving to localStorage:', error);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useIdleCallback<T>(
  callback: () => T,
  options: { timeout?: number } = {},
): T | null {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
      setResult(callback());
      return;
    }

    const id = window.requestIdleCallback(
      () => {
        setResult(callback());
      },
      { timeout: options.timeout ?? 1000 },
    );

    return () => window.cancelIdleCallback(id);
  }, [callback, options.timeout]);

  return result;
}

export function useBatchState<T>(
  initialValue: T,
): [T, (updater: ((prev: T) => Partial<T>) | Partial<T>) => void] {
  const [state, setState] = useState<T>(initialValue);

  const batchUpdate = useCallback((updater: ((prev: T) => Partial<T>) | Partial<T>) => {
    setState((prev: T) => ({
      ...prev,
      ...(updater instanceof Function ? updater(prev) : updater),
    }));
  }, []);

  return [state, batchUpdate];
}

export function useStableMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<T | null>(null);
  const previousDeps = useRef<DependencyList | null>(null);

  if (
    previousDeps.current === null ||
    deps.length !== previousDeps.current.length ||
    !deps.every((dep, i) => Object.is(dep, previousDeps.current?.[i]))
  ) {
    ref.current = factory();
    previousDeps.current = deps;
  }

  return ref.current as T;
}
