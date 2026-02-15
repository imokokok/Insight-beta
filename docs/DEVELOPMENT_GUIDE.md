# Development Guide

## 1. Environment Setup

```bash
git clone https://github.com/your-org/insight-beta.git
cd insight-beta
npm install
cp .env.example .env.local
npm run dev
```

Visit http://localhost:3000

## 2. Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── oracle/            # Oracle pages
│   ├── alerts/            # Alerts pages
│   ├── disputes/          # Disputes pages
│   ├── monitoring/        # Monitoring pages
│   ├── security/          # Security pages
│   └── ...
├── components/
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── common/            # Common components
│   └── features/          # Feature components
│       ├── alert/         # Alert components
│       ├── assertion/     # Assertion components
│       ├── charts/        # Chart components
│       ├── dashboard/     # Dashboard components
│       ├── dispute/       # Dispute components
│       ├── monitoring/    # Monitoring components
│       ├── onboarding/    # Onboarding components
│       ├── oracle/        # Oracle components
│       └── protocol/      # Protocol components
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
├── i18n/                  # Internationalization
├── lib/                   # Utilities and types
│   ├── shared/            # Shared modules
│   ├── blockchain/        # Blockchain utilities
│   └── types/             # Type definitions
├── server/                # Backend logic
│   ├── alerts/            # Alert services
│   ├── oracle/            # Oracle services
│   ├── oracleIndexer/     # Indexer services
│   ├── auth/              # Authentication
│   └── ...
└── types/                 # Global types
```

## 3. Development Standards

### TypeScript

- Enable strict mode
- Avoid `any`, use `unknown` instead
- Prefer type inference, explicit types for public APIs
- All functions and components must have type definitions

### Naming Conventions

| Type             | Convention           | Example                |
| ---------------- | -------------------- | ---------------------- |
| Components       | PascalCase           | `AssertionList`        |
| Functions        | camelCase            | `useOracleTransaction` |
| Files            | kebab-case           | `oracle-config.ts`     |
| Constants        | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`      |
| Interfaces/Types | PascalCase           | `UserRepository`       |

### React / Next.js

- Server components by default
- Client components use `"use client"` directive
- Component files use PascalCase naming

## 4. Commands

| Command                   | Description                |
| ------------------------- | -------------------------- |
| `npm run dev`             | Start development server   |
| `npm run build`           | Build production version   |
| `npm run start`           | Start production server    |
| `npm run lint`            | Run ESLint                 |
| `npm run typecheck`       | Run TypeScript type check  |
| `npm run format:check`    | Check code formatting      |
| `npm run format:write`    | Format code                |
| `npm run test`            | Run tests                  |
| `npm run test:coverage`   | Run tests with coverage    |
| `npm run test:e2e`        | Run E2E tests              |
| `npm run supabase:push`   | Push database changes      |
| `npm run supabase:studio` | Open Supabase Studio       |
| `npm run docs:api`        | Generate API documentation |
| `npm run i18n:validate`   | Validate translations      |

## 5. Testing

```bash
npm test                    # All tests
npm test src/app/api/       # API tests
npm test src/components/    # Component tests
npm test src/server/        # Server tests
npm run test:coverage       # Test coverage
npm run test:e2e           # E2E tests with Playwright
```

## 6. Database & Cache

### Local Development Database

**Option 1: Using Supabase (Recommended)**

1. Create a free Supabase project at https://supabase.com
2. Get the database connection string from Project Settings > Database
3. Set `DATABASE_URL` in your `.env.local`

**Option 2: Local PostgreSQL**

If you prefer local development without Supabase:

```bash
# Using Homebrew (macOS)
brew install postgresql@16
brew services start postgresql@16

# Or use any PostgreSQL 16+ instance
```

### Cache

The application uses a multi-level caching strategy:

- **SWR**: Client-side data fetching and caching
- **Memory**: Server-side rate limiting storage
- **PostgreSQL**: Persistent cache via Supabase

### Database Tables

- `price_history_raw` - Raw price data from all protocols
- `price_history_min1/5/hour1/day1` - Aggregated price data (OHLCV)
- `solana_price_feeds` - Solana price feed metadata
- `solana_price_history` - Solana price history
- `assertions` - Assertion information
- `disputes` - Dispute information
- `rate_limits` - API rate limiting
- `kv_store` - Configuration and state storage

### Rate Limiting Configuration

Rate limiting uses in-memory storage by default, which is suitable for serverless environments like Vercel.

```bash
# Memory storage (default, recommended for Vercel)
# No additional configuration needed
```

### Logging Configuration

```bash
# Log level: debug, info, warn, error
LOG_LEVEL=info

# Log sampling rate (0.0 - 1.0)
# Production: 0.1 (10%) to reduce log volume
# Development: 1.0 (100%)
LOG_SAMPLE_RATE=1.0
```

## 7. API Development

### API Route Structure

API routes are located in `src/app/api/` directory.

### Authentication

Admin APIs require authentication:

- `x-admin-token` header or `Authorization: Bearer <token>`
- Token set via `INSIGHT_ADMIN_TOKEN` environment variable

### Core Functions

```typescript
import { handleApi } from '@/server/apiResponse';
import { cachedJson } from '@/server/apiResponse';
import { requireAdmin } from '@/server/apiResponse';

export async function GET(request: Request) {
  return handleApi(request, async () => {
    return { data: 'result' };
  });
}

const data = await cachedJson('cache-key', 60000, async () => {
  return await fetchData();
});
```

## 8. Internationalization

Translation files are located in `src/i18n/locales/`, supporting 2 languages:

- English (`en`)
- Chinese (`zh`)

### Usage

```tsx
import { useI18n } from '@/i18n';

export function MyComponent() {
  const { t, format, lang, setLang } = useI18n();

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <time>{format.date(new Date())}</time>
      <button onClick={() => setLang('zh')}>Switch to Chinese</button>
    </div>
  );
}
```

See [src/i18n/README.md](../src/i18n/README.md) for detailed documentation.

## 9. Shared Modules

The project includes a shared module library at `src/lib/shared/`:

```
src/lib/shared/
├── index.ts               # Unified exports
├── database/
│   └── BatchInserter.ts   # Database batch insert
├── blockchain/
│   ├── EvmOracleClient.ts # EVM oracle client base
│   └── ContractRegistry.ts
├── sync/
│   └── SyncManagerFactory.ts
├── errors/
│   └── ErrorHandler.ts    # Error handling
└── logger/
    └── LoggerFactory.ts   # Logger factory
```

### Usage

```typescript
import { BatchInserter, EvmOracleClient, createSingletonSyncManager } from '@/lib/shared';
```

## 10. Component Development

### UI Components

Base UI components are built with Radix UI and Tailwind CSS:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
```

### Feature Components

Feature components are organized by domain:

```tsx
import { AlertRulesManager } from '@/components/features/alert';
import { AssertionList } from '@/components/features/assertion';
import { Onboarding } from '@/components/features/onboarding';
```

## 11. FAQ

1. **Database connection error**: Check `DATABASE_URL` in environment variables
2. **API authentication error**: Ensure correct admin token is provided
3. **Web3 connection issue**: Ensure wallet is connected, check RPC URL configuration
4. **Translation not loading**: Check that translation files exist in `src/i18n/locales/`

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for more.
