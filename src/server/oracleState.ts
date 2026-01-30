/**
 * Oracle State 模块（向后兼容代理）
 *
 * @deprecated 此文件已重构，请直接从 '@/server/oracleState' 导入
 * 新模块结构：
 * - constants.ts - 常量定义
 * - types.ts - 类型定义
 * - utils.ts - 工具函数
 * - memory.ts - 内存管理
 * - operations.ts - 核心操作
 * - eventReplay.ts - 事件回放
 * - index.ts - 统一入口
 *
 * 示例：
 * ```typescript
 * // 旧方式（仍兼容）
 * import { readOracleState } from '@/server/oracleState';
 *
 * // 新方式（推荐）
 * import { readOracleState } from '@/server/oracleState/index';
 * ```
 */

// 重新导出所有内容以保持向后兼容
export * from './oracleState/index';
