# API 路由文档

> 自动生成于: 2026-02-02T06:13:01.169Z

## 概述

本文档列出了所有可用的 API 路由。

## 目录

- [Admin](#admin)
- [Alerts](#alerts)
- [Analytics](#analytics)
- [Assertions](#assertions)
- [Audit](#audit)
- [Charts](#charts)
- [Comments](#comments)
- [Config](#config)
- [Disputes](#disputes)
- [Docs](#docs)
- [Events](#events)
- [Export](#export)
- [GraphQL](#graphql)
- [Health](#health)
- [Incidents](#incidents)
- [Instances](#instances)
- [Leaderboard](#leaderboard)
- [Ops Metrics](#ops-metrics)
- [Other](#other)
- [Reports](#reports)
- [Risks](#risks)
- [Stats](#stats)
- [Status](#status)
- [Sync](#sync)
- [UMA](#uma)

## Admin

| 方法              | 路径            | 文件                    |
| ----------------- | --------------- | ----------------------- |
| GET, PUT, DELETE  | `/admin/kv`     | `admin/kv/route.ts`     |
| GET, POST, DELETE | `/admin/tokens` | `admin/tokens/route.ts` |

## Alerts

| 方法  | 路径                 | 文件                          |
| ----- | -------------------- | ----------------------------- |
| GET   | `/oracle/alerts`     | `oracle/alerts/route.ts`      |
| PATCH | `/oracle/alerts/:id` | `oracle/alerts/[id]/route.ts` |

## Analytics

| 方法 | 路径                          | 文件                                  |
| ---- | ----------------------------- | ------------------------------------- |
| GET  | `/oracle/analytics/accuracy`  | `oracle/analytics/accuracy/route.ts`  |
| GET  | `/oracle/analytics/deviation` | `oracle/analytics/deviation/route.ts` |
| GET  | `/oracle/analytics/markets`   | `oracle/analytics/markets/route.ts`   |

## Assertions

| 方法 | 路径                              | 文件                                       |
| ---- | --------------------------------- | ------------------------------------------ |
| GET  | `/oracle/assertions`              | `oracle/assertions/route.ts`               |
| GET  | `/oracle/assertions/:id`          | `oracle/assertions/[id]/route.ts`          |
| GET  | `/oracle/assertions/:id/evidence` | `oracle/assertions/[id]/evidence/route.ts` |
| GET  | `/oracle/assertions/:id/timeline` | `oracle/assertions/[id]/timeline/route.ts` |

## Audit

| 方法 | 路径            | 文件                    |
| ---- | --------------- | ----------------------- |
| GET  | `/oracle/audit` | `oracle/audit/route.ts` |

## Charts

| 方法 | 路径             | 文件                     |
| ---- | ---------------- | ------------------------ |
| GET  | `/oracle/charts` | `oracle/charts/route.ts` |

## Comments

| 方法      | 路径        | 文件                |
| --------- | ----------- | ------------------- |
| GET, POST | `/comments` | `comments/route.ts` |

## Config

| 方法                   | 路径                           | 文件                                   |
| ---------------------- | ------------------------------ | -------------------------------------- |
| GET, PUT               | `/oracle/config`               | `oracle/config/route.ts`               |
| GET, POST              | `/oracle/config-history/:id`   | `oracle/config-history/[id]/route.ts`  |
| GET                    | `/oracle/config-history/stats` | `oracle/config-history/stats/route.ts` |
| POST                   | `/oracle/config/batch`         | `oracle/config/batch/route.ts`         |
| GET, POST              | `/oracle/config/cache`         | `oracle/config/cache/route.ts`         |
| POST                   | `/oracle/config/clone`         | `oracle/config/clone/route.ts`         |
| POST                   | `/oracle/config/diff`          | `oracle/config/diff/route.ts`          |
| GET, POST              | `/oracle/config/export`        | `oracle/config/export/route.ts`        |
| GET                    | `/oracle/config/history`       | `oracle/config/history/route.ts`       |
| GET, POST              | `/oracle/config/history/:id`   | `oracle/config/history/[id]/route.ts`  |
| GET                    | `/oracle/config/history/stats` | `oracle/config/history/stats/route.ts` |
| GET                    | `/oracle/config/search`        | `oracle/config/search/route.ts`        |
| GET, POST, PUT, DELETE | `/oracle/config/templates`     | `oracle/config/templates/route.ts`     |
| POST                   | `/oracle/config/validate`      | `oracle/config/validate/route.ts`      |
| GET, POST              | `/oracle/config/versions`      | `oracle/config/versions/route.ts`      |
| GET, POST, PUT, DELETE | `/oracle/config/webhooks`      | `oracle/config/webhooks/route.ts`      |

## Disputes

| 方法 | 路径               | 文件                       |
| ---- | ------------------ | -------------------------- |
| GET  | `/oracle/disputes` | `oracle/disputes/route.ts` |

## Docs

| 方法 | 路径                 | 文件                         |
| ---- | -------------------- | ---------------------------- |
| GET  | `/docs`              | `docs/route.ts`              |
| GET  | `/docs/openapi.json` | `docs/openapi.json/route.ts` |
| GET  | `/docs/swagger`      | `docs/swagger/route.ts`      |

## Events

| 方法 | 路径      | 文件              |
| ---- | --------- | ----------------- |
| GET  | `/events` | `events/route.ts` |

## Export

| 方法 | 路径      | 文件              |
| ---- | --------- | ----------------- |
| GET  | `/export` | `export/route.ts` |

## GraphQL

| 方法      | 路径       | 文件               |
| --------- | ---------- | ------------------ |
| GET, POST | `/graphql` | `graphql/route.ts` |

## Health

| 方法 | 路径         | 文件                 |
| ---- | ------------ | -------------------- |
| GET  | `/health`    | `health/route.ts`    |
| -    | `/v1/health` | `v1/health/route.ts` |

## Incidents

| 方法       | 路径                    | 文件                             |
| ---------- | ----------------------- | -------------------------------- |
| GET, POST  | `/oracle/incidents`     | `oracle/incidents/route.ts`      |
| GET, PATCH | `/oracle/incidents/:id` | `oracle/incidents/[id]/route.ts` |

## Instances

| 方法 | 路径                | 文件                        |
| ---- | ------------------- | --------------------------- |
| GET  | `/oracle/instances` | `oracle/instances/route.ts` |

## Leaderboard

| 方法 | 路径                  | 文件                          |
| ---- | --------------------- | ----------------------------- |
| GET  | `/oracle/leaderboard` | `oracle/leaderboard/route.ts` |

## Ops Metrics

| 方法 | 路径                  | 文件                          |
| ---- | --------------------- | ----------------------------- |
| GET  | `/oracle/ops-metrics` | `oracle/ops-metrics/route.ts` |

## Other

| 方法                     | 路径                                     | 文件                                              |
| ------------------------ | ---------------------------------------- | ------------------------------------------------- |
| GET, POST                | `/analytics/web-vitals`                  | `analytics/web-vitals/route.ts`                   |
| GET, POST                | `/audit`                                 | `audit/route.ts`                                  |
| GET, POST                | `/audit/logs`                            | `audit/logs/route.ts`                             |
| GET                      | `/audit/stats`                           | `audit/stats/route.ts`                            |
| GET, POST, PUT           | `/oracle/alert-rules`                    | `oracle/alert-rules/route.ts`                     |
| GET, POST, PUT, DELETE   | `/oracle/chainlink`                      | `oracle/chainlink/route.ts`                       |
| GET, POST                | `/oracle/comparison`                     | `oracle/comparison/route.ts`                      |
| GET, POST, PATCH, DELETE | `/oracle/notification-channels`          | `oracle/notification-channels/route.ts`           |
| POST                     | `/oracle/notification-channels/:id/test` | `oracle/notification-channels/[id]/test/route.ts` |
| GET                      | `/oracle/sla/stats`                      | `oracle/sla/stats/route.ts`                       |
| GET, POST                | `/oracle/unified`                        | `oracle/unified/route.ts`                         |

## Reports

| 方法 | 路径                    | 文件                            |
| ---- | ----------------------- | ------------------------------- |
| GET  | `/oracle/sla/reports`   | `oracle/sla/reports/route.ts`   |
| POST | `/reports/generate-pdf` | `reports/generate-pdf/route.ts` |

## Risks

| 方法 | 路径            | 文件                    |
| ---- | --------------- | ----------------------- |
| GET  | `/oracle/risks` | `oracle/risks/route.ts` |

## Stats

| 方法 | 路径                 | 文件                         |
| ---- | -------------------- | ---------------------------- |
| GET  | `/oracle/stats`      | `oracle/stats/route.ts`      |
| GET  | `/oracle/stats/user` | `oracle/stats/user/route.ts` |

## Status

| 方法 | 路径             | 文件                     |
| ---- | ---------------- | ------------------------ |
| GET  | `/oracle/status` | `oracle/status/route.ts` |

## Sync

| 方法      | 路径                   | 文件                           |
| --------- | ---------------------- | ------------------------------ |
| GET, POST | `/oracle/sync`         | `oracle/sync/route.ts`         |
| GET       | `/oracle/sync-metrics` | `oracle/sync-metrics/route.ts` |

## UMA

| 方法             | 路径                                     | 文件                                             |
| ---------------- | ---------------------------------------- | ------------------------------------------------ |
| GET              | `/oracle/uma`                            | `oracle/uma/route.ts`                            |
| GET              | `/oracle/uma-users/[address]/assertions` | `oracle/uma-users/[address]/assertions/route.ts` |
| GET              | `/oracle/uma-users/[address]/stats`      | `oracle/uma-users/[address]/stats/route.ts`      |
| GET              | `/oracle/uma/assertions`                 | `oracle/uma/assertions/route.ts`                 |
| GET              | `/oracle/uma/assertions/:id`             | `oracle/uma/assertions/[id]/route.ts`            |
| GET              | `/oracle/uma/bridge`                     | `oracle/uma/bridge/route.ts`                     |
| GET, PUT, DELETE | `/oracle/uma/config`                     | `oracle/uma/config/route.ts`                     |
| GET              | `/oracle/uma/disputes`                   | `oracle/uma/disputes/route.ts`                   |
| GET              | `/oracle/uma/governance`                 | `oracle/uma/governance/route.ts`                 |
| GET              | `/oracle/uma/leaderboard`                | `oracle/uma/leaderboard/route.ts`                |
| GET              | `/oracle/uma/polymarket`                 | `oracle/uma/polymarket/route.ts`                 |
| GET, POST        | `/oracle/uma/rewards`                    | `oracle/uma/rewards/route.ts`                    |
| GET              | `/oracle/uma/slashing`                   | `oracle/uma/slashing/route.ts`                   |
| GET              | `/oracle/uma/staking`                    | `oracle/uma/staking/route.ts`                    |
| GET              | `/oracle/uma/stats`                      | `oracle/uma/stats/route.ts`                      |
| GET, POST        | `/oracle/uma/sync`                       | `oracle/uma/sync/route.ts`                       |
| GET, POST        | `/oracle/uma/task`                       | `oracle/uma/task/route.ts`                       |
| GET, POST        | `/oracle/uma/tvl`                        | `oracle/uma/tvl/route.ts`                        |
| GET              | `/oracle/uma/users/[address]/assertions` | `oracle/uma/users/[address]/assertions/route.ts` |
| GET              | `/oracle/uma/users/[address]/stats`      | `oracle/uma/users/[address]/stats/route.ts`      |
| GET              | `/oracle/uma/votes`                      | `oracle/uma/votes/route.ts`                      |

## 统计

- 总路由数: 84
- 类别数: 25
