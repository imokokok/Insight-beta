/**
 * usePrevious Hook
 *
 * 获取上一次渲染的值
 */

import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function usePreviousDistinct<T>(
  value: T,
  compare: (prev: T | undefined, next: T) => boolean = (a, b) => a !== b,
): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const prevValue = ref.current;

  useEffect(() => {
    if (compare(prevValue, value)) {
      ref.current = value;
    }
  }, [value, compare, prevValue]);

  return prevValue;
}
