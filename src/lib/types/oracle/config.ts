/**
 * Config Types - 预言机配置相关类型定义
 */

import type { SupportedChain } from './chain';
import type { OracleProtocol } from './protocol';

export type OracleConfig = {
  rpcUrl: string;
  rpcUrls?: string[];
  chain: SupportedChain;
  contractAddress?: string;
  contractAddresses?: Record<string, string>;
  startBlock?: number;
  maxBlockRange?: number;
  confirmationBlocks?: number;
  syncIntervalMs?: number;
  votingPeriodHours?: number;
  protocolConfig?: ProtocolSpecificConfig;
  apiKey?: string;
  adminToken?: string;
};

export type OracleConfigPatch = Partial<
  Pick<
    OracleConfig,
    | 'rpcUrl'
    | 'contractAddress'
    | 'chain'
    | 'startBlock'
    | 'maxBlockRange'
    | 'votingPeriodHours'
    | 'confirmationBlocks'
  >
>;

export type OracleConfigField = keyof OracleConfigPatch;

export type ProtocolSpecificConfig =
  | UMAProtocolConfig
  | ChainlinkProtocolConfig
  | PythProtocolConfig
  | BandProtocolConfig
  | API3ProtocolConfig
  | RedStoneProtocolConfig
  | FluxProtocolConfig
  | DIAProtocolConfig;

export type UMAProtocolConfig = {
  optimisticOracleV2Address?: string;
  optimisticOracleV3Address?: string;
  votingPeriodHours?: number;
};

export type ChainlinkProtocolConfig = {
  dataFeedAddress?: string;
  registryAddress?: string;
  linkTokenAddress?: string;
  heartbeat?: number;
  deviationThreshold?: number;
  decimals?: number;
  description?: string;
};

export type PythProtocolConfig = {
  pythContractAddress?: string;
  priceFeedIds?: string[];
  stalenessThreshold?: number;
};

export type BandProtocolConfig = {
  endpoint?: string;
  dataSource?: string;
};

export type API3ProtocolConfig = {
  airnodeAddress?: string;
  endpointId?: string;
  sponsorAddress?: string;
};

export type RedStoneProtocolConfig = {
  feedIds?: string[];
  apiEndpoint?: string;
  stalenessThreshold?: number;
};

export type FluxProtocolConfig = {
  feedId?: string;
  apiEndpoint?: string;
  roundId?: bigint;
};

export type DIAProtocolConfig = {
  assets?: string[];
  apiEndpoint?: string;
};

export type OracleInstance = {
  id: string;
  name: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  enabled: boolean;
  config: OracleConfig;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ConfigTemplate = {
  id: string;
  name: string;
  description?: string;
  protocol: OracleProtocol;
  config: Partial<OracleConfig>;
  supportedChains: SupportedChain[];
  requirements?: string[];
  isDefault: boolean;
  isOfficial: boolean;
  author?: string;
  usageCount: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
};

export type BatchConfigUpdate = {
  instanceId: string;
  config: Partial<OracleConfig>;
};

export type BatchUpdateResult = {
  success: string[];
  failed: Array<{ instanceId: string; error: string }>;
};
