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

### Environment variables errors

- Ensure all required environment variables are set
- Check `.env.local` file exists and contains correct values
- Verify no trailing spaces or quotes issues in `.env` files

## 2. Price Sync Issues

### Prices not updating

- Check RPC provider status and rate limits
- Verify `ETHEREUM_RPC_URL` or other chain RPC URLs are set
- Check Vercel logs: `vercel logs --json` or view in Vercel Dashboard

### RPC rate limiting

- Use paid RPC providers (Alchemy, Infura, QuickNode)
- Configure multiple RPC endpoints for failover
- Monitor RPC usage and upgrade plan if needed

### Price deviation alerts triggered frequently

- Review alert threshold configuration
- Check if market is experiencing high volatility
- Verify data sources are functioning correctly

## 3. Performance Issues

### High response times

- Check database query performance
- Monitor memory and CPU usage
- Review slow query logs in PostgreSQL

### Database connection errors

- Use connection pooler (PgBouncer, Supabase Transaction Mode)
- Increase `max_connections` in PostgreSQL
- Check for connection leaks

### Memory issues in serverless

- Monitor memory usage in Vercel Dashboard
- Optimize large data fetches with pagination
- Implement data caching strategies

## 4. Alert Issues

### Alerts not sending

- Verify `INSIGHT_SLACK_WEBHOOK_URL` or Telegram settings
- Check alert rules are configured correctly
- Review alert logs in application logs

### Webhook delivery failures

- Verify webhook URL is accessible
- Check webhook payload size limits
- Review webhook delivery logs

## 5. Web3 / Wallet Issues

### Wallet connection failed

- Ensure wallet is installed and unlocked
- Check browser compatibility
- Verify RPC URL is accessible from wallet network

### Chain switching not working

- Ensure chain is supported by the application
- Check if wallet supports the chain
- Verify RPC URL is configured for the chain

### Transaction failed

- Check gas price and ensure sufficient balance
- Verify contract addresses are correct
- Review transaction nonce issues

## 6. API Issues

### 401 Unauthorized errors

- Verify admin token is correctly set
- Check `INSIGHT_ADMIN_TOKEN` environment variable
- Ensure token hasn't expired

### 429 Rate limit errors

- Implement exponential backoff
- Check rate limiting configuration
- Consider upgrading to higher rate limit plan

### 500 Internal Server errors

- Check application logs for details
- Review database query errors
- Verify external service dependencies

## 7. Internationalization Issues

### Translation not loading

- Check translation files exist in `src/i18n/locales/`
- Verify locale code is supported
- Check for JSON syntax errors in translation files

### Missing translations

- Add missing keys to translation files
- Run validation: `npm run i18n:validate`

## 8. Build and Deployment Issues

### Build failed

- Check for TypeScript errors: `npm run typecheck`
- Run lint: `npm run lint`
- Verify all imports are correct

### Deployment failed on Vercel

- Check build logs in Vercel Dashboard
- Verify environment variables are set in Vercel
- Ensure compatible Node.js version

## 9. Verification

Run the production check script:

```bash
npm run check:prod
```

This will verify:

- Database connectivity
- RPC endpoints
- Health check endpoints

## 10. Common Error Codes

| Error                        | Cause                        | Solution                     |
| ---------------------------- | ---------------------------- | ---------------------------- |
| `database_connection_failed` | Cannot connect to PostgreSQL | Check DATABASE_URL           |
| `rpc_unavailable`            | RPC endpoint not responding  | Check RPC URLs               |
| `rate_limited`               | Too many requests            | Wait or increase rate limits |
| `unauthorized`               | Invalid or missing token     | Check INSIGHT_ADMIN_TOKEN    |
| `module_not_found`           | Missing dependency           | Run npm install              |
| `validation_error`           | Invalid request parameters   | Check API request format     |

## 11. Getting Help

1. Check Vercel logs in Dashboard or CLI: `vercel logs --json`
2. Review error tracking in Sentry (if configured)
3. Check health endpoint: `/api/health?probe=validation`
4. Review documentation in `/docs`
5. Search existing GitHub issues
