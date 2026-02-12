/**
 * Domain Models - 领域模型统一导出
 */

// 基础架构
export * from './base/Entity';

// 值对象
export {
  Address,
  Price,
  PriceRange,
  OracleConfig,
  HealthStatus,
  TimeRange,
  Money,
} from './oracle/ValueObjects';

// 领域事件
export * from './oracle/Events';

// 聚合根
export * from './oracle/OracleAggregate';

// 仓储
export * from './oracle/OracleRepository';

// 领域服务
export * from './oracle/OracleDomainService';

// 原有模型（保留兼容）
export * from './oracle/Oracle';
export * from './alert/Alert';
export * from './user/User';
export * from './monitoring/Monitoring';
