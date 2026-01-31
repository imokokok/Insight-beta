# OracleMonitor 品牌改造清单

## 需要修改的文件清单

### 1. URL 和域名相关 (高优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/app/layout.tsx` | `https://insight.foresight.build` | `https://oracle-monitor.foresight.build` | 71, 81 |
| `src/app/sitemap.ts` | `https://insight.foresight.build` | `https://oracle-monitor.foresight.build` | 6, 12, 18, 24 |
| `src/app/robots.ts` | `https://insight.foresight.build/sitemap.xml` | `https://oracle-monitor.foresight.build/sitemap.xml` | 10 |
| `src/lib/integration/embedApiManager.ts` | `https://insight.foresight.build/embed` | `https://oracle-monitor.foresight.build/embed` | 458, 539 |
| `src/components/features/wallet/UserMenu.tsx` | `http://insight.local` | `http://oracle-monitor.local` | 84 |

### 2. 服务名称和标识 (高优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/instrumentation.ts` | `insight-beta` | `oracle-monitor` | 36, 60 |
| `src/lib/observability/sentryIntegration.tsx` | `insight-oracle` | `oracle-monitor` | 229 |
| `src/lib/monitoring/opentelemetry.ts` | `insight-oracle` | `oracle-monitor` | 8 |
| `src/server/db.ts` | `insight-${process.env.NODE_ENV}` | `oracle-monitor-${process.env.NODE_ENV}` | 94 |

### 3. LocalStorage 和存储键名 (中优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/components/features/onboarding/Onboarding.tsx` | `insight-onboarding-completed` | `oracle-monitor-onboarding-completed` | 34, 166 |
| `src/components/features/onboarding/Onboarding.tsx` | `insight-user-role` | `oracle-monitor-user-role` | 150 |
| `src/hooks/user/useWatchlist.ts` | `insight_watchlist` | `oracle-monitor_watchlist` | 7 |
| `src/hooks/user/useAdminSession.ts` | `insight_admin_token` | `oracle-monitor_admin_token` | 5 |
| `src/hooks/user/useAdminSession.ts` | `insight_admin_actor` | `oracle-monitor_admin_actor` | 6 |
| `src/hooks/user/useAdminSession.ts` | `insight_admin_session` | `oracle-monitor_admin_session` | 7 |
| `src/lib/monitoring/analyticsReporter.ts` | `insight_session_id` | `oracle-monitor_session_id` | 199, 202 |
| `src/lib/monitoring/analyticsReporter.ts` | `insight-web-vitals` | `oracle-monitor-web-vitals` | 151 |

### 4. Worker 和全局变量 (中优先级)

| 文件路径 | 当前内容 | 建议修改 | 说明 |
|---------|---------|---------|------|
| `src/server/worker.ts` | `insightWorkerLockClient` | `oracleMonitorWorkerLockClient` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerLockKey` | `oracleMonitorWorkerLockKey` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerInterval` | `oracleMonitorWorkerInterval` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerTickInProgress` | `oracleMonitorWorkerTickInProgress` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerLastTickAt` | `oracleMonitorWorkerLastTickAt` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerLastTickDurationMs` | `oracleMonitorWorkerLastTickDurationMs` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerLastError` | `oracleMonitorWorkerLastError` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerLastMaintenanceAt` | `oracleMonitorWorkerLastMaintenanceAt` | 全局变量 |
| `src/server/worker.ts` | `insightWorkerStarted` | `oracleMonitorWorkerStarted` | 全局变量 |
| `src/server/worker.ts` | `insight_worker:` | `oracle_monitor_worker:` | Redis key |

### 5. 数据库和缓存相关 (中优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/server/db.ts` | `insightDbAlertRulesCache` | `oracleMonitorDbAlertRulesCache` | 25, 172, 179, 183 |
| `src/server/db.ts` | `insightDbAlertRulesInflight` | `oracleMonitorDbAlertRulesInflight` | 26, 174, 175, 190 |
| `src/server/db.ts` | `insightDbAlertCooldown` | `oracleMonitorDbAlertCooldown` | 27, 31, 33 |
| `src/server/db.ts` | `insightDbAlertDepth` | `oracleMonitorDbAlertDepth` | 28, 37, 38, 42, 144, 237, 238, 257 |
| `src/server/redisCache.ts` | `insight:` | `oracle-monitor:` | 97 |
| `src/server/memoryBackend.ts` | `__insightMemoryStore` | `__oracleMonitorMemoryStore` | 181, 182, 185, 196 |

### 6. API 和文档相关 (中优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/lib/api/apiDocGenerator.ts` | `Insight API` | `OracleMonitor API` | 347 |
| `src/lib/api/apiDocGenerator.ts` | `Insight oracle monitoring platform` | `OracleMonitor universal oracle monitoring platform` | 349 |
| `src/lib/api/apiSecurity.ts` | `insight_` | `oracle_monitor_` | 183 |

### 7. 错误文档链接 (低优先级)

| 文件路径 | 当前内容 | 建议修改 | 行号 |
|---------|---------|---------|------|
| `src/lib/errors/walletErrors.ts` | `https://docs.insight.oracle/troubleshooting/network-issues` | `https://docs.oracle-monitor.foresight.build/troubleshooting/network-issues` | 92 |
| `src/lib/errors/walletErrors.ts` | `https://docs.insight.oracle/getting-started/wallet-setup` | `https://docs.oracle-monitor.foresight.build/getting-started/wallet-setup` | 126 |

### 8. 测试文件 (低优先级)

| 文件路径 | 当前内容 | 建议修改 | 说明 |
|---------|---------|---------|------|
| `test/InsightOracle.ts` | `InsightOracle` | 保留 | 智能合约名称，不是品牌 |

## 修改优先级说明

### 🔴 高优先级
- 影响用户可见的 URL 和域名
- 影响外部集成的服务名称

### 🟡 中优先级
- 影响内部存储键名（可能导致用户数据丢失）
- 影响监控和日志标识

### 🟢 低优先级
- 文档链接（如果新文档站点未准备好可暂缓）
- 测试文件中的合约名称（不是品牌名）

## 注意事项

1. **LocalStorage 键名修改**会导致用户本地数据丢失，需要考虑：
   - 迁移旧数据到新键名
   - 或保留旧键名作为兼容

2. **Redis key 前缀修改**会导致缓存失效，需要：
   - 清空旧缓存
   - 或保留双写一段时间

3. **全局变量修改**需要确保所有引用处同步修改

4. **文档链接**需要等新文档站点准备好后再修改
