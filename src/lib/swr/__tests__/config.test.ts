/**
 * SWR Configuration Tests
 *
 * SWR 配置单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  realTimeSWRConfig,
  configSWRConfig,
  userSWRConfig,
  listSWRConfig,
  onceSWRConfig,
  optimisticSWRConfig,
  dedupeRequest,
  swrCacheKeys,
} from '../config';

describe('SWR Configurations', () => {
  describe('realTimeSWRConfig', () => {
    it('should have correct refresh interval', () => {
      expect(realTimeSWRConfig.refreshInterval).toBe(5000);
    });

    it('should have deduping interval', () => {
      expect(realTimeSWRConfig.dedupingInterval).toBe(2000);
    });

    it('should not revalidate on focus', () => {
      expect(realTimeSWRConfig.revalidateOnFocus).toBe(false);
    });

    it('should keep previous data', () => {
      expect(realTimeSWRConfig.keepPreviousData).toBe(true);
    });
  });

  describe('configSWRConfig', () => {
    it('should not auto refresh', () => {
      expect(configSWRConfig.refreshInterval).toBe(0);
    });

    it('should have long deduping interval', () => {
      expect(configSWRConfig.dedupingInterval).toBe(60000);
    });
  });

  describe('userSWRConfig', () => {
    it('should revalidate on focus', () => {
      expect(userSWRConfig.revalidateOnFocus).toBe(true);
    });

    it('should have focus throttle', () => {
      expect(userSWRConfig.focusThrottleInterval).toBe(10000);
    });
  });

  describe('listSWRConfig', () => {
    it('should not auto refresh', () => {
      expect(listSWRConfig.refreshInterval).toBe(0);
    });

    it('should keep previous data for scroll position', () => {
      expect(listSWRConfig.keepPreviousData).toBe(true);
    });
  });

  describe('onceSWRConfig', () => {
    it('should have high retry count', () => {
      expect(onceSWRConfig.errorRetryCount).toBe(5);
    });

    it('should not revalidate', () => {
      expect(onceSWRConfig.revalidateOnFocus).toBe(false);
      expect(onceSWRConfig.revalidateOnReconnect).toBe(false);
      expect(onceSWRConfig.revalidateIfStale).toBe(false);
    });
  });

  describe('optimisticSWRConfig', () => {
    it('should have short error retry interval', () => {
      expect(optimisticSWRConfig.errorRetryInterval).toBe(500);
    });
  });
});

describe('dedupeRequest', () => {
  it('should dedupe concurrent requests', async () => {
    let callCount = 0;
    const requestFn = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'result';
    };

    const promise1 = dedupeRequest('test-key', requestFn);
    const promise2 = dedupeRequest('test-key', requestFn);
    const promise3 = dedupeRequest('test-key', requestFn);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');
    expect(callCount).toBe(1);
  });

  it('should allow new requests after TTL', async () => {
    let callCount = 0;
    const requestFn = async () => {
      callCount++;
      return 'result';
    };

    await dedupeRequest('ttl-key', requestFn, 50);
    await new Promise((resolve) => setTimeout(resolve, 60));
    await dedupeRequest('ttl-key', requestFn, 50);

    expect(callCount).toBe(2);
  });

  it('should handle different keys independently', async () => {
    let callCount = 0;
    const requestFn = async () => {
      callCount++;
      return 'result';
    };

    await dedupeRequest('key-1', requestFn);
    await dedupeRequest('key-2', requestFn);

    expect(callCount).toBe(2);
  });
});

describe('swrCacheKeys', () => {
  describe('oracle', () => {
    it('should generate stats key', () => {
      expect(swrCacheKeys.oracle.stats()).toBe('oracle:stats');
      expect(swrCacheKeys.oracle.stats('instance-1')).toBe('oracle:stats:instance-1');
    });

    it('should generate assertions key', () => {
      const key = swrCacheKeys.oracle.assertions({ status: 'open', chain: 'ethereum' });
      expect(key).toBe('oracle:assertions:{"status":"open","chain":"ethereum"}');
    });
  });

  describe('price', () => {
    it('should generate current price key', () => {
      expect(swrCacheKeys.price.current('ETH/USD')).toBe('price:current:ETH/USD:all');
      expect(swrCacheKeys.price.current('ETH/USD', 'ethereum')).toBe(
        'price:current:ETH/USD:ethereum',
      );
    });

    it('should generate history key', () => {
      expect(swrCacheKeys.price.history('ETH/USD', '1h')).toBe('price:history:ETH/USD:1h');
    });
  });

  describe('user', () => {
    it('should generate profile key', () => {
      expect(swrCacheKeys.user.profile('0x123')).toBe('user:profile:0x123');
    });

    it('should generate stats key', () => {
      expect(swrCacheKeys.user.stats('0x123')).toBe('user:stats:0x123');
    });
  });
});
