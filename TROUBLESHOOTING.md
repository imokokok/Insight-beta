# Troubleshooting Guide

This guide helps you resolve common issues when running OracleMonitor in production.

## 1. Startup Failures

### "Cannot find module" or build errors

- Ensure all dependencies are installed: `npm install`
- Rebuild the application: `npm run build`

### Database connection errors

- Verify `DATABASE_URL` is correctly set
- Check PostgreSQL is running and accessible
- Ensure database user has proper permissions

## 2. Price Sync Issues

### Prices not updating

- Check RPC provider status and rate limits
- Verify `ETHEREUM_RPC_URL` or other chain RPC URLs are set
- Check Vercel logs: `vercel logs --json` or view in Vercel Dashboard

### RPC rate limiting

- Use paid RPC providers (Alchemy, Infura, QuickNode)
- Configure multiple RPC endpoints for failover
- Monitor RPC usage and upgrade plan if needed

## 3. Performance Issues

### High response times

- Check database query performance
- Monitor memory and CPU usage

### Database connection errors

- Use connection pooler (PgBouncer)
- Increase `max_connections` in PostgreSQL
- Check for connection leaks

## 4. Alert Issues

### Alerts not sending

- Verify `INSIGHT_SLACK_WEBHOOK_URL` or Telegram settings
- Check alert rules are configured correctly
- Review alert logs in application logs

## 5. Verification

Run the production check script:

```bash
npm run check:prod
```

This will verify:

- Database connectivity
- RPC endpoints
- Health check endpoints

## 6. Common Error Codes

| Error                        | Cause                        | Solution                     |
| ---------------------------- | ---------------------------- | ---------------------------- |
| `database_connection_failed` | Cannot connect to PostgreSQL | Check DATABASE_URL           |
| `rpc_unavailable`            | RPC endpoint not responding  | Check RPC URLs               |
| `rate_limited`               | Too many requests            | Wait or increase rate limits |
| `unauthorized`               | Invalid or missing token     | Check INSIGHT_ADMIN_TOKEN    |

## 7. Getting Help

1. Check Vercel logs in Dashboard or CLI: `vercel logs --json`
2. Review error tracking in Sentry (if configured)
3. Check health endpoint: `/api/health?probe=validation`
4. Review documentation in `/docs`
