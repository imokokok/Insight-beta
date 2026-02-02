[中文](./API.zh-CN.md)

# API Documentation

All endpoints return:

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

### PUT `/api/oracle/alert-rules` (Admin)

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

---

## WebSocket

Real-time data streaming via WebSocket.

### Connection

```
ws://localhost:3001
```

Or in production:

```
wss://your-domain.com/api/ws
```

### Message Format

All messages are JSON with the following structure:

```json
{
  "type": "message_type",
  "data": { ... }
}
```

### Client -> Server Messages

#### Subscribe to Price Updates

```json
{
  "type": "subscribe",
  "symbols": ["ETH/USD", "BTC/USD", "LINK/USD"]
}
```

#### Unsubscribe from Price Updates

```json
{
  "type": "unsubscribe",
  "symbols": ["ETH/USD"]
}
```

#### Ping (Keep Connection Alive)

```json
{
  "type": "ping"
}
```

### Server -> Client Messages

#### Price Update

```json
{
  "type": "price_update",
  "data": {
    "symbol": "ETH/USD",
    "price": 3500.5,
    "timestamp": "2024-01-15T10:30:00Z",
    "sources": ["chainlink", "pyth"],
    "confidence": 0.98
  }
}
```

#### Comparison Update

```json
{
  "type": "comparison_update",
  "data": {
    "symbol": "ETH/USD",
    "consensusPrice": 3500.5,
    "deviations": [
      { "protocol": "chainlink", "price": 3501.0, "deviation": 0.01 },
      { "protocol": "pyth", "price": 3500.0, "deviation": -0.01 }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Error

```json
{
  "type": "error",
  "data": {
    "code": "invalid_symbol",
    "message": "Symbol not supported"
  }
}
```

#### Pong (Ping Response)

```json
{
  "type": "pong",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes

- `invalid_message`: Message format is invalid
- `invalid_symbol`: Requested symbol is not supported
- `rate_limited`: Too many requests
- `subscription_limit`: Maximum subscriptions reached
- `internal_error`: Server internal error

### Reconnection Strategy

Clients should implement exponential backoff reconnection:

1. First retry: 1 second
2. Second retry: 2 seconds
3. Third retry: 4 seconds
4. Maximum retry: 30 seconds
5. Maximum attempts: 5

### Example Usage (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected to WebSocket');

  // Subscribe to price updates
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      symbols: ['ETH/USD', 'BTC/USD'],
    }),
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'price_update':
      console.log('Price update:', message.data);
      break;
    case 'comparison_update':
      console.log('Comparison update:', message.data);
      break;
    case 'error':
      console.error('WebSocket error:', message.data);
      break;
  }
};

ws.onclose = () => {
  console.log('Disconnected from WebSocket');
  // Implement reconnection logic here
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```
