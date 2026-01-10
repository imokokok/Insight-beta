# Insight

基于 Next.js 的 UMA Optimistic Oracle 监控与交互面板，提供：

- 断言（Assertions）列表/详情/图表/排行榜
- 创建断言、争议、投票、结算（钱包交互）
- 后端索引与状态存储（Postgres/Supabase）

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

复制一份示例配置：

```bash
cp .env.example .env.local
```

最少需要配置数据库连接（推荐直接用 `DATABASE_URL`）。

### 3) 启动开发环境

```bash
npm run dev
```

默认会在 `http://localhost:3000` 启动；你也可以传端口：

```bash
npm run dev -- --port 3100
```

## 常用命令

- `npm run dev`：本地开发
- `npm run build`：构建
- `npm run start`：生产启动
- `npm run lint`：Lint
- `npm run typecheck`：TypeScript 类型检查
- `npx vitest run`：运行测试
- `npm run contracts:compile`：编译合约（Hardhat）
- `npm run contracts:test`：合约测试（Hardhat）

## 文档

- [部署指南 (DEPLOYMENT.md)](docs/DEPLOYMENT.md)：详细的生产环境部署说明（Docker、环境变量、健康检查）。
- [API 文档 (API.md)](docs/API.md)：后端接口定义与鉴权说明。

## 环境变量

项目在 `src/lib/env.ts` 中集中读取环境变量。

### 必需

- `DATABASE_URL`：Postgres 连接串（推荐）。如果不提供会尝试使用 `SUPABASE_DB_URL` 作为 fallback（见 [db.ts](file:///Users/imokokok/Documents/foresight-build/insight/src/server/db.ts)）
- `DATABASE_URL`：Postgres 连接串（推荐）。如果不提供会尝试使用 `SUPABASE_DB_URL` 作为 fallback（见 `src/server/db.ts`）

### 可选（用于配置/管理）

- `SUPABASE_DB_URL`：Supabase Postgres 连接串（供脚本/回退使用）
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`：脚本辅助字段（并非稳定的 DB URL 来源）
- `INSIGHT_ADMIN_TOKEN`：管理接口 Root Token（用于写配置、触发同步等；建议仅用于引导/紧急）
- `INSIGHT_ADMIN_TOKEN_SALT`：用于 DB 中管理多 Token 的盐（启用 `/api/admin/tokens` 时需要，建议 ≥16 字符随机）
- `INSIGHT_RPC_URL`：后端索引默认 RPC（写入/覆盖配置时可用）
- `INSIGHT_ORACLE_ADDRESS`：默认 Oracle 合约地址
- `INSIGHT_CHAIN`：链名（与配置的 `OracleChain` 一致，例如 `Polygon`/`Arbitrum`/`Optimism`/`Local`）

## 配置与数据流

### 管理接口鉴权

当设置了 `INSIGHT_ADMIN_TOKEN` 或 `INSIGHT_ADMIN_TOKEN_SALT` 时，管理/写接口需要鉴权：

- Header `x-admin-token: <token>` 或
- Header `Authorization: Bearer <token>`

当设置 `INSIGHT_ADMIN_TOKEN_SALT` 后，可以通过 `GET/POST/DELETE /api/admin/tokens` 管理多 Token（POST 会返回一次性的明文 token，用于分发/轮换）。

### Oracle 配置

后端配置通过 KV（DB）持久化，接口为：

- `GET /api/oracle/config`：读取配置
- `PUT /api/oracle/config`：更新配置（需要 `INSIGHT_ADMIN_TOKEN`）

配置结构见 `src/lib/oracleTypes.ts` 的 `OracleConfig`。

### 后端索引/同步

索引逻辑在 `src/server/oracleIndexer.ts`，并由 `src/server/worker.ts` 周期性触发（通过 `src/instrumentation.ts` 在 Node.js runtime 下注册）。

你也可以通过接口触发同步：

- `POST /api/oracle/sync`（需要 `INSIGHT_ADMIN_TOKEN`）
- `GET /api/oracle/status`：查看同步/处理状态

### 前端交易确认

前端交易会优先使用 `/api/oracle/config` 返回的 `rpcUrl` 来等待确认；若缺失则回退到钱包 provider。

相关实现见 `src/hooks/useOracleTransaction.ts`。

## 健康检查

- `GET /api/health`：返回 DB 连通性等信息（见 `src/app/api/health/route.ts`）

## Supabase 初始化（可选）

仓库包含脚本将本地 `.data` 中的配置/状态写入到 DB KV 表：

```bash
npm run supabase:provision
```

脚本行为见 `scripts/provision-supabase.mjs`。

## 常见问题（Troubleshooting）

### 1) `/api/health` 返回数据库未连接

- 确认 `.env.local` 中 `DATABASE_URL` 或 `SUPABASE_DB_URL` 正确
- 确认数据库允许当前网络访问（本地/云端）

### 2) 钱包切链报错 “Unrecognized chain / 4902”

应用会尝试自动添加网络并重试切链；若你的钱包拒绝添加网络，需要在钱包中手动确认或先添加对应网络。

### 3) 交易一直处于 Confirming

- 优先检查 `OracleConfig.rpcUrl` 是否可用（`GET /api/oracle/config`）
- RPC 不可用时会回退到钱包 provider，某些钱包节点可能会更慢

## 更多文档

- `docs/API.md`：API 端点与示例
- `docs/DEPLOYMENT.md`：生产部署与 Token 轮换
