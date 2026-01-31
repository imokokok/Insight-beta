import { createDVMRewardsClient } from '@/lib/blockchain/umaDvmRewards';
import { readUMAConfig, DEFAULT_UMA_INSTANCE_ID } from './umaConfig';
import {
  upsertRewardRecord,
  upsertStakingRecord,
  insertSlashingRecord,
  getRewardsStats,
} from './umaRewards';
import { getUMASyncState } from './umaState';
import { parseRpcUrls } from '@/lib/utils';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

interface RewardsSyncConfig {
  instanceId: string;
  chainId: number;
  rpcUrl: string;
  dvmAddress: string;
  votingTokenAddress: string;
}

/**
 * 同步 DVM 奖励和惩罚事件
 */
export async function syncDVMEvents(instanceId: string = DEFAULT_UMA_INSTANCE_ID): Promise<{
  rewardsSynced: number;
  stakingSynced: number;
  slashingSynced: number;
}> {
  const config = await getRewardsSyncConfig(instanceId);
  if (!config) {
    logger.warn('DVM rewards sync skipped: no config', { instanceId });
    return { rewardsSynced: 0, stakingSynced: 0, slashingSynced: 0 };
  }

  const syncState = await getUMASyncState(instanceId);
  const lastProcessedBlock = syncState.lastProcessedBlock;

  try {
    const client = createDVMRewardsClient(config.chainId, config.rpcUrl, {
      dvm: config.dvmAddress as `0x${string}`,
      votingToken: config.votingTokenAddress as `0x${string}`,
    });

    // Get current block
    // Note: We need to add getBlockNumber to DVMRewardsClient
    // For now, use a fixed range or get it from umaSync state
    const currentBlock = lastProcessedBlock + 1000n; // Assume we process up to 1000 blocks ahead
    const fromBlock = lastProcessedBlock > 0n ? lastProcessedBlock + 1n : 0n;
    const toBlock = currentBlock;

    if (fromBlock > toBlock) {
      logger.debug('DVM rewards sync: no new blocks', { instanceId, fromBlock, toBlock });
      return { rewardsSynced: 0, stakingSynced: 0, slashingSynced: 0 };
    }

    logger.info('Starting DVM rewards sync', {
      instanceId,
      fromBlock: String(fromBlock),
      toBlock: String(toBlock),
    });

    const events = await client.getRewardEvents(fromBlock, toBlock);

    // Process claimed rewards
    let rewardsSynced = 0;
    for (const claimed of events.claimed) {
      await upsertRewardRecord({
        voter: claimed.voter,
        assertionId: claimed.assertionId,
        rewardAmount: claimed.amount.toString(),
        claimed: true,
        claimedAt: new Date().toISOString(),
        claimDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        chain: config.chainId.toString(),
        blockNumber: claimed.blockNumber.toString(),
        txHash: claimed.txHash,
      });
      rewardsSynced++;
    }

    // Process staking events
    let stakingSynced = 0;
    for (const staked of events.staked) {
      await upsertStakingRecord({
        voter: staked.voter,
        stakedAmount: staked.amount.toString(),
        pendingRewards: '0',
        lastUpdateTime: new Date().toISOString(),
        chain: config.chainId.toString(),
        blockNumber: staked.blockNumber.toString(),
        txHash: staked.txHash,
      });
      stakingSynced++;
    }

    for (const withdrawn of events.withdrawn) {
      // Update staking record with reduced amount
      const existing = await getStakingForSync(withdrawn.voter);
      if (existing) {
        const currentStake = BigInt(existing.stakedAmount);
        const withdrawAmount = BigInt(withdrawn.amount);
        const newStake = currentStake > withdrawAmount ? currentStake - withdrawAmount : 0n;

        await upsertStakingRecord({
          voter: withdrawn.voter,
          stakedAmount: newStake.toString(),
          pendingRewards: existing.pendingRewards,
          lastUpdateTime: new Date().toISOString(),
          chain: config.chainId.toString(),
          blockNumber: withdrawn.blockNumber.toString(),
          txHash: withdrawn.txHash,
        });
        stakingSynced++;
      }
    }

    // Process slashing events
    let slashingSynced = 0;
    for (const slashed of events.slashed) {
      await insertSlashingRecord({
        voter: slashed.voter,
        assertionId: slashed.assertionId,
        slashAmount: slashed.amount.toString(),
        reason: slashed.reason,
        timestamp: new Date().toISOString(),
        chain: config.chainId.toString(),
        blockNumber: slashed.blockNumber.toString(),
        txHash: slashed.txHash,
      });
      slashingSynced++;
    }

    logger.info('DVM rewards sync completed', {
      instanceId,
      rewardsSynced,
      stakingSynced,
      slashingSynced,
    });

    return { rewardsSynced, stakingSynced, slashingSynced };
  } catch (error) {
    logger.error('DVM rewards sync failed', { error, instanceId });
    throw error;
  }
}

/**
 * 获取质押信息（用于同步）
 */
async function getStakingForSync(voter: string): Promise<{
  stakedAmount: string;
  pendingRewards: string;
} | null> {
  // Import dynamically to avoid circular dependency
  const { getVoterStaking } = await import('./umaRewards');
  return getVoterStaking(voter);
}

/**
 * 获取奖励同步配置
 */
async function getRewardsSyncConfig(instanceId: string): Promise<RewardsSyncConfig | null> {
  try {
    const umaConfig = await readUMAConfig(instanceId);
    if (!umaConfig) return null;

    const chain = umaConfig.chain || 'Ethereum';
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();

    // Get RPC URL
    const envKey = `UMA_${chainKey}_RPC_URL`;
    const rpcUrl = (env[envKey as keyof typeof env] as string) || umaConfig.rpcUrl;
    if (!rpcUrl) return null;

    // Get DVM address
    const dvmEnvKey = `UMA_${chainKey}_DVM_ADDRESS`;
    const dvmAddress = (env[dvmEnvKey as keyof typeof env] as string) || '';
    if (!dvmAddress) return null;

    // Get voting token address
    const tokenEnvKey = `UMA_${chainKey}_VOTING_TOKEN_ADDRESS`;
    const votingTokenAddress =
      (env[tokenEnvKey as keyof typeof env] as string) ||
      '0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828'; // Default UMA token

    const chainIds: Record<string, number> = {
      Ethereum: 1,
      Polygon: 137,
      Arbitrum: 42161,
      Optimism: 10,
      Base: 8453,
      PolygonAmoy: 80002,
    };

    return {
      instanceId,
      chainId: chainIds[chain] || 1,
      rpcUrl: parseRpcUrls(rpcUrl)[0] || rpcUrl,
      dvmAddress,
      votingTokenAddress,
    };
  } catch (error) {
    logger.error('Failed to get rewards sync config', { error, instanceId });
    return null;
  }
}

/**
 * 获取奖励统计摘要
 */
export async function getRewardsSummary(instanceId: string = DEFAULT_UMA_INSTANCE_ID): Promise<{
  totalRewardsDistributed: string;
  totalStaked: string;
  totalSlashed: string;
  activeStakers: number;
  averageStake: string;
  syncStatus: 'synced' | 'syncing' | 'error';
  lastSyncAt: string | null;
}> {
  const [stats, syncState] = await Promise.all([getRewardsStats(), getUMASyncState(instanceId)]);

  return {
    ...stats,
    syncStatus: syncState.sync.lastError ? 'error' : 'synced',
    lastSyncAt: syncState.sync.lastSuccessAt,
  };
}
