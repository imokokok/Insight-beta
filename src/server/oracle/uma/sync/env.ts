import type { Address } from 'viem';
import { readUMAConfig, DEFAULT_UMA_INSTANCE_ID } from '../../umaConfig';
import { env } from '@/lib/config/env';
import type { UMAEnv } from './types';

export async function getUMAEnv(instanceId: string = DEFAULT_UMA_INSTANCE_ID): Promise<UMAEnv> {
  const config = await readUMAConfig(instanceId);
  if (!config) {
    throw new Error(`UMA config not found for instance: ${instanceId}`);
  }
  const chain = config.chain || 'Ethereum';

  const getRpcUrl = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_RPC_URL`;
    return (env[envKey as keyof typeof env] as string) || config.rpcUrl || '';
  };

  const getOOv2Address = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_V2_ADDRESS`;
    const envAddr = env[envKey as keyof typeof env] as string;
    if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) return envAddr as Address;
    return (config.optimisticOracleV2Address || config.optimisticOracleV3Address) as
      | Address
      | undefined;
  };

  const getOOv3Address = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_V3_ADDRESS`;
    const envAddr = env[envKey as keyof typeof env] as string;
    if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) return envAddr as Address;
    return config.optimisticOracleV3Address as Address | undefined;
  };

  return {
    rpcUrl: getRpcUrl(),
    ooV2Address: getOOv2Address(),
    ooV3Address: getOOv3Address(),
    chain: chain as UMAEnv['chain'],
    startBlock: BigInt(config.startBlock ?? 0),
    maxBlockRange: BigInt(config.maxBlockRange ?? 10_000),
    votingPeriodMs: Number(config.votingPeriodHours ?? 72) * 3600 * 1000,
    confirmationBlocks: BigInt(config.confirmationBlocks ?? 12),
  };
}
