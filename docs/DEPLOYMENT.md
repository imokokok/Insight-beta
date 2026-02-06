[中文](./DEPLOYMENT.zh-CN.md)

# Deployment (Production)

## 1) Environment Variables

Minimum required:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

Optional but recommended:

- `ADMIN_TOKEN` - Admin authentication token
- `JWT_SECRET` - JWT signing secret
- `SENTRY_DSN` - Sentry error tracking
- `LOG_LEVEL` - Log level (debug, info, warn, error)

### RPC Configuration

- `ETHEREUM_RPC_URL` - Ethereum mainnet RPC
- `POLYGON_RPC_URL` - Polygon mainnet RPC
- `ARBITRUM_RPC_URL` - Arbitrum mainnet RPC
- `OPTIMISM_RPC_URL` - Optimism mainnet RPC
- `BASE_RPC_URL` - Base mainnet RPC
- `AVALANCHE_RPC_URL` - Avalanche mainnet RPC
- `BSC_RPC_URL` - BSC mainnet RPC
- `SOLANA_RPC_URL` - Solana mainnet RPC

Or use provider API keys:

- `ALCHEMY_API_KEY` - Alchemy API key
- `INFURA_API_KEY` - Infura API key

### Notification Channels

- `SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `TELEGRAM_CHAT_ID` - Telegram chat ID
- `PAGERDUTY_API_KEY` - PagerDuty API key

## 2) Docker Deployment

Build image:

```bash
docker build -t oracle-monitor:latest .
```

Start (example):

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://...' \
  -e REDIS_URL='redis://...' \
  -e ADMIN_TOKEN='your-admin-token' \
  oracle-monitor:latest
```

Health check:

- `GET /api/health` - Basic health check
- `GET /api/health?probe=readiness` - Readiness probe
- `GET /api/health?probe=liveness` - Liveness probe

## 3) Database Setup

```bash
# Run migrations
npm run db:migrate:prod

# Seed initial data (optional)
npm run db:seed
```

## 4) Post-Deployment Verification

```bash
# Run production check
npm run check:prod
```

This will verify:

- Database connectivity
- Redis connectivity
- RPC endpoints
- Health check endpoints
