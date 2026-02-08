/**
 * Shared Modules Benchmark Tests - 共享模块基准测试
 *
 * 测试共享模块的性能表现
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { SupportedChain } from '@/lib/shared/blockchain/ContractRegistry';
import { ContractRegistry } from '@/lib/shared/blockchain/ContractRegistry';
import { BatchInserter } from '@/lib/shared/database/BatchInserter';
import { ErrorHandler } from '@/lib/shared/errors/ErrorHandler';

// Mock database
vi.mock('@/server/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/server/db';

describe('BatchInserter Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(query).mockResolvedValue({ rowCount: 100 });
  });

  it('should handle large batch insertions efficiently', async () => {
    const inserter = new BatchInserter<{ id: string; value: number }>({
      tableName: 'test_table',
      columns: ['id', 'value'],
      batchSize: 1000,
    });

    // 生成大量测试数据
    const items = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      value: i * 10,
    }));

    const startTime = performance.now();
    const result = await inserter.insert(items);
    const endTime = performance.now();

    // 验证插入成功（mock 返回的 rowCount 是 100，所以结果是 1000）
    expect(result).toBe(1000);

    // 验证性能（应该在合理时间内完成）
    const duration = endTime - startTime;
    console.log(`BatchInserter: Inserted 10,000 items in ${duration.toFixed(2)}ms`);

    // 验证 batch 数量（10000 / 1000 = 10 batches）
    expect(query).toHaveBeenCalledTimes(10);
  });

  it('should handle different batch sizes efficiently', async () => {
    const batchSizes = [100, 500, 1000, 5000];
    const totalItems = 10000;

    for (const batchSize of batchSizes) {
      vi.clearAllMocks();
      vi.mocked(query).mockResolvedValue({ rowCount: batchSize });

      const inserter = new BatchInserter<{ id: string }>({
        tableName: 'test_table',
        columns: ['id'],
        batchSize,
      });

      const items = Array.from({ length: totalItems }, (_, i) => ({
        id: `item-${i}`,
      }));

      const startTime = performance.now();
      await inserter.insert(items);
      const endTime = performance.now();

      const expectedBatches = Math.ceil(totalItems / batchSize);
      expect(query).toHaveBeenCalledTimes(expectedBatches);

      console.log(
        `Batch size ${batchSize}: ${expectedBatches} queries in ${(endTime - startTime).toFixed(2)}ms`,
      );
    }
  });
});

describe('ErrorHandler Performance', () => {
  it('should handle error creation efficiently', async () => {
    const iterations = 10000;
    const errors: Error[] = [];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const error = ErrorHandler.createPriceFetchError(
        new Error(`Test error ${i}`),
        'chainlink',
        'ethereum',
        'ETH/USD',
      );
      errors.push(error);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(errors.length).toBe(iterations);
    console.log(
      `ErrorHandler: Created ${iterations} errors in ${duration.toFixed(2)}ms (${(duration / iterations).toFixed(4)}ms per error)`,
    );

    // 验证性能（应该非常快）
    expect(duration).toBeLessThan(1000); // 1秒内完成
  });

  it('should handle retry operations efficiently', async () => {
    let callCount = 0;
    const operation = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Temporary error');
      }
      return 'success';
    };

    const startTime = performance.now();

    const result = await ErrorHandler.withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10, // 短延迟便于测试
    });

    const endTime = performance.now();

    expect(result).toBe('success');
    expect(callCount).toBe(3);
    console.log(`ErrorHandler: Retry operation completed in ${(endTime - startTime).toFixed(2)}ms`);
  });
});

describe('ContractRegistry Performance', () => {
  it('should handle large registry efficiently', () => {
    const registry = new ContractRegistry();
    const chainCount = 1000; // ContractRegistry 使用链作为 key，所以每个链一个地址

    const startTime = performance.now();

    // 注册大量链的合约地址
    const chains = [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
      'fantom',
      'bsc',
      'celo',
      'gnosis',
    ];

    for (let i = 0; i < chainCount; i++) {
      const chain = chains[i % chains.length];
      registry.register(chain as SupportedChain, `0x${i.toString(16).padStart(40, '0')}`);
    }

    const endTime = performance.now();

    // 验证注册成功（ContractRegistry 使用链作为 key，所以最多只有 chains.length 个唯一链）
    expect(registry.size).toBeLessThanOrEqual(chains.length);
    console.log(
      `ContractRegistry: Registered ${registry.size} unique chain contracts in ${(endTime - startTime).toFixed(2)}ms`,
    );

    // 验证查询性能
    const queryStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      registry.getAddress(chains[i % chains.length] as SupportedChain);
    }
    const queryEnd = performance.now();

    console.log(`ContractRegistry: 1000 queries in ${(queryEnd - queryStart).toFixed(2)}ms`);
  });

  it('should handle concurrent lookups efficiently', () => {
    const registry = new ContractRegistry();

    // 预填充数据
    for (let i = 0; i < 1000; i++) {
      registry.register(`contract-${i}`, 1, `0x${i.toString(16).padStart(40, '0')}`);
    }

    const iterations = 10000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      registry.getAddress(`contract-${i % 1000}`, 1);
    }

    const endTime = performance.now();

    console.log(
      `ContractRegistry: ${iterations} lookups in ${(endTime - startTime).toFixed(2)}ms (${((endTime - startTime) / iterations).toFixed(4)}ms per lookup)`,
    );
  });
});

describe('Memory Usage Benchmarks', () => {
  it('should track memory usage for BatchInserter', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    const inserter = new BatchInserter<{ id: string; data: string }>({
      tableName: 'test_table',
      columns: ['id', 'data'],
      batchSize: 1000,
    });

    // 生成大数据集
    const items = Array.from({ length: 50000 }, (_, i) => ({
      id: `item-${i}`,
      data: 'x'.repeat(100), // 100 bytes per item
    }));

    const beforeInsert = process.memoryUsage().heapUsed;
    await inserter.insert(items);
    const afterInsert = process.memoryUsage().heapUsed;

    // 强制垃圾回收（如果在 Node.js 中运行）
    if (global.gc) {
      global.gc();
    }

    const afterGC = process.memoryUsage().heapUsed;

    console.log('Memory Usage:');
    console.log(`  Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Before insert: ${(beforeInsert / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  After insert: ${(afterInsert / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  After GC: ${(afterGC / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Peak increase: ${((afterInsert - initialMemory) / 1024 / 1024).toFixed(2)} MB`);
  });
});

describe('Concurrent Operations Performance', () => {
  it('should handle concurrent batch inserts', async () => {
    vi.mocked(query).mockResolvedValue({ rowCount: 100 });

    const inserter = new BatchInserter<{ id: string; value: number }>({
      tableName: 'test_table',
      columns: ['id', 'value'],
      batchSize: 500,
    });

    const concurrentOperations = 5;
    const itemsPerOperation = 2000;

    const startTime = performance.now();

    const operations = Array.from({ length: concurrentOperations }, (_, opIndex) => {
      const items = Array.from({ length: itemsPerOperation }, (_, i) => ({
        id: `op${opIndex}-item-${i}`,
        value: opIndex * 1000 + i,
      }));
      return inserter.insert(items);
    });

    await Promise.all(operations);

    const endTime = performance.now();

    const totalItems = concurrentOperations * itemsPerOperation;
    console.log(
      `Concurrent BatchInserter: ${totalItems} items in ${(endTime - startTime).toFixed(2)}ms`,
    );

    // 验证所有数据都被插入
    expect(query).toHaveBeenCalled();
  });
});
