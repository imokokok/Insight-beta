/**
 * BatchInserter 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchInserter } from './BatchInserter';

// Mock query function
vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/lib/database/db';

describe('BatchInserter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert single batch correctly', async () => {
    const inserter = new BatchInserter<{ id: string; name: string }>({
      tableName: 'test_table',
      columns: ['id', 'name'],
      batchSize: 10,
    });

    (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 2 });

    const items = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];

    const result = await inserter.insert(items);

    expect(result).toBe(2);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO test_table'),
      expect.arrayContaining(['1', 'Alice', '2', 'Bob']),
    );
  });

  it('should split large batches', async () => {
    const inserter = new BatchInserter<{ id: string }>({
      tableName: 'test_table',
      columns: ['id'],
      batchSize: 2,
    });

    (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 2 });

    const items = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

    await inserter.insert(items);

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('should handle empty array', async () => {
    const inserter = new BatchInserter<{ id: string }>({
      tableName: 'test_table',
      columns: ['id'],
      batchSize: 100,
    });

    const result = await inserter.insert([]);

    expect(result).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it('should build correct SQL with onConflict', async () => {
    const inserter = new BatchInserter<{ id: string; value: number }>({
      tableName: 'test_table',
      columns: ['id', 'value'],
      batchSize: 100,
      onConflict: 'ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value',
    });

    (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 1 });

    await inserter.insert([{ id: '1', value: 100 }]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value'),
      expect.any(Array),
    );
  });

  it('should generate correct placeholders', async () => {
    const inserter = new BatchInserter<{ a: string; b: string }>({
      tableName: 'test',
      columns: ['a', 'b'],
      batchSize: 10,
    });

    (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 3 });

    await inserter.insert([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
      { a: '5', b: '6' },
    ]);

    const callArgs = (query as ReturnType<typeof vi.fn>).mock.calls[0];
    const sql = (callArgs?.[0] ?? '') as string;

    // Should have placeholders ($1,$2),($3,$4),($5,$6)
    expect(sql).toContain('($1,$2)');
    expect(sql).toContain('($3,$4)');
    expect(sql).toContain('($5,$6)');
  });
});
