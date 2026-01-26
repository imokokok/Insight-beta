import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';

export interface TestScenario<T> {
  name: string;
  input: T;
  expected: T extends unknown ? unknown : never;
  setup?: () => void;
  teardown?: () => void;
}

export interface EdgeCase<T> {
  name: string;
  value: T;
  shouldThrow?: boolean;
  expectedBehavior?: string;
}

export interface MockConfig<T> {
  function: keyof T;
  returnValue?: unknown;
  implementation?: (...args: unknown[]) => unknown;
  times?: number;
}

export function createMockHelpers<T extends object>(target: T) {
  const mocks: Map<keyof T, Mock> = new Map();

  const mock = (prop: keyof T): Mock => {
    if (!mocks.has(prop)) {
      const mockFn = vi.fn();
      mocks.set(prop, mockFn);
      Object.defineProperty(target, prop, {
        get: () => mockFn,
        configurable: true,
      });
    }
    return mocks.get(prop)!;
  };

  const mockImplementation = (prop: keyof T, impl: (...args: unknown[]) => unknown) => {
    const mockFn = mock(prop);
    mockFn.mockImplementation(impl);
  };

  const mockReturnValue = (prop: keyof T, value: unknown) => {
    const mockFn = mock(prop);
    mockFn.mockReturnValue(value);
  };

  const mockResolvedValue = async (prop: keyof T, value: unknown) => {
    const mockFn = mock(prop);
    mockFn.mockResolvedValue(value);
  };

  const mockRejectedValue = async (prop: keyof T, error: Error | string) => {
    const mockFn = mock(prop);
    const errorObj = error instanceof Error ? error : new Error(error);
    mockFn.mockRejectedValue(errorObj);
  };

  const resetMocks = () => {
    mocks.forEach((mockFn) => mockFn.mockReset());
  };

  const clearMocks = () => {
    mocks.forEach((mockFn) => mockFn.mockClear());
  };

  const restoreMocks = () => {
    mocks.forEach((mockFn) => mockFn.mockRestore());
    mocks.clear();
  };

  return {
    mock,
    mockImplementation,
    mockReturnValue,
    mockResolvedValue,
    mockRejectedValue,
    resetMocks,
    clearMocks,
    restoreMocks,
    getMock: (prop: keyof T) => mocks.get(prop),
  };
}

export function runTestScenarios<T>(
  testFunction: (scenario: TestScenario<T>) => void,
  scenarios: TestScenario<T>[],
): void {
  describe.each(scenarios)('$name', (scenario) => {
    beforeEach(() => {
      scenario.setup?.();
    });

    afterEach(() => {
      scenario.teardown?.();
    });

    it(`should handle ${scenario.name}`, () => {
      if (scenario.shouldThrow) {
        expect(() => testFunction(scenario)).toThrow();
      } else {
        const result = testFunction(scenario);
        expect(result).toEqual(scenario.expected);
      }
    });
  });
}

export function runEdgeCaseTests<T>(
  testFunction: (edgeCase: EdgeCase<T>) => void | Promise<void>,
  edgeCases: EdgeCase<T>[],
): void {
  describe.each(edgeCases)('$name', (edgeCase) => {
    it(`should ${edgeCase.expectedBehavior || 'handle correctly'}`, async () => {
      if (edgeCase.shouldThrow) {
        expect(() => testFunction(edgeCase)).toThrow();
      } else {
        await testFunction(edgeCase);
      }
    });
  });
}

export function createErrorBoundaryTest() {
  const errorLog: Array<{ error: Error; componentStack: string }> = [];

  const onError = (error: Error, errorInfo: { componentStack: string }) => {
    errorLog.push({ error, componentStack: errorInfo.componentStack });
  };

  return {
    errorLog,
    onError,
    reset: () => {
      errorLog.length = 0;
    },
  };
}

export function createAsyncTestHelpers() {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitFor = async (condition: () => boolean, timeout = 5000, interval = 100): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return true;
      }
      await wait(interval);
    }

    return false;
  };

  const waitForAsync = async function <T>(
    asyncCondition: () => Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await asyncCondition()) {
        return true;
      }
      await wait(interval);
    }

    return false;
  };

  return {
    wait,
    waitFor,
    waitForAsync,
  };
}

export function createRenderHelpers() {
  const renderWithProviders = (
    component: React.ReactElement,
    providers: Array<{ Provider: React.Provider<unknown>; value: unknown }>,
  ) => {
    let rendered = component;

    providers.forEach(({ Provider, value }) => {
      rendered = <Provider value={value}>{rendered}</Provider>;
    });

    return rendered;
  };

  const createMockStore = (initialState: Record<string, unknown>) => {
    return {
      getState: () => initialState,
      dispatch: vi.fn(),
      subscribe: vi.fn(),
      replaceReducer: vi.fn(),
    };
  };

  return {
    renderWithProviders,
    createMockStore,
  };
}

export function createPerformanceHelpers() {
  const measureExecutionTime = async function <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  };

  const measureRenderTime = (component: React.ReactElement): number => {
    const start = performance.now();
    render(component);
    return performance.now() - start;
  };

  const createThrottleHelper = (threshold = 100) => {
    let lastCall = 0;

    return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      return ((...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= threshold) {
          lastCall = now;
          return fn(...args);
        }
      }) as T;
    };
  };

  const createDebounceHelper = (wait = 100) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      return ((...args: Parameters<T>) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          fn(...args);
        }, wait);
      }) as T;
    };
  };

  return {
    measureExecutionTime,
    measureRenderTime,
    createThrottleHelper,
    createDebounceHelper,
  };
}

export function createNetworkHelpers() {
  const createMockResponse = function <T>(data: T, status = 200, ok = true) {
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => data,
      text: async () => JSON.stringify(data),
      blob: async () => new Blob([JSON.stringify(data)]),
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          return headers[name.toLowerCase()] || null;
        },
      },
    } as unknown as Response;
  };

  const createMockErrorResponse = (message: string, status = 500) => {
    return createMockResponse({ error: message }, status, false);
  };

  const createNetworkError = () => {
    return new Error('Network request failed');
  };

  const createTimeoutError = (timeout = 5000) => {
    return new Error(`Request timed out after ${timeout}ms`);
  };

  return {
    createMockResponse,
    createMockErrorResponse,
    createNetworkError,
    createTimeoutError,
  };
}

export function createAccessibilityHelpers() {
  const checkAriaAttributes = (element: Element) => {
    const violations: string[] = [];

    const requiredAriaAttrs: Record<string, string[]> = {
      button: ['aria-label'],
      input: ['aria-label', 'aria-labelledby'],
      select: ['aria-label', 'aria-labelledby'],
      textarea: ['aria-label', 'aria-labelledby'],
      img: ['alt'],
      link: ['aria-label'],
    };

    const tagName = element.tagName.toLowerCase();
    const requiredAttrs = requiredAriaAttrs[tagName] || [];

    requiredAttrs.forEach((attr) => {
      if (!element.hasAttribute(attr)) {
        violations.push(`Missing required attribute: ${attr} on <${tagName}>`);
      }
    });

    if (element.getAttribute('role')?.includes('button') && !element.hasAttribute('aria-disabled')) {
      const interactiveAttrs = ['tabindex', 'onclick', 'onkeydown'];
      const hasInteraction = interactiveAttrs.some((attr) => element.hasAttribute(attr));

      if (!hasInteraction) {
        violations.push('Interactive element missing interaction attributes');
      }
    }

    return violations;
  };

  const checkKeyboardNavigation = (element: Element) => {
    const violations: string[] = [];

    if (element.getAttribute('tabindex') === '-1') {
      if (element.getAttribute('role')?.includes('button') || element.getAttribute('role') === 'link') {
        violations.push('Interactive element with tabindex=-1 may not be keyboard accessible');
      }
    }

    return violations;
  };

  const checkColorContrast = (element: Element): boolean => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    return color !== backgroundColor;
  };

  return {
    checkAriaAttributes,
    checkKeyboardNavigation,
    checkColorContrast,
  };
}

export function createMemoryHelpers() {
  const trackMemoryUsage = () => {
    if (typeof window !== 'undefined' && (window as unknown as { performance?: { memory?: { usedJSHeapSize: number } } }).performance?.memory) {
      const memInfo = (window as unknown as { performance: { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance.memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        limit: memInfo.jsHeapSizeLimit,
        percentage: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  };

  const detectMemoryLeaks = (refs: WeakRef<object>[]) => {
    const activeRefs = refs.filter((ref) => ref.deref() !== undefined);
    return activeRefs.length > 0 ? activeRefs.length : 0;
  };

  const forceGarbageCollection = async () => {
    if (window.gc) {
      (window as unknown as { gc: () => void }).gc();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return {
    trackMemoryUsage,
    detectMemoryLeaks,
    forceGarbageCollection,
  };
}

export function createValidationHelpers() {
  const createValidator = function <T>(schema: Record<keyof T, (value: unknown) => boolean>) {
    return (data: Partial<T>): { valid: boolean; errors: Partial<Record<keyof T, string>> } => {
      const errors: Partial<Record<keyof T, string>> = {};
      let valid = true;

      for (const [key, validate] of Object.entries(schema)) {
        const value = data[key as keyof T];
        if (!validate(value)) {
          errors[key as keyof T] = `Invalid value for ${key}`;
          valid = false;
        }
      }

      return { valid, errors };
    };
  };

  const validateRequired = (value: unknown): boolean => {
    return value !== null && value !== undefined && value !== '';
  };

  const validateType = function <T>(expectedType: string) {
    return (value: unknown): value is T => {
      if (expectedType === 'string') return typeof value === 'string';
      if (expectedType === 'number') return typeof value === 'number' && !isNaN(value);
      if (expectedType === 'boolean') return typeof value === 'boolean';
      if (expectedType === 'array') return Array.isArray(value);
      if (expectedType === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
      return false;
    };
  };

  const validateLength = (min?: number, max?: number) => {
    return (value: string): boolean => {
      if (min !== undefined && value.length < min) return false;
      if (max !== undefined && value.length > max) return false;
      return true;
    };
  };

  const validatePattern = (regex: RegExp) => {
    return (value: string): boolean => regex.test(value);
  };

  const validateRange = (min?: number, max?: number) => {
    return (value: number): boolean => {
      if (min !== undefined && value < min) return false;
      if (max !== undefined && value > max) return false;
      return true;
    };
  };

  return {
    createValidator,
    validateRequired,
    validateType,
    validateLength,
    validatePattern,
    validateRange,
  };
}

export function createIntegrationHelpers() {
  const createMockService = <T extends Record<string, unknown>>(
    service: T,
    methods: Array<keyof T>,
  ) => {
    const mockService = {} as T;

    methods.forEach((method) => {
      mockService[method] = vi.fn().mockImplementation((...args: unknown[]) => {
        console.warn(`Mocking ${String(method)} with default implementation`);
        return null;
      });
    });

    return mockService;
  };

  const createServiceProxy = <T extends object>(target: T): T => {
    return new Proxy(target, {
      get: (obj, prop) => {
        if (prop in obj) {
          return obj[prop];
        }
        console.warn(`Attempting to access non-existent property: ${String(prop)}`);
        return undefined;
      },
    });
  };

  const createEventBus = () => {
    const listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

    const on = (event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);
    };

    const off = (event: string, callback: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(callback);
    };

    const emit = (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((callback) => callback(...args));
    };

    const once = (event: string, callback: (...args: unknown[]) => void) => {
      const wrapper = (...args: unknown[]) => {
        callback(...args);
        off(event, wrapper);
      };
      on(event, wrapper);
    };

    const removeAllListeners = (event?: string) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    };

    return {
      on,
      off,
      emit,
      once,
      removeAllListeners,
      listenerCount: (event: string) => listeners.get(event)?.size || 0,
    };
  };

  return {
    createMockService,
    createServiceProxy,
    createEventBus,
  };
}

export const testUtils = {
  mock: createMockHelpers,
  scenarios: runTestScenarios,
  edgeCases: runEdgeCaseTests,
  errorBoundary: createErrorBoundaryTest,
  async: createAsyncTestHelpers,
  render: createRenderHelpers,
  performance: createPerformanceHelpers,
  network: createNetworkHelpers,
  accessibility: createAccessibilityHelpers,
  memory: createMemoryHelpers,
  validation: createValidationHelpers,
  integration: createIntegrationHelpers,
};
