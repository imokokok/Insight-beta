import React, { useRef, useEffect, useState } from "react";

export function useStableValue<T>(value: T, deps: unknown[] = []): T {
  const ref = useRef({ value, deps: deps as unknown[] });

  if (ref.current.deps.length !== deps.length) {
    ref.current.deps = deps as unknown[];
    ref.current.value = value;
  } else {
    for (let i = 0; i < deps.length; i++) {
      if (!Object.is(ref.current.deps[i], deps[i])) {
        ref.current.deps = deps as unknown[];
        ref.current.value = value;
        break;
      }
    }
  }

  return ref.current.value;
}

export function useEqualityCheck<T>(
  value: T,
  comparator: (prev: T, next: T) => boolean = Object.is,
): T {
  const prevRef = useRef(value);
  const [state, setState] = useState(value);

  useEffect(() => {
    if (!comparator(prevRef.current, value)) {
      prevRef.current = value;
      setState(value);
    }
  }, [value, comparator]);

  return state;
}

export function useIdleCallback<T>(
  callback: () => T,
  options?: { timeout?: number },
): T | null {
  const [result, setResult] = useState<T | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;

    const runCallback = () => {
      const id = window.requestIdleCallback(() => {
        const value = callback();
        setResult(value);
      }, options);

      timeoutId = setTimeout(() => {
        window.cancelIdleCallback(id);
      }, options?.timeout || 1000);
    };

    runCallback();

    return () => {
      clearTimeout(timeoutId);
      if (typeof window !== "undefined") {
        window.cancelIdleCallback(timeoutId as unknown as number);
      }
    };
  }, [callback, options]);

  return result;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useFirstMount(): boolean {
  const firstMountRef = useRef(true);

  useEffect(() => {
    firstMountRef.current = false;
  }, []);

  return firstMountRef.current;
}

export function useUpdateEffect(effect: () => void, deps: unknown[]) {
  const isFirstMount = useFirstMount();

  useEffect(() => {
    if (!isFirstMount) {
      return effect();
    }
  }, deps);
}

export function useLayoutEffectAfterMount(effect: () => void, deps: unknown[]) {
  const isFirstMount = useFirstMount();

  React.useLayoutEffect(() => {
    if (!isFirstMount) {
      return effect();
    }
  }, deps);
}

export function createMemoizedComponent<P extends object>(
  Component: React.ComponentType<P>,
  arePropsEqual: (prevProps: P, nextProps: P) => boolean = (a, b) =>
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) =>
      Object.is(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    ),
) {
  return React.memo(Component, arePropsEqual);
}

export function shallowCompare<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T,
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => Object.is(obj1[key], obj2[key]));
}

export function memoize<T extends (...args: never[]) => unknown>(
  fn: T,
  cacheSize: number = 128,
): T {
  const cache = new Map<string, unknown>();

  return ((...args: Parameters<typeof fn>) => {
    const key = args.map((arg) => JSON.stringify(arg)).join(":");

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...(args as Parameters<typeof fn>));
    cache.set(key, result);

    if (cache.size > cacheSize) {
      const firstKey = cache.keys().next().value as string | undefined;
      if (firstKey) cache.delete(firstKey);
    }

    return result;
  }) as T;
}

export function useWhyDidYouUpdate(
  componentName: string,
  props: Record<string, unknown>,
) {
  const previousProps = useRef(props);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const changedProps = Object.keys(props).filter((key) => {
        const prevValue = previousProps.current[key];
        const currValue = props[key];
        return !Object.is(prevValue, currValue);
      });

      if (changedProps.length > 0) {
        console.log(
          `[${componentName}] props changed:`,
          changedProps.reduce(
            (acc, key) => {
              acc[key] = {
                from: previousProps.current[key],
                to: props[key],
              };
              return acc;
            },
            {} as Record<string, { from: unknown; to: unknown }>,
          ),
        );
      }

      previousProps.current = props;
    }
  }, [componentName, props]);
}

export {
  useMemo,
  useCallback,
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
} from "react";
