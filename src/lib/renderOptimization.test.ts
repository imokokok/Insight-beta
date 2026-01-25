import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import {
  usePrevious,
  useFirstMount,
  useUpdateEffect,
  shallowCompare,
  memoize,
} from "@/lib/renderOptimization";
import {
  useDebounce,
  useThrottle,
  deduplicateRequest,
  setMemoryCache,
  getMemoryCache,
  clearMemoryCache,
  getCacheKey,
} from "@/lib/requestOptimization";

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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

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
});

describe("Memory Cache", () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  afterEach(() => {
    clearMemoryCache();
  });

  it("should set and get cache", () => {
    setMemoryCache("test-key", { data: "test" }, 60000);
    const result = getMemoryCache("test-key");

    expect(result).toEqual({ data: "test" });
  });

  it("should return null for expired cache", () => {
    setMemoryCache("expired-key", { data: "expired" }, 1);
    vi.advanceTimersByTime(2);

    const result = getMemoryCache("expired-key");
    expect(result).toBeNull();
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

  it("should handle arrays", () => {
    const key = getCacheKey([1, 2, 3]);

    expect(key).toContain("1");
    expect(key).toContain("2");
    expect(key).toContain("3");
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
    const debouncedCallback = useDebounce(callback, 100);

    act(() => {
      debouncedCallback();
      debouncedCallback();
      debouncedCallback();
    });

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

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
    const throttledCallback = useThrottle(callback, 100);

    act(() => {
      throttledCallback();
      throttledCallback();
      throttledCallback();
    });

    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);

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
});
