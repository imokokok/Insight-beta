import { bench, describe } from 'vitest';
import { query } from '@/server/db';
import { listAssertions } from '@/server/oracle';
import { listAlerts } from '@/server/observability';

/**
 * 性能基准测试套件
 * 用于监控关键操作的性能表现
 */

describe('Database Query Performance', () => {
  bench(
    'simple select query',
    async () => {
      await query('SELECT 1 as test');
    },
    {
      iterations: 100,
      time: 1000,
    },
  );

  bench(
    'assertions count query',
    async () => {
      await query('SELECT COUNT(*) FROM assertions');
    },
    {
      iterations: 50,
      time: 2000,
    },
  );

  bench(
    'alerts count query',
    async () => {
      await query('SELECT COUNT(*) FROM alerts WHERE status = $1', ['Open']);
    },
    {
      iterations: 50,
      time: 2000,
    },
  );
});

describe('Oracle Service Performance', () => {
  bench(
    'list assertions with pagination',
    async () => {
      await listAssertions({
        limit: 30,
        cursor: 0,
      });
    },
    {
      iterations: 20,
      time: 5000,
    },
  );

  bench(
    'list assertions with filters',
    async () => {
      await listAssertions({
        status: 'Pending',
        limit: 30,
        cursor: 0,
      });
    },
    {
      iterations: 20,
      time: 5000,
    },
  );
});

describe('Alert Service Performance', () => {
  bench(
    'list alerts with pagination',
    async () => {
      await listAlerts({
        status: 'All',
        severity: 'All',
        type: 'All',
        limit: 30,
        cursor: 0,
      });
    },
    {
      iterations: 20,
      time: 5000,
    },
  );

  bench(
    'list alerts with filters',
    async () => {
      await listAlerts({
        status: 'Open',
        severity: 'critical',
        type: 'All',
        limit: 30,
        cursor: 0,
      });
    },
    {
      iterations: 20,
      time: 5000,
    },
  );
});

describe('Memory Usage', () => {
  bench(
    'memory allocation test',
    async () => {
      const arr = new Array(10000).fill(0).map((_, i) => ({
        id: i,
        data: 'x'.repeat(100),
      }));
      // Use the array to prevent optimization
      if (arr.length !== 10000) {
        throw new Error('Array size mismatch');
      }
    },
    {
      iterations: 100,
      time: 1000,
    },
  );
});
