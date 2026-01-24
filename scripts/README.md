# Maintenance Tools

This directory contains scripts and tools for maintaining the project.

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
