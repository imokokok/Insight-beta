import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn(async () => void 0);
vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
}));

describe("notifications", () => {
  const envBefore: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    sendMailMock.mockClear();
    for (const k of [
      "INSIGHT_WEBHOOK_URL",
      "INSIGHT_WEBHOOK_TIMEOUT_MS",
      "INSIGHT_DEPENDENCY_TIMEOUT_MS",
      "INSIGHT_SMTP_HOST",
      "INSIGHT_SMTP_PORT",
      "INSIGHT_SMTP_USER",
      "INSIGHT_SMTP_PASS",
      "INSIGHT_FROM_EMAIL",
      "INSIGHT_DEFAULT_EMAIL",
    ]) {
      envBefore[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(envBefore)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.useRealTimers();
  });

  it("skips webhook when not configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch")
      .mockResolvedValueOnce({ ok: true } as unknown as Response);

    const { notifyAlert } = await import("./notifications");
    await notifyAlert({
      title: "t",
      message: "m",
      severity: "warning",
      fingerprint: "fp",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("retries webhook on 5xx then succeeds", async () => {
    process.env.INSIGHT_WEBHOOK_URL = "https://webhook.example";
    process.env.INSIGHT_WEBHOOK_TIMEOUT_MS = "1000";

    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const fetchSpy = vi
      .spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "bad",
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => "bad",
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => "ok",
      } as unknown as Response);

    const { notifyAlert } = await import("./notifications");
    const p = notifyAlert(
      {
        title: "t",
        message: "m",
        severity: "critical",
        fingerprint: "fp",
      },
      { channels: ["webhook"] },
    );

    await vi.runAllTimersAsync();
    await p;

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "https://webhook.example",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("skips email when smtp is not configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch")
      .mockResolvedValueOnce({ ok: true } as unknown as Response);

    const { notifyAlert } = await import("./notifications");
    await notifyAlert(
      { title: "t", message: "m", severity: "info", fingerprint: "fp" },
      { channels: ["email"] },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("continues to email when webhook fails", async () => {
    process.env.INSIGHT_WEBHOOK_URL = "https://webhook.example";
    process.env.INSIGHT_WEBHOOK_TIMEOUT_MS = "1000";
    process.env.INSIGHT_SMTP_HOST = "smtp.example";
    process.env.INSIGHT_SMTP_PORT = "587";
    process.env.INSIGHT_SMTP_USER = "user";
    process.env.INSIGHT_SMTP_PASS = "pass";
    process.env.INSIGHT_FROM_EMAIL = "from@example.com";
    process.env.INSIGHT_DEFAULT_EMAIL = "to@example.com";

    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const fetchSpy = vi
      .spyOn(globalThis as unknown as { fetch: typeof fetch }, "fetch")
      .mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "bad",
      } as unknown as Response);

    const { notifyAlert } = await import("./notifications");
    const p = notifyAlert(
      { title: "t", message: "m", severity: "warning", fingerprint: "fp" },
      { channels: ["webhook", "email"] },
    );

    await vi.runAllTimersAsync();
    await p;

    expect(fetchSpy).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalled();
  });
});
