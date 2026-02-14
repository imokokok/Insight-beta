# Maintenance Tools

This directory contains scripts and tools for maintaining the Insight project.

## Available Scripts

### generate-api-docs.mjs

Generates API documentation from route files.

```bash
npm run docs:api
```

This will:

- Scan all API route files in `src/app/api/`
- Auto-detect HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Generate Markdown documentation in `docs/generated/api-routes.md`
- Generate OpenAPI spec in `docs/generated/openapi.json`

### provision-supabase.mjs

Provisions Supabase database schema.

```bash
npm run supabase:provision
```

### post-deploy-check.js

Runs post-deployment verification checks.

```bash
npm run check:prod
```

Verifies:

- Database connectivity
- Redis connectivity
- RPC endpoints
- Health check endpoints

### analyze-bundle.mjs

Analyzes the Next.js bundle size.

```bash
npm run analyze:bundle
```

### extract-translation-keys.ts

Extracts translation keys from source code.

```bash
npm run i18n:extract
```

### validate-translations.ts

Validates translation files for completeness.

```bash
npm run i18n:validate
```

### chaos-test.ts

Runs chaos engineering tests.

```bash
# Dry run
npm run test:chaos:dry-run

# Full chaos test
npm run test:chaos
```

## Maintenance Commands

### Dependency Updates

Dependencies are automatically updated via Dependabot. To manually check for updates:

```bash
npm outdated
npm update
```

### API Documentation

Generate updated API docs when routes change:

```bash
npm run docs:api
```

### Changeset Management

Add a new changeset:

```bash
npm run changeset:add
```

Version bump (before release):

```bash
npm run changeset:version
npm run changeset:publish
```

## CI/CD Pipeline

The CI pipeline includes:

1. **Lint** - ESLint + Prettier validation
2. **Typecheck** - TypeScript compilation
3. **Test** - Unit tests with coverage
4. **Build** - Next.js production build
5. **Contract Test** - Solidity smart contract tests
6. **Performance** - Benchmark tests
7. **API Docs** - Auto-generated API documentation
8. **E2E Test** - Playwright browser tests
9. **Quality Gate** - Final validation

## Performance Monitoring

Run performance benchmarks:

```bash
npm run bench
```

Results are uploaded to GitHub Artifacts and can be compared across commits.

## Database Maintenance

### Migrations

```bash
# Development
npm run db:migrate

# Production
npm run db:migrate:prod
```

### Studio

```bash
npm run db:studio
```

### Seeding

```bash
npm run db:seed
```

## Internationalization Maintenance

### Validate Translations

```bash
npm run i18n:validate
```

### Extract Translation Keys

```bash
npm run i18n:extract
```

## Code Quality

### Linting

```bash
npm run lint
npm run lint:security
```

### Formatting

```bash
npm run format:check
npm run format:write
```

### Type Checking

```bash
npm run typecheck
```

## Testing

### Unit Tests

```bash
npm test
npm run test:coverage
```

### E2E Tests

```bash
npm run test:e2e
npm run test:e2e:headed
```

### Benchmark Tests

```bash
npm run bench
```

## Related Documentation

- [Development Guide](../docs/DEVELOPMENT_GUIDE.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
