import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMemoryStore } from "./memoryBackend";
import {
  createOrTouchAlert,
  appendAuditLog,
  pruneStaleAlerts,
} from "./observability";
import { hasDatabase } from "@/server/db";
import { notifyAlert } from "@/server/notifications";

vi.mock("@/server/db", () => ({
  query: vi.fn(),
  hasDatabase: vi.fn(() => false),
}));

vi.mock("@/server/schema", () => ({
  ensureSchema: vi.fn(),
}));

vi.mock("@/server/notifications", () => ({
  notifyAlert: vi.fn().mockResolvedValue(undefined),
}));

describe("observability (memory)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      globalThis as unknown as { __insightMemoryStore?: unknown }
    ).__insightMemoryStore = undefined;
    vi.mocked(hasDatabase).mockReturnValue(false);
  });

  it("caps alerts size and keeps Open over Resolved", async () => {
    await createOrTouchAlert({
      fingerprint: "keep-open",
      type: "test",
      severity: "warning",
      title: "open",
      message: "open",
    });

    for (let i = 0; i < 2100; i++) {
      await createOrTouchAlert({
        fingerprint: `resolved/${i}`,
        type: "test",
        severity: "info",
        title: "resolved",
        message: "resolved",
      });
      const mem = getMemoryStore();
      const created = mem.alerts.get(`resolved/${i}`);
      if (created)
        mem.alerts.set(`resolved/${i}`, {
          ...created,
          status: "Resolved" as const,
        });
    }

    const mem = getMemoryStore();
    expect(mem.alerts.size).toBeLessThanOrEqual(2000);
    expect(mem.alerts.has("keep-open")).toBe(true);
  });

  it("caps audit log size", async () => {
    for (let i = 0; i < 6000; i++) {
      await appendAuditLog({ actor: null, action: "a", details: { i } });
    }
    const mem = getMemoryStore();
    expect(mem.audit.length).toBeLessThanOrEqual(5000);
  });

  it("triggers notification on new alert", async () => {
    await createOrTouchAlert({
      fingerprint: "notify-me",
      type: "test",
      severity: "critical",
      title: "Test Alert",
      message: "Testing notifications",
    });
    expect(notifyAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: "notify-me",
        severity: "critical",
      }),
      undefined,
    );
  });

  it("resolves stale alerts in memory", async () => {
    await createOrTouchAlert({
      fingerprint: "stale-alert",
      type: "test",
      severity: "warning",
      title: "stale",
      message: "stale",
    });
    await createOrTouchAlert({
      fingerprint: "fresh-alert",
      type: "test",
      severity: "warning",
      title: "fresh",
      message: "fresh",
    });

    const mem = getMemoryStore();
    const stale = mem.alerts.get("stale-alert");
    const fresh = mem.alerts.get("fresh-alert");
    const oldIso = new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString();
    if (stale) {
      mem.alerts.set("stale-alert", {
        ...stale,
        lastSeenAt: oldIso,
        updatedAt: oldIso,
      });
    }
    if (fresh) {
      mem.alerts.set("fresh-alert", {
        ...fresh,
        lastSeenAt: new Date().toISOString(),
      });
    }

    const result = await pruneStaleAlerts();

    const staleAfter = mem.alerts.get("stale-alert");
    const freshAfter = mem.alerts.get("fresh-alert");
    expect(result.resolved).toBe(1);
    expect(staleAfter?.status).toBe("Resolved");
    expect(staleAfter?.resolvedAt).not.toBeNull();
    expect(freshAfter?.status).toBe("Open");
  });
});
