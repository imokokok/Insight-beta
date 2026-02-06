import { z } from 'zod';

import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { notifyAlert } from '@/server/notifications';
import { appendAuditLog, readAlertRules, writeAlertRules } from '@/server/observability';

function isValidRunbook(runbook: string) {
  const trimmed = runbook.trim();
  if (!trimmed) return true;
  if (/\s/.test(trimmed)) return false;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(value: string) {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  const atIndex = v.indexOf('@');
  if (atIndex <= 0 || atIndex >= v.length - 1) return false;
  const localPart = v.slice(0, atIndex);
  const domainPart = v.slice(atIndex + 1);
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (domainPart.length === 0 || domainPart.length > 253) return false;
  if (localPart.includes(' ') || domainPart.includes(' ')) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) return false;
  const domainParts = domainPart.split('.');
  if (domainParts.length < 2) return false;
  return domainParts.every(
    (part) => part.length > 0 && part.length <= 63 && /^[a-zA-Z0-9-]+$/.test(part),
  );
}

const ruleSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    enabled: z.boolean(),
    event: z.enum([
      'dispute_created',
      'liveness_expiring',
      'sync_error',
      'stale_sync',
      'execution_delayed',
      'low_participation',
      'high_vote_divergence',
      'high_dispute_rate',
      'slow_api_request',
      'high_error_rate',
      'database_slow_query',
    ]),
    severity: z.enum(['info', 'warning', 'critical']),
    owner: z.string().trim().max(80).optional().nullable(),
    runbook: z.string().trim().max(500).optional().nullable(),
    silencedUntil: z.string().trim().max(40).optional().nullable(),
    params: z.record(z.string(), z.unknown()).optional(),
    channels: z
      .array(z.enum(['webhook', 'email', 'telegram']))
      .min(1)
      .max(3)
      .optional(),
    recipient: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((rule, ctx) => {
    if (rule.runbook && !isValidRunbook(rule.runbook)) {
      ctx.addIssue({
        code: 'custom',
        message: 'invalid_runbook',
        path: ['runbook'],
      });
    }

    if (rule.silencedUntil) {
      const ms = Date.parse(rule.silencedUntil);
      if (!Number.isFinite(ms)) {
        ctx.addIssue({
          code: 'custom',
          message: 'invalid_silencedUntil',
          path: ['silencedUntil'],
        });
      }
    }

    if (rule.channels) {
      const unique = new Set(rule.channels);
      if (unique.size !== rule.channels.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'duplicate_channel',
          path: ['channels'],
        });
      }
    }

    if (rule.channels?.includes('email')) {
      const recipient = (rule.recipient ?? '').trim();
      if (!recipient) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_email_recipient',
          path: ['recipient'],
        });
      } else if (!isValidEmail(recipient)) {
        ctx.addIssue({
          code: 'custom',
          message: 'invalid_email_recipient',
          path: ['recipient'],
        });
      }
    }

    const params = rule.params ?? {};
    const getNumber = (key: string) => Number((params as Record<string, unknown>)[key]);

    if (rule.event === 'stale_sync') {
      if (!('maxAgeMs' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_maxAgeMs',
          path: ['params', 'maxAgeMs'],
        });
      } else {
        const maxAgeMs = getNumber('maxAgeMs');
        if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_maxAgeMs',
            path: ['params', 'maxAgeMs'],
          });
        }
      }
    }

    if (rule.event === 'execution_delayed') {
      if (!('maxDelayMinutes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_maxDelayMinutes',
          path: ['params', 'maxDelayMinutes'],
        });
      } else {
        const maxDelayMinutes = getNumber('maxDelayMinutes');
        if (!Number.isFinite(maxDelayMinutes) || maxDelayMinutes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_maxDelayMinutes',
            path: ['params', 'maxDelayMinutes'],
          });
        }
      }
    }

    if (rule.event === 'low_participation') {
      if (!('withinMinutes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_withinMinutes',
          path: ['params', 'withinMinutes'],
        });
      } else {
        const withinMinutes = getNumber('withinMinutes');
        if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_withinMinutes',
            path: ['params', 'withinMinutes'],
          });
        }
      }

      if (!('minTotalVotes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_minTotalVotes',
          path: ['params', 'minTotalVotes'],
        });
      } else {
        const minTotalVotes = getNumber('minTotalVotes');
        if (!Number.isFinite(minTotalVotes) || minTotalVotes < 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_minTotalVotes',
            path: ['params', 'minTotalVotes'],
          });
        }
      }
    }

    if (rule.event === 'liveness_expiring') {
      if (!('withinMinutes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_withinMinutes',
          path: ['params', 'withinMinutes'],
        });
      } else {
        const withinMinutes = getNumber('withinMinutes');
        if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_withinMinutes',
            path: ['params', 'withinMinutes'],
          });
        }
      }
    }

    if (rule.event === 'high_vote_divergence') {
      if (!('withinMinutes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_withinMinutes',
          path: ['params', 'withinMinutes'],
        });
      } else {
        const withinMinutes = getNumber('withinMinutes');
        if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_withinMinutes',
            path: ['params', 'withinMinutes'],
          });
        }
      }

      if (!('minTotalVotes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_minTotalVotes',
          path: ['params', 'minTotalVotes'],
        });
      } else {
        const minTotalVotes = getNumber('minTotalVotes');
        if (!Number.isFinite(minTotalVotes) || minTotalVotes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_minTotalVotes',
            path: ['params', 'minTotalVotes'],
          });
        }
      }

      if (!('maxMarginPercent' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_maxMarginPercent',
          path: ['params', 'maxMarginPercent'],
        });
      } else {
        const maxMarginPercent = getNumber('maxMarginPercent');
        if (!Number.isFinite(maxMarginPercent) || maxMarginPercent <= 0 || maxMarginPercent > 100) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_maxMarginPercent',
            path: ['params', 'maxMarginPercent'],
          });
        }
      }
    }

    if (rule.event === 'high_dispute_rate') {
      if (!('windowDays' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_windowDays',
          path: ['params', 'windowDays'],
        });
      } else {
        const windowDays = getNumber('windowDays');
        if (!Number.isFinite(windowDays) || windowDays <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_windowDays',
            path: ['params', 'windowDays'],
          });
        }
      }

      if (!('minAssertions' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_minAssertions',
          path: ['params', 'minAssertions'],
        });
      } else {
        const minAssertions = getNumber('minAssertions');
        if (!Number.isFinite(minAssertions) || minAssertions <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_minAssertions',
            path: ['params', 'minAssertions'],
          });
        }
      }

      if (!('thresholdPercent' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_thresholdPercent',
          path: ['params', 'thresholdPercent'],
        });
      } else {
        const thresholdPercent = getNumber('thresholdPercent');
        if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_thresholdPercent',
            path: ['params', 'thresholdPercent'],
          });
        }
      }
    }

    if (rule.event === 'slow_api_request') {
      if (!('thresholdMs' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_thresholdMs',
          path: ['params', 'thresholdMs'],
        });
      } else {
        const thresholdMs = getNumber('thresholdMs');
        if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_thresholdMs',
            path: ['params', 'thresholdMs'],
          });
        }
      }
    }

    if (rule.event === 'database_slow_query') {
      if (!('thresholdMs' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_thresholdMs',
          path: ['params', 'thresholdMs'],
        });
      } else {
        const thresholdMs = getNumber('thresholdMs');
        if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_thresholdMs',
            path: ['params', 'thresholdMs'],
          });
        }
      }
    }

    if (rule.event === 'high_error_rate') {
      if (!('thresholdPercent' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_thresholdPercent',
          path: ['params', 'thresholdPercent'],
        });
      } else {
        const thresholdPercent = getNumber('thresholdPercent');
        if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 100) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_thresholdPercent',
            path: ['params', 'thresholdPercent'],
          });
        }
      }

      if (!('windowMinutes' in params)) {
        ctx.addIssue({
          code: 'custom',
          message: 'missing_windowMinutes',
          path: ['params', 'windowMinutes'],
        });
      } else {
        const windowMinutes = getNumber('windowMinutes');
        if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'invalid_windowMinutes',
            path: ['params', 'windowMinutes'],
          });
        }
      }
    }
  });

const putSchema = z
  .object({
    rules: z.array(ruleSchema).max(50),
  })
  .superRefine((body, ctx) => {
    const seen = new Set<string>();
    for (const [idx, r] of body.rules.entries()) {
      if (seen.has(r.id)) {
        ctx.addIssue({
          code: 'custom',
          message: 'duplicate_rule_id',
          path: ['rules', idx, 'id'],
        });
        continue;
      }
      seen.add(r.id);
    }
  });

const postSchema = z.object({
  ruleId: z.string().trim().min(1).max(100),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'alert_rules_get',
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'alert_rules_write',
    });
    if (auth) return auth;

    const rules = await readAlertRules();
    return { rules };
  });
}

export async function POST(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'alert_rules_test',
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'alert_rules_write',
    });
    if (auth) return auth;

    const parsed = await request.json().catch(() => null);
    const body = postSchema.safeParse(parsed);
    if (!body.success) return error({ code: 'invalid_request_body' }, 400);

    const rules = await readAlertRules();
    const rule = rules.find((r) => r.id === body.data.ruleId);
    if (!rule) return error({ code: 'not_found' }, 404);

    await notifyAlert(
      {
        title: `Test: ${rule.name}`,
        message: `Rule: ${rule.id}\nEvent: ${rule.event}\nSeverity: ${rule.severity}`,
        severity: rule.severity,
        fingerprint: `test:${rule.id}:${Date.now()}`,
      },
      {
        channels: rule.channels,
        recipient: rule.recipient ?? undefined,
      },
    );

    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: 'alert_rule_test_sent',
      entityType: 'alert_rule',
      entityId: rule.id,
      details: {
        channels: rule.channels ?? ['webhook'],
        recipient: rule.recipient ?? null,
      },
    });

    return { sent: true };
  });
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'alert_rules_put',
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'alert_rules_write',
    });
    if (auth) return auth;

    const parsed = await request.json().catch(() => null);
    const body = putSchema.safeParse(parsed);
    if (!body.success) return error({ code: 'invalid_request_body' }, 400);

    await writeAlertRules(body.data.rules);
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: 'alert_rules_updated',
      entityType: 'alerts',
      entityId: null,
      details: { count: body.data.rules.length },
    });
    return { rules: body.data.rules };
  });
}
