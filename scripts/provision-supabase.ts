import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const { Client } = pg;

interface ProvisionConfig {
  dbUrl: string;
  force: boolean;
  deleteLocal: boolean;
}

interface InsightKvRow {
  key: string;
  value: Record<string, unknown>;
}

function requiredEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

function getConfig(): ProvisionConfig {
  const dbUrl = (process.env.SUPABASE_DB_URL ?? '').trim() || requiredEnv('DATABASE_URL');
  const force = (process.env.FORCE ?? '').trim() === '1';
  const deleteLocal = (process.env.DELETE_LOCAL ?? '').trim() === '1';

  return { dbUrl, force, deleteLocal };
}

async function createTables(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.insight_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);
}

async function migrateDataFile(
  client: pg.Client,
  fileName: string,
  config: ProvisionConfig,
): Promise<boolean> {
  const dataDir = path.join(process.cwd(), '.data');
  const filePath = path.join(dataDir, fileName);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return false;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return false;
  }

  if (!config.force) {
    const exists = await client.query<InsightKvRow>(
      'SELECT 1 FROM public.insight_kv WHERE key = $1 LIMIT 1',
      [fileName],
    );
    if (exists.rowCount && exists.rowCount > 0) {
      return false;
    }
  }

  await client.query(
    `
      INSERT INTO public.insight_kv (key, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = excluded.value
    `,
    [fileName, JSON.stringify(parsed)],
  );

  if (config.deleteLocal) {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore deletion errors
    }
  }

  return true;
}

async function main(): Promise<void> {
  const config = getConfig();

  const client = new pg.Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await createTables(client);

    const files = ['oracle-config.json', 'oracle-state.json'];
    for (const fileName of files) {
      await migrateDataFile(client, fileName, config);
    }
  } finally {
    await client.end();
  }
}

main().catch((e: unknown) => {
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
