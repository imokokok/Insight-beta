/**
 * Oracle Indexer 模块（向后兼容代理）
 *
 * @deprecated 此文件已重构，请直接从 '@/server/oracleIndexer' 导入
 * 新模块结构：
 * - constants.ts - 常量定义
 * - types.ts - 类型定义
 * - rpcClient.ts - RPC 客户端管理
 * - rpcStats.ts - RPC 统计管理
 * - env.ts - 环境配置
 * - syncState.ts - 同步状态管理
 * - syncCore.ts - 同步核心逻辑
 * - index.ts - 统一入口
 *
 * 示例：
 * ```typescript
 * // 旧方式（仍兼容）
 * import { syncOracleOnce } from '@/server/oracleIndexer';
 *
 * // 新方式（推荐）
 * import { syncOracleOnce } from '@/server/oracleIndexer/index';
 * ```
 */

// 重新导出所有内容以保持向后兼容
export * from './oracleIndexer/index';
