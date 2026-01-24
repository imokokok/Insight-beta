[English](./API.md)

# API

所有接口默认返回：

```json
{ "ok": true, "data": ... }
```

Or error:

```json
{ "ok": false, "error": "error_code" }
```

Common error codes:

- `forbidden`: Insufficient permissions
- `rate_limited`: Too many requests
- `invalid_request_body`: Invalid request parameters
- `invalid_address`: Invalid address format
- `missing_config`: Missing required configuration
- `rpc_unreachable`: RPC node unreachable
- `sync_failed`: Sync failed
- `unknown_error`: Unknown error

When `INSIGHT_ADMIN_TOKEN` or `INSIGHT_ADMIN_TOKEN_SALT` is set, admin/write endpoints require authentication:

- `x-admin-token: <token>` or `Authorization: Bearer <token>`

## Health

### GET `/api/health`

Used for deployment/monitoring health checks, checks DB connectivity.

## Oracle

### GET `/api/oracle/config`

Read Oracle configuration (`OracleConfig`).

### PUT `/api/oracle/config` (Admin)

Update Oracle configuration (supports partial field patch).

Request body example:

```json
{
  "rpcUrl": "https://...",
  "contractAddress": "0x...",
  "chain": "Polygon",
  "startBlock": 0,
  "maxBlockRange": 10000,
  "votingPeriodHours": 72
}
```

### GET `/api/oracle/status`

View sync status and progress (`OracleStatusSnapshot`).

### POST `/api/oracle/sync` (Admin)

Trigger a sync.

### GET `/api/oracle/assertions`

Query assertion list, supports parameters:

- `status`: `Pending | Disputed | Resolved` - Assertion status filter
- `chain`: `Polygon | Arbitrum | Optimism | Local` - Blockchain network filter
- `q`: Keywords (market/assertion/address etc.)
- `limit`: Result limit, 1-100, default 30
- `cursor`: Pagination cursor, default 0
- `sync`: `0 | 1` - Admin only, whether to trigger sync first
- `asserter`: Asserter address, filter assertions from specific address
- `ids`: Comma-separated assertion IDs, exact filter for multiple assertions

Returns:

```json
{
  "items": [...],
  "total": 100,
  "nextCursor": 30
}
```

### GET `/api/oracle/assertions/[id]`

Query assertion details.

### GET `/api/oracle/disputes`

Query dispute list/statistics.

### GET `/api/oracle/stats`

Oracle global statistics (TVS, active disputes, 24h resolved, average resolution time, etc.).

### GET `/api/oracle/charts`

Chart aggregated data (daily assertions, cumulative TVS, etc.).

### GET `/api/oracle/leaderboard`

Leaderboard data (top asserters/top disputers).

## Alerts & Rules

### GET `/api/oracle/alerts`

Query alert list.

- `status`: `Open | Acknowledged | Resolved`
- `severity`: `info | warning | critical`
- `type`: Alert type filter
- `q`: Keyword search
- `limit`: Default 30
- `cursor`: Pagination cursor

### GET `/api/oracle/alert-rules` (Admin)

Get all alert rules.

### PUT `/api/oracle/alerts-rules` (Admin)

Fully update alert rules.

Request body:

```json
{
  "rules": [
    {
      "id": "rule_1",
      "name": "High Dispute Rate",
      "enabled": true,
      "event": "high_dispute_rate",
      "severity": "warning",
      "params": { ... },
      "channels": ["webhook"],
      "recipient": "https://..."
    }
  ]
}
```

### POST `/api/oracle/alert-rules` (Admin)

Test alert rule (send test notification).

Request body: `{ "ruleId": "..." }`

## Admin KV (Advanced)

KV is used for backend internal state/configuration JSON, mainly for ops/debugging.

### GET `/api/admin/kv` (Admin)

- `?key=...`: Read single key
- `?prefix=...&limit=...&offset=...`: List keys

### PUT `/api/admin/kv` (Admin)

Write a JSON:

```json
{ "key": "oracle-config.json", "value": {} }
```

### DELETE `/api/admin/kv?key=...` (Admin)

Delete a key.

## Admin Tokens (RBAC)

When `INSIGHT_ADMIN_TOKEN_SALT` is set, you can use DB-persisted multiple tokens (revocable, rotatable), with role-based capability limits.

### GET `/api/admin/tokens` (Admin)

List created tokens (does not include plaintext/hash).

### POST `/api/admin/tokens` (Admin)

Create token (returns plaintext token only once):

```json
{ "label": "alerts-bot", "role": "alerts" }
```

### DELETE `/api/admin/tokens?id=...` (Admin)

Revoke a token.
