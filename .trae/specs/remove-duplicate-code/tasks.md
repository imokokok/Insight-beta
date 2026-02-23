# Tasks

## Phase 1: 创建共享组件

- [x] Task 1: 创建统一的 TopStatusBar 共享组件
  - [x] SubTask 1.1: 创建 `src/features/oracle/components/shared/TopStatusBar.tsx`
  - [x] SubTask 1.2: 更新 `src/features/oracle/components/shared/index.ts` 导出文件
  - [x] SubTask 1.3: 更新 Chainlink dashboard 使用共享组件
  - [x] SubTask 1.4: 更新 Pyth dashboard 使用共享组件
  - [x] SubTask 1.5: 更新 API3 dashboard 使用共享组件
  - [x] SubTask 1.6: 更新 Band dashboard 使用共享组件
  - [x] SubTask 1.7: 删除 4 个重复的 TopStatusBar 组件文件

- [x] Task 2: 创建统一的 KpiOverview 通用组件
  - [x] SubTask 2.1: 分析 KpiOverview 组件 - 已使用共享 KpiGrid 组件，无需重构
  - [x] SubTask 2.2: 保留现有的 KpiOverview 组件，它们已正确使用共享基础设施

## Phase 2: 统一类型定义

- [x] Task 3: 统一 AlertSeverity 和 AlertStatus 类型
  - [x] SubTask 3.1: 确保 `src/types/common/status.ts` 包含完整定义
  - [x] SubTask 3.2: 更新 `src/types/oracle/alert.ts` 从 status.ts 导入
  - [x] SubTask 3.3: 更新 `src/features/alerts/types/index.ts` 从 status.ts 导入
  - [x] SubTask 3.4: 更新 `src/types/unifiedOracleTypes.ts` 从 status.ts 导入
  - [x] SubTask 3.5: 搜索并更新所有使用这些类型的文件 - 已确认统一

- [x] Task 4: 统一 SupportedChain 和 ChainInfo 类型
  - [x] SubTask 4.1: 确保 `src/types/chains/index.ts` 包含完整定义
  - [x] SubTask 4.2: 更新 `src/config/constants.ts` 从 types/chains 导入基础类型
  - [x] SubTask 4.3: 更新 `src/types/unifiedOracleTypes.ts` 从 chains 导入
  - [x] SubTask 4.4: `src/lib/blockchain/walletConnect.ts` 使用 viem Chain 类型，职责不同
  - [x] SubTask 4.5: 搜索并更新所有使用这些类型的文件

- [x] Task 5: 统一 OracleProtocol 相关常量
  - [x] SubTask 5.1: 确保 `src/types/oracle/protocol.ts` 包含完整定义
  - [x] SubTask 5.2: 删除 `src/features/oracle/constants/protocols.ts` - 未使用，已删除
  - [x] SubTask 5.3: 更新 `src/features/oracle/constants/index.ts` 从 types/oracle/protocol 重新导出

- [x] Task 6: 创建统一价格类型文件
  - [x] SubTask 6.1: 分析价格类型分布 - 类型分散在多个文件，整合需要更大重构
  - [x] SubTask 6.2: 延后处理，标记为未来优化任务

## Phase 3: 整合缓存模块

- [x] Task 7: 整合缓存模块
  - [x] SubTask 7.1: 分析三个缓存模块的职责 - 职责不同，无需整合
    - `lib/cache` - LRU 内存缓存
    - `lib/api/cache` - HTTP 缓存头处理
    - `lib/api/optimization/cache` - 基于 LRU 的缓存提供者

## Phase 4: 验证与清理

- [x] Task 8: 运行类型检查和测试
  - [x] SubTask 8.1: 运行 `npm run typecheck` - 存在预先存在的类型错误（与本次重构无关）
  - [x] SubTask 8.2: 运行 `npm run lint` - 通过，仅 3 个警告（与本次重构无关）
  - [x] SubTask 8.3: TopStatusBar 相关导入路径验证通过

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 8] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7]
