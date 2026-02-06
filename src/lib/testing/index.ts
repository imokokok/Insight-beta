/**
 * Testing Utilities - 测试工具集
 *
 * 提供测试辅助函数、Mock 数据生成器等
 */

import { vi } from 'vitest';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

// ============================================================================
// Mock 数据生成器
// ============================================================================

export function generateMockId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateMockAddress(): string {
  return (
    '0x' +
    Array(40)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('')
  );
}

export function generateMockTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// Oracle Mock 数据
// ============================================================================

export function createMockOracleInstance(overrides = {}) {
  return {
    id: generateMockId(),
    name: 'Test Oracle',
    protocol: 'chainlink' as OracleProtocol,
    chain: 'ethereum' as SupportedChain,
    enabled: true,
    config: {
      rpcUrl: 'https://rpc.example.com',
      chain: 'ethereum' as SupportedChain,
      contractAddress: generateMockAddress(),
    },
    createdAt: generateMockTimestamp(),
    updatedAt: generateMockTimestamp(),
    ...overrides,
  };
}

export function createMockPriceFeed(overrides = {}) {
  return {
    id: generateMockId(),
    symbol: 'ETH/USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    protocol: 'chainlink' as OracleProtocol,
    chain: 'ethereum' as SupportedChain,
    price: 3500.5,
    timestamp: Date.now(),
    confidence: 0.95,
    ...overrides,
  };
}

export function createMockAssertion(overrides = {}) {
  return {
    id: generateMockId(),
    assertionId: 'assertion-' + Math.floor(Math.random() * 10000),
    protocol: 'uma' as OracleProtocol,
    chain: 'ethereum' as SupportedChain,
    asserter: generateMockAddress(),
    claim: 'Test claim',
    bond: BigInt(1000000000000000000),
    liveness: 7200,
    expirationTime: Date.now() + 7200000,
    status: 'Pending' as const,
    createdAt: generateMockTimestamp(),
    updatedAt: generateMockTimestamp(),
    ...overrides,
  };
}

// ============================================================================
// API Mock 工具
// ============================================================================

export function mockNextRequest(
  options: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Request {
  const { method = 'GET', url = 'http://localhost:3000/api/test', body, headers = {} } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

export function mockNextResponse() {
  return {
    json: vi.fn(),
    status: 200,
    headers: new Headers(),
  };
}

// ============================================================================
// 数据库 Mock
// ============================================================================

export function createMockPrismaClient() {
  return {
    oracleConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    priceHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    assertion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    dispute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callbacks) => Promise.all(callbacks)),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

// ============================================================================
// 区块链 Mock
// ============================================================================

export function createMockViemClient() {
  return {
    readContract: vi.fn(),
    writeContract: vi.fn(),
    getBlockNumber: vi.fn(),
    getBalance: vi.fn(),
    waitForTransactionReceipt: vi.fn(),
  };
}

export function createMockOracleClient() {
  return {
    fetchPrice: vi.fn(),
    fetchPrices: vi.fn(),
    getSupportedSymbols: vi.fn(),
    checkHealth: vi.fn(),
    getProtocolInfo: vi.fn(),
    getHealth: vi.fn(),
    destroy: vi.fn(),
  };
}

// ============================================================================
// 测试辅助函数
// ============================================================================

export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function suppressConsole(): () => void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();

  return () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  };
}

// ============================================================================
// Matchers
// ============================================================================

export function toBeValidUUID(received: string): { pass: boolean; message: () => string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const pass = uuidRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
  };
}

export function toBeValidAddress(received: string): { pass: boolean; message: () => string } {
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  const pass = addressRegex.test(received);

  return {
    pass,
    message: () =>
      pass
        ? `expected ${received} not to be a valid Ethereum address`
        : `expected ${received} to be a valid Ethereum address`,
  };
}

// ============================================================================
// 测试数据工厂
// ============================================================================

export class TestDataFactory {
  private oracles: ReturnType<typeof createMockOracleInstance>[] = [];
  private prices: ReturnType<typeof createMockPriceFeed>[] = [];
  private assertions: ReturnType<typeof createMockAssertion>[] = [];

  createOracle(count: number = 1, overrides = {}) {
    const oracles = Array(count)
      .fill(null)
      .map(() => createMockOracleInstance(overrides));
    this.oracles.push(...oracles);
    return count === 1 ? oracles[0] : oracles;
  }

  createPriceFeed(count: number = 1, overrides = {}) {
    const prices = Array(count)
      .fill(null)
      .map(() => createMockPriceFeed(overrides));
    this.prices.push(...prices);
    return count === 1 ? prices[0] : prices;
  }

  createAssertion(count: number = 1, overrides = {}) {
    const assertions = Array(count)
      .fill(null)
      .map(() => createMockAssertion(overrides));
    this.assertions.push(...assertions);
    return count === 1 ? assertions[0] : assertions;
  }

  cleanup() {
    this.oracles = [];
    this.prices = [];
    this.assertions = [];
  }

  getAllOracles() {
    return this.oracles;
  }

  getAllPrices() {
    return this.prices;
  }

  getAllAssertions() {
    return this.assertions;
  }
}

// ============================================================================
// 性能测试
// ============================================================================

export async function measurePerformance<T>(
  fn: () => Promise<T>,
  iterations: number = 100,
): Promise<{ average: number; min: number; max: number; results: T[] }> {
  const times: number[] = [];
  const results: T[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    times.push(end - start);
    results.push(result);
  }

  return {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    results,
  };
}
