/**
 * Debounce Hook
 *
 * P1 优化：防抖 Hook，用于优化频繁变化的值
 */

import { useEffect, useState } from 'react';

/**
 * 防抖 Hook
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * // 使用 debouncedSearchTerm 进行搜索，避免频繁请求
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 带立即执行的防抖 Hook
 *
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @param immediate - 是否立即执行第一次
 * @returns 防抖后的值
 */
export function useDebounceImmediate<T>(
  value: T,
  delay: number,
  immediate: boolean = false,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isFirst, setIsFirst] = useState(true);

  useEffect(() => {
    if (immediate && isFirst) {
      setDebouncedValue(value);
      setIsFirst(false);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, immediate, isFirst]);

  return debouncedValue;
}
