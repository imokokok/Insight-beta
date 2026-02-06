import { useState, useEffect } from 'react';

/**
 * useDebounce Hook - 防抖处理
 *
 * 用于延迟更新值，常用于搜索输入等场景
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // 只在 debouncedSearchTerm 变化 300ms 后执行
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
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
 * useDebouncedCallback Hook - 防抖回调函数
 *
 * 用于防抖处理回调函数，常用于搜索按钮点击等场景
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => fetchSearchResults(query),
 *   300
 * );
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}
