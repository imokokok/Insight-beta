import { describe, it } from 'vitest';
import { handleApi, cachedJson } from '../apiResponse';

describe('API Response Performance Benchmarks', () => {
  it('benchmark handleApi with successful response', async () => {
    const testFn = async () => {
      return { message: 'success' };
    };

    const request = new Request('http://localhost/api/test');

    for (let i = 0; i < 1000; i++) {
      await handleApi(request, testFn);
    }
  });

  it('benchmark handleApi with error response', async () => {
    const testFn = async () => {
      throw new Error('Test error');
    };

    const request = new Request('http://localhost/api/test');

    for (let i = 0; i < 500; i++) {
      await handleApi(request, testFn);
    }
  });

  it('benchmark cachedJson with cache hits', async () => {
    const compute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { message: 'computed' };
    };

    // Warm up cache
    await cachedJson('benchmark-key', 10000, compute);

    // Benchmark cache hits
    for (let i = 0; i < 2000; i++) {
      await cachedJson('benchmark-key', 10000, compute);
    }
  });

  it('benchmark cachedJson with cache misses', async () => {
    const compute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { message: 'computed' };
    };

    // Benchmark cache misses with unique keys
    for (let i = 0; i < 100; i++) {
      await cachedJson(`benchmark-key-${i}`, 10000, compute);
    }
  });

  it('benchmark concurrent cachedJson calls', async () => {
    const compute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      return { message: 'computed' };
    };

    // Create concurrent promises
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(cachedJson('benchmark-concurrent', 10000, compute));
    }

    await Promise.all(promises);
  });
});
