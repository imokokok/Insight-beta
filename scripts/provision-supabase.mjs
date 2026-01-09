import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";

const { Client } = pg;

function requiredEnv(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

async function main() {
  const dbUrl = (process.env.SUPABASE_DB_URL ?? "").trim() || requiredEnv("DATABASE_URL");
  const force = (process.env.FORCE ?? "").trim() === "1";
  const deleteLocal = (process.env.DELETE_LOCAL ?? "").trim() === "1";

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    await client.query(`
      create table if not exists public.insight_kv (
        key text primary key,
        value jsonb not null
      );
    `);

    const dataDir = path.join(process.cwd(), ".data");
    const files = ["oracle-config.json", "oracle-state.json"];
    for (const fileName of files) {
      const filePath = path.join(dataDir, fileName);
      let raw;
      try {
        raw = await fs.readFile(filePath, "utf8");
      } catch {
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      if (!force) {
        const exists = await client.query("select 1 from public.insight_kv where key = $1 limit 1", [fileName]);
        if (exists.rowCount > 0) {
          continue;
        }
      }

      await client.query(
        `
          insert into public.insight_kv (key, value)
          values ($1, $2::jsonb)
          on conflict (key) do update set value = excluded.value
        `,
        [fileName, JSON.stringify(parsed)]
      );

      if (deleteLocal) {
        try {
          await fs.unlink(filePath);
        } catch {
          continue;
        }
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
