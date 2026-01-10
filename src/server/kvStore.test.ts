import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readJsonFile, writeJsonFile, deleteJsonKey, listJsonKeys } from './kvStore';
import { query, hasDatabase } from './db';
import { getMemoryStore } from './memoryBackend';

vi.mock('./db', () => ({
  query: vi.fn(),
  hasDatabase: vi.fn(() => true),
}));

describe('kvStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { __insightMemoryStore?: unknown }).__insightMemoryStore = undefined;
    vi.mocked(hasDatabase).mockReturnValue(true);
  });

  describe('readJsonFile', () => {
    it('returns stored value if key exists', async () => {
      const mockValue = { foo: 'bar' };
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({
        rows: [{ value: mockValue }],
        rowCount: 1,
      });

      const result = await readJsonFile('test-key', null);
      expect(result).toEqual(mockValue);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT value FROM kv_store'), ['test-key']);
    });

    it('returns default value if key does not exist', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await readJsonFile('missing-key', 'default');
      expect(result).toBe('default');
    });
  });

  describe('writeJsonFile', () => {
    it('writes value to db', async () => {
      const mockValue = { foo: 'bar' };
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rowCount: 1 });

      await writeJsonFile('test-key', mockValue);
      
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO kv_store'),
        ['test-key', JSON.stringify(mockValue)]
      );
    });

    it('evicts old keys in memory mode', async () => {
      vi.mocked(hasDatabase).mockReturnValue(false);
      for (let i = 0; i < 2100; i++) {
        await writeJsonFile(`k/${i}`, { i });
      }
      const mem = getMemoryStore();
      expect(mem.kv.size).toBeLessThanOrEqual(2000);
    });
  });

  describe('deleteJsonKey', () => {
    it('deletes key from db', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({ rowCount: 1 });

      await deleteJsonKey('test-key');
      
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM kv_store'),
        ['test-key']
      );
    });
  });

  describe('listJsonKeys', () => {
    it('lists keys with pagination', async () => {
      const mockRows = [
        { key: 'key1', value: { v: 1 }, updated_at: new Date() },
        { key: 'key2', value: { v: 2 }, updated_at: new Date() },
      ];
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      });

      const result = await listJsonKeys({ limit: 10, offset: 5 });
      
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 5]
      );
    });

    it('filters by prefix', async () => {
      const queryMock = vi.mocked(query) as unknown as { mockResolvedValueOnce: (value: unknown) => void };
      queryMock.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await listJsonKeys({ prefix: 'test' });
      
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('key LIKE $1'),
        ['test%']
      );
    });
  });
});
