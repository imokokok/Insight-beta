# Production Checklist (Pre-flight)

Ready to launch? Follow this checklist to ensure your Insight Oracle node is secure, stable, and monitored.

## 1. Security & Environment

- [ ] **Secure Admin Token**:
  - Generate a random string for `INSIGHT_ADMIN_TOKEN_SALT` (at least 32 chars).
  - Do **not** set `INSIGHT_ADMIN_TOKEN` (root token) in production unless strictly necessary for initial bootstrapping. Instead, use the API to generate scoped tokens.
  - Rotate the Salt periodically if you suspect a leak (this invalidates all tokens).

- [ ] **HTTPS / HSTS**:
  - Ensure your domain handles SSL termination.
  - The middleware is configured to send `Strict-Transport-Security` headers.

- [ ] **Database Connection**:
  - Use a connection pooler (e.g., Supabase Transaction Mode, PgBouncer) for `DATABASE_URL`.
  - The app defaults to `max: 10` connections. Adjust based on your DB tier.

## 2. Infrastructure & Data

- [ ] **Database Schema**:
  - The application **automatically applies** the database schema on startup. No manual migration command is needed.
  - Ensure the database user has `CREATE TABLE` and `CREATE INDEX` permissions.

- [ ] **Backups**:
  - Enable Point-in-Time Recovery (PITR) or daily backups on your database provider.

- [ ] **Worker Configuration**:
  - **Single Instance (Recommended for simple setups)**: Leave `INSIGHT_DISABLE_EMBEDDED_WORKER` unset. The worker runs inside the Next.js process.
  - **Microservices (Scale)**: Set `INSIGHT_DISABLE_EMBEDDED_WORKER=true` on the API nodes, and run a separate worker node (e.g., `npm run worker` or a custom entrypoint).

## 3. Oracle Configuration

- [ ] **RPC Provider**:
  - Use a reliable, paid RPC provider (Alchemy, Infura, etc.) for `INSIGHT_RPC_URL`.
  - **Critical**: Public RPCs often rate-limit or fail, causing the oracle to miss events.

- [ ] **Contract Address**:
  - Verify `INSIGHT_ORACLE_ADDRESS` matches the deployed contract on your target chain (`INSIGHT_CHAIN`).

## 4. Monitoring & Alerts

- [ ] **Webhooks**:
  - Set `INSIGHT_WEBHOOK_URL` to a Slack/Discord webhook to receive real-time alerts (Sync Error, Price Deviation, etc.).

- [ ] **Logs**:
  - Logs are JSON-formatted in production. Integrate with Datadog/CloudWatch/Logtail.
  - Tune `INSIGHT_API_LOG_SAMPLE_RATE` (default 0.01) if you need more/less traffic visibility.

- [ ] **Health Check**:
  - Monitor `/api/health` from an external uptime service (Pingdom, UptimeRobot).

## 5. Post-Deployment Verification

1. **Check Sync Status**:
   Call `GET /api/oracle/stats` and verify `lastProcessedBlock` is increasing.
2. **Verify Alerts**:
   Manually trigger a test alert (or wait for a system event) to verify Webhook delivery.
3. **Test Rate Limits**:
   Spam an endpoint (e.g., `/api/oracle/risks`) and verify you get `429 Too Many Requests`.
