import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import {
  usePrevious,
  useFirstMount,
  useUpdateEffect,
  shallowCompare,
  memoize,
} from "@/lib/performance/renderOptimization";
import {
  useDebounce,
  useThrottle,
  deduplicateRequest,
  setMemoryCache,
  getMemoryCache,
  clearMemoryCache,
  getCacheKey,
} from "@/lib/performance/requestOptimization";

describe("usePrevious", () => {
  it("should return previous value", () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });
});

describe("useFirstMount", () => {
  it("should return true on first mount", () => {
    const { result, rerender } = renderHook(() => useFirstMount());

    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(false);
  });
});

describe("useUpdateEffect", () => {
  it("should not run on first mount", () => {
    const effect = vi.fn();
    renderHook(() => useUpdateEffect(effect, [1]));

    expect(effect).not.toHaveBeenCalled();
  });

  it("should run on subsequent updates", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useUpdateEffect(effect, [dep]),
      {
        initialProps: { dep: 1 },
      },
    );

    expect(effect).not.toHaveBeenCalled();

    rerender({ dep: 2 });
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

describe("shallowCompare", () => {
  it("should return true for equal objects", () => {
    const obj1 = { a: 1, b: "test" };
    const obj2 = { a: 1, b: "test" };

    expect(shallowCompare(obj1, obj2)).toBe(true);
  });

  it("should return false for different objects", () => {
    const obj1 = { a: 1, b: "test" };
    const obj2 = { a: 2, b: "test" };

    expect(shallowCompare(obj1, obj2)).toBe(false);
  });
});

describe("memoize", () => {
  it("should cache function results", () => {
    const callTracker = { count: 0 };
    const fn = (x: number) => {
      callTracker.count++;
      return x * 2;
    };
    const memoized = memoize(fn);

    const result1 = memoized(2);
    expect(result1).toBe(4);
    expect(callTracker.count).toBe(1);

    const result2 = memoized(2);
    expect(result2).toBe(4);
    expect(callTracker.count).toBe(1);
  });

  it("should cache function results with different keys", () => {
    const callTracker = { count: 0 };
    const fn = (x: number) => {
      callTracker.count++;
      return x * 2;
    };
    const memoized = memoize(fn);

    const result1 = memoized(2);
    expect(result1).toBe(4);
    expect(callTracker.count).toBe(1);

    const result2 = memoized(3);
    expect(result2).toBe(6);
    expect(callTracker.count).toBe(2);

    const result3 = memoized(2);
    expect(result3).toBe(4);
    expect(callTracker.count).toBe(2);
  });
});

describe("Memory Cache", () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  afterEach(() => {
    clearMemoryCache();
    cleanup();
  });

  it("should set and get cache", () => {
    setMemoryCache("test-key", { data: "test" }, 60000);
    const result = getMemoryCache("test-key");

    expect(result).toEqual({ data: "test" });
  });

  it("should return null for non-existent key", () => {
    const result = getMemoryCache("non-existent-key");
    expect(result).toBeNull();
  });

  it("should handle different data types", () => {
    setMemoryCache("string-key", "test", 60000);
    setMemoryCache("number-key", 123, 60000);
    setMemoryCache("boolean-key", true, 60000);
    setMemoryCache("array-key", [1, 2, 3], 60000);
    setMemoryCache("object-key", { nested: true }, 60000);

    expect(getMemoryCache("string-key")).toBe("test");
    expect(getMemoryCache("number-key")).toBe(123);
    expect(getMemoryCache("boolean-key")).toBe(true);
    expect(getMemoryCache("array-key")).toEqual([1, 2, 3]);
    expect(getMemoryCache("object-key")).toEqual({ nested: true });
  });

  it("should handle concurrent cache operations", () => {
    setMemoryCache("key1", { data: "value1" }, 1000);
    setMemoryCache("key2", { data: "value2" }, 1000);

    expect(getMemoryCache("key1")).toEqual({ data: "value1" });
    expect(getMemoryCache("key2")).toEqual({ data: "value2" });

    setMemoryCache("key1", { data: "updated1" }, 1000);

    expect(getMemoryCache("key1")).toEqual({ data: "updated1" });
    expect(getMemoryCache("key2")).toEqual({ data: "value2" });
  });
});

describe("getCacheKey", () => {
  it("should generate cache key from multiple values", () => {
    const key = getCacheKey("string", 123, true, null);

    expect(key).toContain("string");
    expect(key).toContain("123");
    expect(key).toContain("true");
    expect(key).toContain("null");
  });

  it("should handle arrays with simple values", () => {
    const key = getCacheKey("a", "b", "c");
    expect(key).toBeTruthy();
    expect(key.length).toBeGreaterThan(0);
  });

  it("should handle nested objects with depth limit", () => {
    const key = getCacheKey({ a: 1, b: { c: 2 } });
    expect(key).toContain("a");
    expect(key).toContain("1");
  });

  it("should handle edge cases", () => {
    expect(getCacheKey(undefined)).toBe("undefined");
    expect(getCacheKey(NaN)).toBe("NaN");
    expect(getCacheKey(Infinity)).toBe("Infinity");
    expect(getCacheKey(-Infinity)).toBe("-Infinity");
  });

  it("should handle strings with special characters", () => {
    const key = getCacheKey("test:key:value");
    expect(key).toContain("test");
  });

  it("should handle large numbers", () => {
    const key = getCacheKey(123456789012345);
    expect(key).toContain("123456789012345");
  });
});

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("should debounce function calls", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 100));

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should only call callback once for multiple rapid calls", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 50));

    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current();
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });
    }

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should reset delay on each call", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 100));

    act(() => {
      result.current();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      result.current();
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("useThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("should throttle function calls", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    act(() => {
      result.current();
      result.current();
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should not call immediately if within limit", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottle(callback, 100));

    act(() => {
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      result.current();
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe("deduplicateRequest", () => {
  it("should deduplicate requests with same key", async () => {
    let callCount = 0;
    const fetcher = () => {
      callCount++;
      return Promise.resolve("result");
    };

    const promise1 = deduplicateRequest("test-key", fetcher);
    const promise2 = deduplicateRequest("test-key", fetcher);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe("result");
    expect(result2).toBe("result");
    expect(callCount).toBe(1);
  });

  it("should allow different keys", async () => {
    let callCount = 0;
    const fetcher = () => {
      callCount++;
      return Promise.resolve("result");
    };

    const promise1 = deduplicateRequest("key-1", fetcher);
    const promise2 = deduplicateRequest("key-2", fetcher);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe("result");
    expect(result2).toBe("result");
    expect(callCount).toBe(2);
  });

  it("should handle request errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("error"));

    await expect(deduplicateRequest("error-key", fetcher)).rejects.toThrow(
      "error",
    );

    await expect(deduplicateRequest("error-key", fetcher)).rejects.toThrow(
      "error",
    );
  });

  it("should handle concurrent same-key requests", async () => {
    let callCount = 0;
    const fetcher = () => {
      callCount++;
      return Promise.resolve("result");
    };

    const promises = Array(5)
      .fill(null)
      .map(() => deduplicateRequest("concurrent-key", fetcher));

    const results = await Promise.all(promises);

    expect(results.every((r) => r === "result")).toBe(true);
    expect(callCount).toBe(1);
  });
});
