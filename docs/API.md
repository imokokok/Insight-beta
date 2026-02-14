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
- `unauthorized`: Authentication required
- `not_found`: Resource not found
- `internal_error`: Server error

Authentication:

- Admin endpoints require `Authorization: Bearer <token>` header

## Health

### GET `/api/health`

Health check endpoint with multiple probes:

- `?probe=liveness` - Application is running
- `?probe=readiness` - Application is ready to serve traffic
- `?probe=validation` - Full configuration validation

## Oracle

### Price Data

#### GET `/api/oracle/unified`

Get unified price data from multiple protocols.

Query params:

- `symbol` - Trading pair (e.g., ETH/USD)
- `chain` - Blockchain network
- `protocols` - Comma-separated protocol list

#### GET `/api/oracle/comparison`

Compare prices across different protocols.

#### GET `/api/oracle/chainlink`

Get Chainlink price feed data.

### UMA Protocol

#### GET `/api/oracle/uma`

Get UMA protocol overview data.

#### GET `/api/oracle/uma/assertions`

List UMA assertions.

Query params:

- `status` - Filter by status (active, disputed, resolved)
- `limit` - Result limit (1-100, default 30)
- `cursor` - Pagination cursor

#### GET `/api/oracle/uma/assertions/[id]`

Get assertion details.

#### GET `/api/oracle/uma/disputes`

List disputes.

#### GET `/api/oracle/uma/votes`

Get voting data.

#### GET `/api/oracle/uma/stats`

Get UMA protocol statistics.

#### GET `/api/oracle/uma/governance`

Get governance data.

#### POST `/api/oracle/uma/sync`

Trigger UMA data sync (Admin).

### General

#### GET `/api/oracle/assertions`

List all assertions across protocols.

#### GET `/api/oracle/assertions/[id]`

Get assertion details.

#### GET `/api/oracle/disputes`

List all disputes.

#### GET `/api/oracle/stats`

Get oracle statistics.

#### GET `/api/oracle/status`

Get sync status.

#### POST `/api/oracle/sync`

Trigger sync (Admin).

### Configuration

#### GET `/api/oracle/config`

Get oracle configuration.

#### PUT `/api/oracle/config`

Update configuration (Admin).

#### GET `/api/oracle/config/history`

Get configuration history.

#### GET `/api/oracle/config/versions`

List configuration versions.

### Alerts

#### GET `/api/oracle/alerts`

List alerts.

#### POST `/api/oracle/alerts`

Create alert (Admin).

#### GET `/api/oracle/alerts/[id]`

Get alert details.

#### PUT `/api/oracle/alerts/[id]`

Update alert (Admin).

#### DELETE `/api/oracle/alerts/[id]`

Delete alert (Admin).

#### GET `/api/oracle/alert-rules`

List alert rules.

### Analytics

#### GET `/api/oracle/analytics/deviation`

Get price deviation analysis.

#### GET `/api/oracle/analytics/markets`

Get market analytics.

#### GET `/api/oracle/analytics/accuracy`

Get accuracy metrics.

### Charts

#### GET `/api/oracle/charts`

Get chart data for price history.

Query params:

- `symbol` - Trading pair
- `timeframe` - 1m, 5m, 1h, 1d
- `from` - Start timestamp
- `to` - End timestamp

### Incidents

#### GET `/api/oracle/incidents`

List incidents.

#### GET `/api/oracle/incidents/[id]`

Get incident details.



## Security

#### GET `/api/security/detections`

List security detections.

#### GET `/api/security/detections/[id]`

Get detection details.

#### POST `/api/security/detections/[id]/review`

Review detection (Admin).

#### GET `/api/security/alerts/unread-count`

Get unread alert count.

#### GET `/api/security/alerts/stream`

Stream security alerts (SSE).

#### GET `/api/security/metrics`

Get security metrics.

#### GET `/api/security/trends`

Get security trends.

#### GET `/api/security/monitor-status`

Get monitor status.

#### POST `/api/security/monitor/start`

Start monitoring (Admin).

#### POST `/api/security/monitor/stop`

Stop monitoring (Admin).

#### GET `/api/security/config`

Get security configuration.

#### PUT `/api/security/config`

Update security configuration (Admin).

#### GET `/api/security/reports/export`

Export security report.

## Monitoring

#### GET `/api/monitoring/health`

Get detailed health metrics.

#### GET `/api/monitoring/metrics`

Get system metrics.

#### GET `/api/monitoring/statistics`

Get monitoring statistics.

## Admin

#### GET `/api/admin/tokens`

List admin tokens (Admin).

#### POST `/api/admin/tokens`

Create admin token (Admin).

#### DELETE `/api/admin/tokens`

Revoke admin token (Admin).

#### GET `/api/admin/kv`

Get KV store data (Admin).

#### POST `/api/admin/kv`

Set KV store data (Admin).

## Analytics

#### POST `/api/analytics/web-vitals`

Report web vitals metrics.

## Solana

#### GET `/api/solana/price`

Get Solana price data.

## Documentation

#### GET `/api/docs`

API documentation (Swagger UI).

#### GET `/api/docs/swagger`

Swagger JSON spec.

#### GET `/api/docs/openapi.json`

OpenAPI specification.
