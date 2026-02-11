[中文](./DEPLOYMENT.zh-CN.md)

# Deployment (Production)

## 1) Environment Variables

Minimum required:

- `DATABASE_URL` - Supabase PostgreSQL connection string

Optional but recommended:

- `INSIGHT_ADMIN_TOKEN` - Admin authentication token
- `INSIGHT_ADMIN_TOKEN_SALT` - Admin token salt for enhanced security
- `JWT_SECRET` - JWT signing secret
- `SENTRY_DSN` - Sentry error tracking (server-side)
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking (client-side)
- `LOG_LEVEL` - Log level (debug, info, warn, error)

### Supabase Configuration

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (client-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side)

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

- `INSIGHT_SLACK_WEBHOOK_URL` - Slack webhook for alerts
- `INSIGHT_TELEGRAM_BOT_TOKEN` - Telegram bot token
- `INSIGHT_TELEGRAM_CHAT_ID` - Telegram chat ID
- `PAGERDUTY_API_KEY` - PagerDuty API key

## 2) Vercel Deployment

### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel Dashboard
3. Push to `main` branch for production deployment
4. Push to `develop` branch for preview deployment

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 3) Database Setup

### Supabase Setup

1. Create a new Supabase project
2. Get the database connection string from Supabase Dashboard
3. Run migrations:

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Run migrations
npm run db:migrate:prod

# Seed initial data (optional)
npm run db:seed
```

### Using Supabase Provision Script

```bash
npm run supabase:provision
```

## 4) Post-Deployment Verification

```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Expected response:
# {"status":"ok","timestamp":"...","version":"..."}
```

## 5) Monitoring Endpoints

- `/api/health` - Health check
- `/api/monitoring/metrics` - System metrics
- `/api/monitoring/dashboard` - Dashboard data
- `/api/monitoring/statistics` - Statistics

## 6) Production Checklist

See [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) for detailed deployment checklist.
