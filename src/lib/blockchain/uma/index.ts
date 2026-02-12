/**
 * UMA Module Exports
 *
 * 导出 UMA 客户端和交易客户端
 */

export { UMA_OPTIMISTIC_ORACLE_V3_ABI } from './abi';

export {
  UMAClient,
  createUMAClient,
  isChainSupportedByUMA,
  getSupportedUMAChains,
  getUMAContractAddresses,
  UMA_CONTRACT_ADDRESSES,
  type UMAAssertion,
  type UMADispute,
  type DisputeStatus,
  type UMAHealthStatus,
  type UMAProtocolConfig,
  type UMAAssertionEvent,
  type UMADisputeEvent,
  type UMASettlementEvent,
  type DisputeDetails,
} from '../umaOracle';

export {
  UMATransactionClient,
  createUMATransactionClient,
  encodeAssertTruthCall,
  encodeDisputeAssertionCall,
  encodeSettleAssertionCall,
  calculateRequiredBond,
  type AssertTruthParams,
  type DisputeAssertionParams,
  type SettleAssertionParams,
  type UMATransactionResult,
  type UMATransactionClientConfig,
} from '../umaTransaction';
