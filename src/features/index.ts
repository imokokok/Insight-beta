/**
 * Features Module - 桥接层
 *
 * 本文件作为 Feature-Based Architecture 的桥接层。
 *
 * 架构原则：
 * - 新功能使用 features/[domain]/ 结构
 * - 现有代码保持不变
 * - 通过本文件统一导出，便于未来迁移
 *
 * 目录结构规范：
 * features/
 * ├── oracle/         # Oracle 监控
 * ├── alerts/         # 告警系统
 * ├── security/       # 安全监控
 * ├── gas/           # Gas 价格
 * ├── cross-chain/   # 跨链
 * ├── wallet/        # 钱包连接
 * ├── dispute/       # 争议
 * ├── dashboard/     # 仪表盘
 * ├── protocol/      # 协议
 * ├── monitoring/    # 监控
 * ├── comparison/    # 对比
 * ├── onboarding/    # 新手引导
 * └── common/        # 通用功能
 */

export {};

/**
 * 使用说明：
 *
 * 1. 从现有位置导入（当前）：
 *    import { useOracleData } from '@/hooks/useOracle';
 *    import { OracleList } from '@/features/oracle/OracleList';
 *
 * 2. 未来从 features 导入（迁移后）：
 *    import { useOracleData, OracleList } from '@/features/oracle';
 *
 * 迁移状态：
 * - Oracle: 待迁移
 * - Alerts: 待迁移
 * - Security: 待迁移
 * - Gas: 待迁移
 * - Cross-chain: 待迁移
 * - Wallet: 待迁移
 * - Dispute: 待迁移
 * - Dashboard: 待迁移
 * - Protocol: 待迁移
 * - Monitoring: 待迁移
 * - Comparison: 待迁移
 * - Onboarding: 待迁移
 */
