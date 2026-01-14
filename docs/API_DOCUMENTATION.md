# API Documentation

## Overview

This document provides comprehensive documentation for the Insight API, including endpoints, request/response formats, error handling, and authentication mechanisms.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://insight.yourdomain.com/api`

## Authentication

### Admin Routes

Admin routes require authentication via a bearer token in the `Authorization` header:

```
Authorization: Bearer <admin-token>
```

The admin token is configured via the `INSIGHT_ADMIN_TOKEN` environment variable.

## API Response Format

All API endpoints return a consistent JSON response format:

### Success Response

```json
{
  "ok": true,
  "data": <response-data>
}
```

### Error Response

```json
{
  "ok": false,
  "error": {
    "code": "error_code",
    "details": <optional-error-details>
  }
}
```

## HTTP Status Codes

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | OK                    |
| 400         | Bad Request           |
| 403         | Forbidden             |
| 429         | Too Many Requests     |
| 500         | Internal Server Error |
| 502         | Bad Gateway           |

## Error Codes

| Error Code             | Description              | HTTP Status |
| ---------------------- | ------------------------ | ----------- |
| `forbidden`            | Access denied            | 403         |
| `rate_limited`         | Too many requests        | 429         |
| `invalid_request_body` | Invalid request body     | 400         |
| `invalid_address`      | Invalid Ethereum address | 400         |
| `missing_config`       | Missing configuration    | 400         |
| `rpc_unreachable`      | RPC server unreachable   | 502         |
| `sync_failed`          | Sync operation failed    | 502         |
| `unknown_error`        | Unknown error            | 500         |

## Core API Functions

### `handleApi()`

The main API handler function that wraps all API endpoints, providing consistent error handling, logging, and monitoring.

**Signature:**

```typescript
async function handleApi<T>(
  arg1: Request | (() => Promise<T | Response> | T | Response),
  arg2?: () => Promise<T | Response> | T | Response,
): Promise<Response>;
```

**Usage:**

```typescript
import { handleApi } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    // Your API logic here
    return { data: "result" };
  });
}
```

### `cachedJson()`

Caching utility that caches computed values in memory and persistent storage with a configurable TTL.

**Signature:**

```typescript
async function cachedJson<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T> | T,
): Promise<T>;
```

**Usage:**

```typescript
import { cachedJson } from "@/server/apiResponse";

const data = await cachedJson("cache-key", 60000, async () => {
  // Expensive computation or database query
  return await fetchData();
});
```

### `rateLimit()`

Rate limiting middleware that limits requests based on IP address.

**Signature:**

```typescript
async function rateLimit(
  request: Request,
  opts: { key: string; limit: number; windowMs: number },
): Promise<Response | null>;
```

**Usage:**

```typescript
import { rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  const limited = await rateLimit(request, {
    key: "api",
    limit: 100,
    windowMs: 60000,
  });
  if (limited) return limited;

  // Your API logic here
  return handleApi(request, async () => ({
    data: "result",
  }));
}
```

### `requireAdmin()`

Admin authentication middleware that checks for valid admin credentials.

**Signature:**

```typescript
async function requireAdmin(
  request: Request,
  opts?: { strict?: boolean; scope?: AdminScope },
): Promise<Response | null>;
```

**Usage:**

```typescript
import { requireAdmin } from "@/server/apiResponse";

export async function POST(request: Request) {
  const error = await requireAdmin(request, { scope: "write" });
  if (error) return error;

  // Admin-only API logic here
  return handleApi(request, async () => ({
    data: "admin-result",
  }));
}
```

## API Endpoints

### Oracle Endpoints

#### GET /api/oracle/stats

Get oracle statistics.

**Response:**

```json
{
  "ok": true,
  "data": {
    "totalAssertions": 1000,
    "activeDisputes": 5,
    "totalVolume": "1000000000000000000000"
  }
}
```

#### GET /api/oracle/[id]

Get oracle details by ID.

**Parameters:**

- `id`: Oracle contract address

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "0x...",
    "name": "Oracle Name",
    "status": "active"
  }
}
```

#### GET /api/oracle/alerts

Get oracle alerts.

**Query Parameters:**

- `status`: Optional alert status filter
- `limit`: Optional limit (default: 100)
- `offset`: Optional offset (default: 0)

**Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "1",
      "type": "slow_api_request",
      "severity": "warning",
      "title": "Slow API Request",
      "message": "GET /api/oracle/stats took 2000ms"
    }
  ]
}
```

#### POST /api/oracle/alert-rules

Create a new alert rule (admin only).

**Request Body:**

```json
{
  "enabled": true,
  "event": "slow_api_request",
  "params": {
    "thresholdMs": 1000
  },
  "channels": ["slack"],
  "recipient": "#alerts"
}
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "rule-1",
    "enabled": true,
    "event": "slow_api_request"
  }
}
```

### Analytics Endpoints

#### GET /api/oracle/charts

Get oracle chart data.

**Query Parameters:**

- `period`: Time period (default: "7d")
- `type`: Chart type (e.g., "volume", "disputes")

**Response:**

```json
{
  "ok": true,
  "data": {
    "labels": ["Jan 1", "Jan 2", "Jan 3"],
    "datasets": [
      {
        "label": "Volume",
        "data": [100, 200, 300]
      }
    ]
  }
}
```

## Observability

### Distributed Tracing

The API uses OpenTelemetry for distributed tracing. Trace IDs are included in response headers:

```
x-request-id: <trace-id>
```

### Logging

API access logs are sampled based on the `INSIGHT_API_LOG_SAMPLE_RATE` environment variable (default: 0.01).

### Metrics

Key metrics are logged for all API requests:

- Request duration
- Status code
- Method and path
- Client IP (anonymized)

## Chaos Engineering

The API includes chaos engineering capabilities to test system resilience:

### Chaos Configuration

| Environment Variable | Description                     | Default |
| -------------------- | ------------------------------- | ------- |
| `CHAOS_ENABLED`      | Enable chaos testing            | `false` |
| `CHAOS_FAILURE_RATE` | Failure rate for chaos tests    | `0.1`   |
| `CHAOS_MAX_DELAY_MS` | Maximum delay for network chaos | `500`   |

### Chaos Test Scenarios

1. **Network delays** - Random delays in API responses
2. **Database failures** - Simulated database read/write failures
3. **Service failures** - Random service errors
4. **Concurrent access** - High load testing
5. **Dependency failures** - Failed external service calls

## Performance Optimization

### Caching Strategy

The API implements a multi-layer caching strategy:

1. **Memory cache** - Fast in-memory cache with configurable TTL
2. **Persistent cache** - Database-backed cache for durability
3. **Cache invalidation** - Support for cache invalidation by prefix

### Database Indexes

Recommended indexes are documented in `docs/DATABASE_INDEXES.md` to optimize query performance.

## Testing

### Unit Tests

Run unit tests with:

```bash
npm test
```

### Chaos Tests

Run chaos engineering tests with:

```bash
npm run test -- src/server/apiResponse.chaos.test.ts
```

### Performance Benchmarks

Run performance benchmarks with:

```bash
npm run bench
```

## Versioning

The API uses URL versioning for breaking changes. Current version: `v1`

## Changelog

### v1.0.0

- Initial release
- Core API functionality
- Oracle monitoring endpoints
- Admin management
- Caching and rate limiting
- Chaos engineering support
- OpenTelemetry integration
