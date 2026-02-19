/**
 * UMA Module Exports
 *
 * 导出 UMA 客户端（只读）
 */

export { UMA_OPTIMISTIC_ORACLE_V3_ABI } from './abi';

export {
  UMAClient,
  createUMAClient,
  isChainSupportedByUMA,
  getSupportedUMAChains,
  getUMAContractAddresses,
  UMA_CONTRACT_ADDRESSES,
  type OnChainUMAAssertion,
  type OnChainUMADispute,
  type DisputeStatus,
  type UMAHealthStatus,
  type UMAProtocolConfig,
  type UMAAssertionEvent,
  type UMADisputeEvent,
  type UMASettlementEvent,
  type DisputeDetails,
  type UMAAssertion,
  type UMADispute,
  type UMAChain,
  type UMAAssertionStatus,
  type UMADisputeStatus,
  type UMAVote,
  type UMAConfig,
  type UMAStats,
} from '../umaOracle';
