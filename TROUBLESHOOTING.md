# Troubleshooting Guide

This guide helps you resolve common issues when running Insight Oracle in production.

## 1. Startup Failures

### "Invalid environment variables"

The application validates environment variables on startup.

- **INSIGHT_ADMIN_TOKEN_SALT**: Must be at least 16 characters.
- **INSIGHT_RPC_URL**: Must be a valid URL (http/https/ws/wss).
- **INSIGHT_ORACLE_ADDRESS**: Must be a valid 0x Ethereum address.

### "missing_database_url"

While the app can run in memory-only mode for development, some features (like Admin API or persistent indexing) might require a database.

- Ensure `DATABASE_URL` is set in `.env.production`.
- If using Supabase, ensure you are using the Transaction Pooler URL (port 6543) instead of the Session URL (port 5432) for better stability in serverless environments.

## 2. Sync Issues

### Oracle not syncing (Last processed block is 0)

- Check your **RPC Provider**: Public RPCs often rate-limit requests. Use a paid provider (Alchemy, Infura, QuickNode).
- Check **Chain ID**: Ensure `INSIGHT_CHAIN` matches the network of your `INSIGHT_RPC_URL`.
- Check Logs:
  ```bash
  # View logs (if using PM2 or Docker)
  docker logs insight-oracle | grep "error"
  ```
- Look for `eth_getLogs` errors or timeouts.

### "Worker lock client unhealthy"

This means the background worker lost connection to the database.

- This usually self-heals.
- If persistent, restart the worker process.

## 3. Performance & Scaling

### "Too Many Requests" (429)

The API has built-in rate limiting.

- Default limit is usually generous (e.g., 100-1000 req/min).
- If you are hitting this from your own frontend, consider increasing the limit in `src/server/apiResponse/rateLimit.ts` or whitelisting your IP.

### Database Connection Exhaustion

- **Symptom**: `remaining connection slots are reserved for non-replication superuser connections`
- **Fix**: Use a connection pooler (PgBouncer/Supabase Transaction Mode). Do not connect directly to Postgres from Next.js Serverless functions without a pooler.

## 4. Verification

Use the included script to verify system health:

```bash
npm run check:prod
```

If the output shows `Syncing` or `Synced`, the core logic is working.
