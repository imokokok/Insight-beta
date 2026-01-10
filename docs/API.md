# API

所有接口默认返回：

```json
{ "ok": true, "data": ... }
```

或错误：

```json
{ "ok": false, "error": "error_code" }
```

当设置了 `INSIGHT_ADMIN_TOKEN` 或 `INSIGHT_ADMIN_TOKEN_SALT` 时，管理/写接口需要鉴权：

- `x-admin-token: <token>` 或 `Authorization: Bearer <token>`

## Health

### GET `/api/health`

用于部署/监控探活，检查 DB 连通性。

## Oracle

### GET `/api/oracle/config`

读取 Oracle 配置（`OracleConfig`）。

### PUT `/api/oracle/config`（Admin）

更新 Oracle 配置（支持部分字段 patch）。

请求体示例：

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

查看同步状态与处理进度（`OracleStatusSnapshot`）。

### POST `/api/oracle/sync`（Admin）

触发一次同步。

### GET `/api/oracle/assertions`

查询断言列表，支持参数：

- `status`: `Pending | Disputed | Resolved`
- `chain`: `Polygon | Arbitrum | Optimism | Local`
- `q`: 关键字（market/assertion/address 等）
- `limit`: 默认 30
- `cursor`: 分页游标

### GET `/api/oracle/assertions/[id]`

查询断言详情。

### GET `/api/oracle/disputes`

查询争议列表/统计（按实现而定）。

### GET `/api/oracle/stats`

Oracle 全局统计（TVS、活跃争议数、24h resolved、平均解决时间等）。

### GET `/api/oracle/charts`

图表聚合数据（每日断言、累计 TVS 等）。

### GET `/api/oracle/leaderboard`

排行榜数据（top asserters/top disputers）。

## Admin KV（高级）

KV 用于存储后端内部状态/配置 JSON，主要给运维/调试用。

### GET `/api/admin/kv`（Admin）

- `?key=...`：读取单个 key
- `?prefix=...&limit=...&offset=...`：列出 keys

### PUT `/api/admin/kv`（Admin）

写入一个 JSON：

```json
{ "key": "oracle-config.json", "value": { } }
```

### DELETE `/api/admin/kv?key=...`（Admin）

删除一个 key。

## Admin Tokens（RBAC）

当设置 `INSIGHT_ADMIN_TOKEN_SALT` 后，可以用 DB 持久化的多 Token（可撤销、可轮换），并按角色限制能力。

### GET `/api/admin/tokens`（Admin）

列出已创建的 token（不包含明文/哈希）。

### POST `/api/admin/tokens`（Admin）

创建 token（只返回一次明文 token）：

```json
{ "label": "alerts-bot", "role": "alerts" }
```

### DELETE `/api/admin/tokens?id=...`（Admin）

吊销一个 token。
