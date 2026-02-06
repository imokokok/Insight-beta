/**
 * URL State Hook - URL 状态同步 Hook
 *
 * 用于将组件状态同步到 URL 查询参数
 * - 状态持久化到 URL
 * - 从 URL 恢复状态
 * - 支持复杂数据类型
 */

'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import type { Route } from 'next';

interface UseUrlStateOptions<T> {
  /** 是否替换当前历史记录 */
  replace?: boolean;
  /** 是否滚动到顶部 */
  scroll?: boolean;
  /** 自定义序列化函数 */
  serialize?: (value: T[keyof T]) => string;
  /** 自定义反序列化函数 */
  deserialize?: (value: string) => T[keyof T];
  /** 延迟更新时间（毫秒） */
  debounceMs?: number;
}

interface UrlStateResult<T> {
  /** 当前状态 */
  state: T;
  /** 更新状态 */
  setState: (updates: Partial<T>) => void;
  /** 重置状态 */
  resetState: () => void;
  /** 获取特定键的值 */
  getValue: <K extends keyof T>(key: K) => T[K];
  /** 设置特定键的值 */
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
}

/**
 * URL 状态同步 Hook
 */
export function useUrlState<T extends Record<string, unknown>>(
  defaultValues: T,
  options: UseUrlStateOptions<T> = {},
): UrlStateResult<T> {
  const {
    replace = false,
    scroll = false,
    serialize = JSON.stringify,
    deserialize = (v: string) => {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    },
    debounceMs = 0,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 从 URL 解析状态
  const state = useMemo(() => {
    const params: Partial<T> = {};

    searchParams.forEach((value, key) => {
      if (key in defaultValues) {
        params[key as keyof T] = deserialize(value) as T[keyof T];
      }
    });

    return { ...defaultValues, ...params };
  }, [searchParams, defaultValues, deserialize]);

  // 更新 URL 状态
  const updateUrl = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          params.delete(key);
        } else if (typeof value === 'object') {
          params.set(key, serialize(value));
        } else {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = (queryString ? `${pathname}?${queryString}` : pathname) as Route;

      if (replace) {
        router.replace(url, { scroll });
      } else {
        router.push(url, { scroll });
      }
    },
    [pathname, router, searchParams, replace, scroll, serialize],
  );

  // 设置状态（带防抖）
  const setState = useCallback(
    (updates: Partial<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (debounceMs > 0) {
        timeoutRef.current = setTimeout(() => {
          updateUrl(updates);
        }, debounceMs);
      } else {
        updateUrl(updates);
      }
    },
    [updateUrl, debounceMs],
  );

  // 重置状态
  const resetState = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    router.push(pathname as Route, { scroll });
  }, [pathname, router, scroll]);

  // 获取特定键的值
  const getValue = useCallback(
    <K extends keyof T>(key: K): T[K] => {
      return state[key];
    },
    [state],
  );

  // 设置特定键的值
  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setState({ [key]: value } as unknown as Partial<T>);
    },
    [setState],
  );

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setState,
    resetState,
    getValue,
    setValue,
  };
}

/**
 * 数组类型的 URL 状态 Hook
 */
export function useUrlArrayState<T extends string>(
  key: string,
  defaultValue: T[] = [],
): {
  value: T[];
  add: (item: T) => void;
  remove: (item: T) => void;
  toggle: (item: T) => void;
  set: (items: T[]) => void;
  clear: () => void;
  has: (item: T) => boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo(() => {
    const param = searchParams.get(key);
    if (!param) return defaultValue;
    return param.split(',').filter(Boolean) as T[];
  }, [searchParams, key, defaultValue]);

  const updateValue = useCallback(
    (newValue: T[]) => {
      const params = new URLSearchParams(searchParams);

      if (newValue.length === 0) {
        params.delete(key);
      } else {
        params.set(key, newValue.join(','));
      }

      const queryString = params.toString();
      const url = (queryString ? `${pathname}?${queryString}` : pathname) as Route;
      router.push(url, { scroll: false });
    },
    [router, pathname, searchParams, key],
  );

  const add = useCallback(
    (item: T) => {
      if (!value.includes(item)) {
        updateValue([...value, item]);
      }
    },
    [value, updateValue],
  );

  const remove = useCallback(
    (item: T) => {
      updateValue(value.filter((v) => v !== item));
    },
    [value, updateValue],
  );

  const toggle = useCallback(
    (item: T) => {
      if (value.includes(item)) {
        remove(item);
      } else {
        add(item);
      }
    },
    [value, add, remove],
  );

  const set = useCallback(
    (items: T[]) => {
      updateValue(items);
    },
    [updateValue],
  );

  const clear = useCallback(() => {
    updateValue([]);
  }, [updateValue]);

  const has = useCallback((item: T) => value.includes(item), [value]);

  return {
    value,
    add,
    remove,
    toggle,
    set,
    clear,
    has,
  };
}

/**
 * 分页 URL 状态 Hook
 */
export function useUrlPagination(
  defaultPage: number = 1,
  defaultPageSize: number = 10,
): {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = useMemo(() => {
    const p = searchParams.get('page');
    return p ? parseInt(p, 10) || defaultPage : defaultPage;
  }, [searchParams, defaultPage]);

  const pageSize = useMemo(() => {
    const ps = searchParams.get('pageSize');
    return ps ? parseInt(ps, 10) || defaultPageSize : defaultPageSize;
  }, [searchParams, defaultPageSize]);

  const updateParams = useCallback(
    (updates: { page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams);

      if (updates.page !== undefined) {
        if (updates.page === defaultPage) {
          params.delete('page');
        } else {
          params.set('page', String(updates.page));
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === defaultPageSize) {
          params.delete('pageSize');
        } else {
          params.set('pageSize', String(updates.pageSize));
        }
      }

      const queryString = params.toString();
      const url = (queryString ? `${pathname}?${queryString}` : pathname) as Route;
      router.push(url, { scroll: false });
    },
    [router, pathname, searchParams, defaultPage, defaultPageSize],
  );

  const setPage = useCallback(
    (newPage: number) => {
      updateParams({ page: Math.max(1, newPage) });
    },
    [updateParams],
  );

  const setPageSize = useCallback(
    (newSize: number) => {
      updateParams({ pageSize: newSize, page: 1 });
    },
    [updateParams],
  );

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(Math.max(1, page - 1));
  }, [page, setPage]);

  const reset = useCallback(() => {
    updateParams({ page: defaultPage, pageSize: defaultPageSize });
  }, [updateParams, defaultPage, defaultPageSize]);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    reset,
  };
}

/**
 * 排序 URL 状态 Hook
 */
export function useUrlSort(
  defaultField: string = '',
  defaultOrder: 'asc' | 'desc' = 'asc',
): {
  field: string;
  order: 'asc' | 'desc';
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  toggleOrder: () => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const field = useMemo(() => {
    return searchParams.get('sortField') || defaultField;
  }, [searchParams, defaultField]);

  const order = useMemo(() => {
    return (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultOrder;
  }, [searchParams, defaultOrder]);

  const setSort = useCallback(
    (newField: string, newOrder?: 'asc' | 'desc') => {
      const params = new URLSearchParams(searchParams);

      if (newField === defaultField) {
        params.delete('sortField');
      } else {
        params.set('sortField', newField);
      }

      const finalOrder = newOrder || order;
      if (finalOrder === defaultOrder) {
        params.delete('sortOrder');
      } else {
        params.set('sortOrder', finalOrder);
      }

      const queryString = params.toString();
      const url = (queryString ? `${pathname}?${queryString}` : pathname) as Route;
      router.push(url, { scroll: false });
    },
    [router, pathname, searchParams, order, defaultField, defaultOrder],
  );

  const toggleOrder = useCallback(() => {
    if (field) {
      setSort(field, order === 'asc' ? 'desc' : 'asc');
    }
  }, [field, order, setSort]);

  const reset = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('sortField');
    params.delete('sortOrder');

    const queryString = params.toString();
    const url = (queryString ? `${pathname}?${queryString}` : pathname) as Route;
    router.push(url, { scroll: false });
  }, [router, pathname, searchParams]);

  return {
    field,
    order,
    setSort,
    toggleOrder,
    reset,
  };
}

const urlStateExports = {
  useUrlState,
  useUrlArrayState,
  useUrlPagination,
  useUrlSort,
};

export default urlStateExports;
