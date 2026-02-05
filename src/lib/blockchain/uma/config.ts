import type { UMAOracleConfig } from './types';
import { getRpcUrl, getFinderAddress, getOOAddress, CHAIN_CONFIGS } from './utils';

export function createUMAOracleConfig(
  chainId: number,
  overrides?: Partial<UMAOracleConfig>,
): UMAOracleConfig {
  const chainConfig = CHAIN_CONFIGS[chainId];
  if (!chainConfig) {
    return {
      chainId,
      chainName: `Chain ${chainId}`,
      rpcUrl: getRpcUrl('UNKNOWN'),
      finderAddress: getFinderAddress('UNKNOWN'),
      defaultIdentifier: 'UMIP-128',
    } as UMAOracleConfig;
  }

  const config: UMAOracleConfig = {
    chainId,
    chainName: chainConfig.name,
    rpcUrl: getRpcUrl(chainConfig.key),
    finderAddress: getFinderAddress(chainConfig.key),
    optimisticOracleV3Address: getOOAddress(chainConfig.key, 'v3') || chainConfig.ooV3,
    optimisticOracleV2Address: getOOAddress(chainConfig.key, 'v2') || chainConfig.ooV2,
    defaultIdentifier: 'UMIP-128',
  };

  return {
    ...config,
    ...overrides,
  } as UMAOracleConfig;
}
