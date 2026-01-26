import {
  readOracleConfig,
  redactOracleConfig,
  validateOracleConfigPatch,
  writeOracleConfig,
  type OracleConfig,
} from '@/server/oracle';
import {
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { verifyAdmin } from '@/server/adminAuth';

const ALLOWED_FIELDS: Array<keyof OracleConfig> = [
  'rpcUrl',
  'contractAddress',
  'chain',
  'startBlock',
  'maxBlockRange',
  'votingPeriodHours',
  'confirmationBlocks',
];

const RATE_LIMITS = {
  GET: { key: 'oracle_config_get', limit: 240, windowMs: 60_000 },
  PUT: { key: 'oracle_config_put', limit: 30, windowMs: 60_000 },
} as const;

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, RATE_LIMITS.GET);
    if (limited) return limited;

    const instanceId = new URL(request.url).searchParams.get('instanceId');
    const config = instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();
    const admin = await verifyAdmin(request, { strict: false, scope: 'oracle_config_write' });
    return admin.ok ? config : redactOracleConfig(config);
  });
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, RATE_LIMITS.PUT);
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: 'oracle_config_write' });
    if (auth) return auth;

    const instanceId = new URL(request.url).searchParams.get('instanceId');
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw Object.assign(new Error('invalid_body'), { status: 400 });
    }

    const safeBody = Object.fromEntries(
      ALLOWED_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]),
    ) as Partial<OracleConfig>;

    const patch = validateOracleConfigPatch(safeBody);
    const updated = await writeOracleConfig(patch, instanceId ?? undefined);

    await Promise.all([
      appendAuditLog({
        actor: getAdminActor(request),
        action: 'oracle_config_updated',
        entityType: 'oracle',
        entityId: updated.contractAddress || null,
        details: patch,
      }),
      invalidateCachedJson('oracle_api:/api/oracle'),
    ]);

    return updated;
  });
}
