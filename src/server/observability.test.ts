import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMemoryStore } from './memoryBackend';
import {
  createOrTouchAlert,
  appendAuditLog,
  pruneStaleAlerts,
  updateAlertStatus,
  createIncident,
} from './observability';
import { hasDatabase } from '@/server/db';
import { notifyAlert } from '@/server/notifications';

vi.mock('@/server/db', () => ({
  query: vi.fn(),
  hasDatabase: vi.fn(() => false),
}));

vi.mock('@/server/schema', () => ({
  ensureSchema: vi.fn(),
}));

vi.mock('@/server/notifications', () => ({
  notifyAlert: vi.fn().mockResolvedValue(undefined),
}));

describe('observability (memory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { __insightMemoryStore?: unknown }).__insightMemoryStore = undefined;
    vi.mocked(hasDatabase).mockReturnValue(false);
  });

  it('caps alerts size and keeps Open over Resolved', async () => {
    await createOrTouchAlert({
      fingerprint: 'keep-open',
      type: 'test',
      severity: 'warning',
      title: 'open',
      message: 'open',
    });

    for (let i = 0; i < 2100; i++) {
      await createOrTouchAlert({
        fingerprint: `resolved/${i}`,
        type: 'test',
        severity: 'info',
        title: 'resolved',
        message: 'resolved',
      });
      const mem = getMemoryStore();
      const created = mem.alerts.get(`resolved/${i}`);
      if (created)
        mem.alerts.set(`resolved/${i}`, {
          ...created,
          status: 'Resolved' as const,
        });
    }

    const mem = getMemoryStore();
    expect(mem.alerts.size).toBeLessThanOrEqual(2000);
    expect(mem.alerts.has('keep-open')).toBe(true);
  });

  it('caps audit log size', async () => {
    for (let i = 0; i < 6000; i++) {
      await appendAuditLog({ actor: null, action: 'a', details: { i } });
    }
    const mem = getMemoryStore();
    expect(mem.audit.length).toBeLessThanOrEqual(5000);
  });

  it('triggers notification on new alert', async () => {
    await createOrTouchAlert({
      fingerprint: 'notify-me',
      type: 'test',
      severity: 'critical',
      title: 'Test Alert',
      message: 'Testing notifications',
    });
    expect(notifyAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'notify-me',
        severity: 'critical',
      }),
      undefined,
    );
  });

  it('resolves stale alerts in memory', async () => {
    await createOrTouchAlert({
      fingerprint: 'stale-alert',
      type: 'test',
      severity: 'warning',
      title: 'stale',
      message: 'stale',
    });
    await createOrTouchAlert({
      fingerprint: 'fresh-alert',
      type: 'test',
      severity: 'warning',
      title: 'fresh',
      message: 'fresh',
    });

    const mem = getMemoryStore();
    const stale = mem.alerts.get('stale-alert');
    const fresh = mem.alerts.get('fresh-alert');
    const oldIso = new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString();
    if (stale) {
      mem.alerts.set('stale-alert', {
        ...stale,
        lastSeenAt: oldIso,
        updatedAt: oldIso,
      });
    }
    if (fresh) {
      mem.alerts.set('fresh-alert', {
        ...fresh,
        lastSeenAt: new Date().toISOString(),
      });
    }

    const result = await pruneStaleAlerts();

    const staleAfter = mem.alerts.get('stale-alert');
    const freshAfter = mem.alerts.get('fresh-alert');
    expect(result.resolved).toBe(1);
    expect(staleAfter?.status).toBe('Resolved');
    expect(staleAfter?.resolvedAt).not.toBeNull();
    expect(freshAfter?.status).toBe('Open');
  });

  it('updates alert status and writes audit log', async () => {
    await createOrTouchAlert({
      fingerprint: 'status-alert',
      type: 'test',
      severity: 'warning',
      title: 'status',
      message: 'status',
    });

    const mem = getMemoryStore();
    const created = Array.from(mem.alerts.values()).find((a) => a.fingerprint === 'status-alert');
    expect(created).toBeTruthy();

    const updated = await updateAlertStatus({
      id: created?.id ?? 0,
      status: 'Acknowledged',
      actor: 'tester',
    });

    expect(updated?.status).toBe('Acknowledged');
    expect(updated?.acknowledgedAt).not.toBeNull();
    expect(mem.audit[0]?.action).toBe('alert_status_updated');
    expect(mem.audit[0]?.actor).toBe('tester');
  });

  it('creates incidents and records audit log', async () => {
    const incident = await createIncident({
      title: 'Incident 1',
      severity: 'critical',
      alertIds: [1, 2],
      actor: 'ops',
    });

    expect(incident).not.toBeNull();
    expect(incident?.id).toBe(1);
    expect(incident?.status).toBe('Open');
    expect(incident?.alertIds).toEqual([1, 2]);

    const mem = getMemoryStore();
    expect(mem.audit[0]?.action).toBe('incident_created');
    expect(mem.audit[0]?.actor).toBe('ops');
  });
});
