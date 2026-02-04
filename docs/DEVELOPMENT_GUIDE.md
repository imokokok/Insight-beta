[中文](./DEVELOPMENT_GUIDE.zh-CN.md)

# Development Guide

## 1. Environment Setup

```bash
git clone https://github.com/your-org/oracle-monitor.git
cd oracle-monitor
npm install
cp .env.example .env.local
npm run dev
```

Visit http://localhost:3000

## 2. Project Structure

```
src/
├── app/              # Pages and API routes
├── components/       # React components
├── contexts/         # Context providers
├── hooks/            # Custom hooks
├── i18n/             # Internationalization
├── lib/              # Utilities and type definitions
├── server/           # Backend logic
└── types/            # Global types
```

## 3. Development Standards

- **TypeScript**: Strict mode, all functions and components must have type definitions
- **Naming Conventions**:
  - Components: PascalCase (e.g., `AssertionList`)
  - Functions: camelCase (e.g., `useOracleTransaction`)
  - Files: kebab-case (e.g., `oracle-config.ts`)

## 4. Commands

| Command                  | Description              |
| ------------------------ | ------------------------ |
| `npm run dev`            | Start development server |
| `npm test`               | Run tests                |
| `npm run build`          | Build production version |
| `npm run contracts:test` | Run contract tests       |

## 5. Testing

```bash
npm test                    # All tests
npm test src/app/api/       # API tests
npm test src/components/    # Component tests
npm run contracts:test      # Contract tests
npm test -- --coverage      # Test coverage
```

## 6. Database

### Local Development Database

```bash
docker run --name oracle-monitor-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=oracle_monitor \
  -p 5432:5432 -d postgres
```

### Database Tables

- `assertions`: Assertion information
- `disputes`: Dispute information
- `rate_limits`: API rate limiting
- `kv_store`: Configuration and state storage

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

## 8. Smart Contracts

```bash
npm run contracts:compile    # Compile
npm run contracts:deploy     # Deploy to local network
npm run contracts:deploy:polygon  # Deploy to Polygon
npm run contracts:test       # Run tests
```

## 9. Internationalization

Translation files are located in `src/i18n/translations.ts`, supporting Chinese, English, and Spanish.

## 10. FAQ

1. **Database connection error**: Check `DATABASE_URL` in environment variables
2. **API authentication error**: Ensure correct admin token is provided
3. **Web3 connection issue**: Ensure wallet is connected, check RPC URL configuration

See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
