/**
 * UMA Protocol Module - UMA 协议模块
 *
 * 基于新架构的 UMA 预言机客户端
 * 支持价格请求、断言和争议机制
 */

export {
  UMAOracleClient,
  createUMAClient,
  isUMASupportedOnChain,
  getUMAContractAddresses,
} from './UMAOracleClient';

export type { UMAPriceRequest, UMAAssertion } from './UMAOracleClient';
