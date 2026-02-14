# Production Checklist (Pre-flight)

Ready to launch? Follow this checklist to ensure your Insight is secure, stable, and monitored.

## 1. Security & Environment

- [ ] **Admin Token**:
  - Set a strong `INSIGHT_ADMIN_TOKEN` (at least 32 random characters)
  - Set `INSIGHT_ADMIN_TOKEN_SALT` for enhanced security
  - Set a secure `JWT_SECRET` for token signing
  - Do not commit these to version control

- [ ] **HTTPS / HSTS**:
  - Ensure your domain handles SSL termination
  - Configure HSTS headers in your load balancer

- [ ] **Database Connection**:
  - Use a connection pooler (PgBouncer, Supabase Transaction Mode) for `DATABASE_URL`
  - Recommended: 10-20 max connections per app instance

## 2. Infrastructure & Data

- [ ] **Database Schema**:
  - Run migrations: `npm run db:migrate:prod`
  - Verify tables are created successfully

- [ ] **Backups**:
  - Enable Point-in-Time Recovery (PITR) on PostgreSQL
  - Set up daily automated backups
  - Test restore procedure

- [ ] **Redis**:
  - Ensure `REDIS_URL` is configured
  - Set up Redis persistence (AOF or RDB)

## 3. RPC Configuration

- [ ] **RPC Providers**:
  - Configure RPC URLs for all supported chains:
    - `ETHEREUM_RPC_URL`
    - `POLYGON_RPC_URL`
    - `ARBITRUM_RPC_URL`
    - `OPTIMISM_RPC_URL`
    - `BASE_RPC_URL`
    - `AVALANCHE_RPC_URL`
    - `BSC_RPC_URL`
    - `SOLANA_RPC_URL`
  - **Critical**: Use paid providers (Alchemy, Infura, QuickNode) for production

- [ ] **Rate Limiting**:
  - Verify RPC rate limits match your expected traffic
  - Set up multiple RPC endpoints for failover

## 4. Monitoring & Alerts

- [ ] **Error Tracking**:
  - Set `SENTRY_DSN` for error tracking
  - Configure alert rules in Sentry

- [ ] **Notification Channels**:
  - Configure `INSIGHT_SLACK_WEBHOOK_URL` for alerts
  - Or set up `INSIGHT_TELEGRAM_BOT_TOKEN` and `INSIGHT_TELEGRAM_CHAT_ID`
  - Test notification delivery

- [ ] **Health Check**:
  - Monitor `/api/health` from external service (UptimeRobot, Pingdom)
  - Set up alerts for health check failures

- [ ] **Logs**:
  - Configure log aggregation (Datadog, CloudWatch, etc.)
  - Set `LOG_LEVEL=info` for production

## 5. Post-Deployment Verification

```bash
# Run production check
npm run check:prod
```

Manual verification:

1. **Health Check**:

   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Database Connectivity**:

   ```bash
   curl https://your-domain.com/api/health?probe=readiness
   ```

3. **Price Data**:

   ```bash
   curl https://your-domain.com/api/oracle/unified?symbol=ETH/USD
   ```

4. **Test Rate Limiting**:
   ```bash
   # Should return 429 after too many requests
   for i in {1..150}; do
     curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/api/health
   done
   ```

## 6. Security Checklist

- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is working
- [ ] Admin endpoints require authentication
- [ ] Sensitive data is not logged
- [ ] Dependencies are up to date (`npm audit`)
