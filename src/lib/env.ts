export const env = {
  SUPABASE_URL: (process.env.SUPABASE_URL ?? "").trim(),
  SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
  INSIGHT_ADMIN_TOKEN: (process.env.INSIGHT_ADMIN_TOKEN ?? "").trim(),
  INSIGHT_RPC_URL: (process.env.INSIGHT_RPC_URL ?? "").trim(),
  INSIGHT_ORACLE_ADDRESS: (process.env.INSIGHT_ORACLE_ADDRESS ?? "").trim(),
  INSIGHT_CHAIN: (process.env.INSIGHT_CHAIN ?? "").trim(),
};

export function getEnv(key: keyof typeof env): string {
  return env[key];
}

export function isEnvSet(key: keyof typeof env): boolean {
  return !!env[key];
}
