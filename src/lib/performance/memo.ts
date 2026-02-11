/**
 * 高性能 Memo 工具
 * 用于优化组件渲染和计算
 */

import { useMemo, useRef, useCallback, memo as reactMemo } from 'react';
import type { DependencyList } from 'react';

/**
 * 深度比较函数
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== (b as unknown as unknown[]).length) return false;
    return a.every((item, index) => deepEqual(item, (b as unknown as unknown[])[index]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b as unknown as object);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    deepEqual((a as unknown as Record<string, unknown>)[key], (b as unknown as Record<string, unknown>)[key])
  );
}

/**
 * 浅层比较函数（用于 props 比较）
 */
export function shallowEqual<T extends Record<string, unknown>>(objA: T, objB: T): boolean {
  if (objA === objB) return true;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => objA[key] === objB[key]);
}

/**
 * 创建自定义比较函数的 memo
 */
export function memoWithCompare<P extends object>(
  Component: React.ComponentType<P>,
  compare?: (prevProps: P, nextProps: P) => boolean
) {
  return reactMemo(Component, compare);
}

/**
 * 使用深度比较的 useMemo
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T } | null>(null);
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }
  
  return ref.current.value;
}

/**
 * 使用自定义比较函数的 useMemo
 */
export function useCustomMemo<T>(
  factory: () => T,
  deps: DependencyList,
  compare: (a: DependencyList, b: DependencyList) => boolean
): T {
  const ref = useRef<{ deps: DependencyList; value: T } | null>(null);
  
  if (!ref.current || !compare(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }
  
  return ref.current.value;
}

/**
 * 创建稳定回调的 useCallback 包装
 * 使用 deepEqual 比较依赖
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList
): T {
  const ref = useRef<T>(callback);
  const depsRef = useRef<DependencyList>(deps);
  
  if (!deepEqual(depsRef.current, deps)) {
    depsRef.current = deps;
    ref.current = callback;
  }
  
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}

/**
 * 缓存计算结果的类
 */
export class MemoizedCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    return this.cache.get(key);
  }
  
  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

/**
 * 函数记忆化装饰器
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * 带过期时间的缓存
 */
export function memoizeWithExpiry<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ttlMs: number,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { value: ReturnType<T>; expiry: number }>();
  
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && cached.expiry > now) {
      return cached.value;
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, { value: result, expiry: now + ttlMs });
    return result;
  } as T;
}

/**
 * LRU 缓存实现
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到最新位置
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

/**
 * 防抖记忆化
 * 延迟执行并在延迟期间内只执行最后一次
 */
export function debounceMemoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout;
  let resolveQueue: Array<(value: ReturnType<T>) => void> = [];
  
  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve) => {
      resolveQueue.push(resolve);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const result = fn(...args) as ReturnType<T>;
        resolveQueue.forEach(r => r(result));
        resolveQueue = [];
      }, delayMs);
    });
  };
}

/**
 * 创建选择器记忆化
 * 用于 Redux/Reatom 等状态管理库
 */
export function createMemoizedSelector<T, R>(
  selector: (state: T) => R,
  equalityFn: (a: R, b: R) => boolean = deepEqual
): (state: T) => R {
  let lastState: T | undefined;
  let lastResult: R | undefined;
  
  return function (state: T): R {
    if (lastState !== undefined && equalityFn(selector(lastState as T), selector(state))) {
      return lastResult as R;
    }
    
    lastState = state;
    lastResult = selector(state);
    return lastResult;
  };
}
