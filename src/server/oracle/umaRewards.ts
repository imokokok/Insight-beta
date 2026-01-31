import { hasDatabase, query } from '@/server/db';
import { readJsonFile, writeJsonFile } from '@/server/kvStore';
import { memoryNowIso } from '@/server/memoryBackend';

export interface VoterRewardRecord {
  id: string;
  voter: string;
  assertionId: string;
  rewardAmount: string;
  claimed: boolean;
  claimedAt?: string;
  claimDeadline: string;
  chain: string;
  blockNumber: string;
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface StakingRecord {
  id: string;
  voter: string;
  stakedAmount: string;
  pendingRewards: string;
  lastUpdateTime: string;
  cooldownEnd?: string;
  chain: string;
  blockNumber: string;
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlashingRecord {
  id: string;
  voter: string;
  assertionId: string;
  slashAmount: string;
  reason: string;
  timestamp: string;
  chain: string;
  blockNumber: string;
  txHash: string;
  createdAt: string;
}

export interface VoterStats {
  voter: string;
  totalRewards: string;
  totalSlashed: string;
  currentStake: string;
  pendingRewards: string;
  participationRate: number;
  accuracyRate: number;
  totalVotes: number;
  correctVotes: number;
}

const REWARDS_KEY = 'uma_rewards/v1';
const STAKING_KEY = 'uma_staking/v1';
const SLASHING_KEY = 'uma_slashing/v1';

// Helper to get data from KV store
async function getKvData<T>(key: string): Promise<Record<string, T>> {
  const data = await readJsonFile(key);
  return (data as Record<string, T>) || {};
}

/**
 * 保存奖励记录
 */
export async function upsertRewardRecord(
  record: Omit<VoterRewardRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<VoterRewardRecord> {
  const id = `${record.voter}-${record.assertionId}`;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO uma_voter_rewards (
        id, voter, assertion_id, reward_amount, claimed, claimed_at, claim_deadline,
        chain, block_number, tx_hash, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        reward_amount = EXCLUDED.reward_amount,
        claimed = EXCLUDED.claimed,
        claimed_at = EXCLUDED.claimed_at,
        updated_at = EXCLUDED.updated_at
      RETURNING *
      `,
      [
        id,
        record.voter,
        record.assertionId,
        record.rewardAmount,
        record.claimed,
        record.claimedAt || null,
        record.claimDeadline,
        record.chain,
        record.blockNumber,
        record.txHash,
        now,
        now,
      ],
    );
    return formatRewardRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<VoterRewardRecord>(REWARDS_KEY);
    const existing = data[id];
    const newRecord: VoterRewardRecord = {
      ...existing,
      ...record,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    data[id] = newRecord;
    await writeJsonFile(REWARDS_KEY, data);
    return newRecord;
  }
}

/**
 * 保存质押记录
 */
export async function upsertStakingRecord(
  record: Omit<StakingRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<StakingRecord> {
  const id = record.voter;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO uma_staking (
        id, voter, staked_amount, pending_rewards, last_update_time, cooldown_end,
        chain, block_number, tx_hash, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        staked_amount = EXCLUDED.staked_amount,
        pending_rewards = EXCLUDED.pending_rewards,
        last_update_time = EXCLUDED.last_update_time,
        cooldown_end = EXCLUDED.cooldown_end,
        updated_at = EXCLUDED.updated_at
      RETURNING *
      `,
      [
        id,
        record.voter,
        record.stakedAmount,
        record.pendingRewards,
        record.lastUpdateTime,
        record.cooldownEnd || null,
        record.chain,
        record.blockNumber,
        record.txHash,
        now,
        now,
      ],
    );
    return formatStakingRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<StakingRecord>(STAKING_KEY);
    const existing = data[id];
    const newRecord: StakingRecord = {
      ...existing,
      ...record,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    data[id] = newRecord;
    await writeJsonFile(STAKING_KEY, data);
    return newRecord;
  }
}

/**
 * 保存惩罚记录
 */
export async function insertSlashingRecord(
  record: Omit<SlashingRecord, 'id' | 'createdAt'>,
): Promise<SlashingRecord> {
  const id = `${record.voter}-${record.assertionId}-${record.blockNumber}`;
  const now = memoryNowIso();

  if (hasDatabase()) {
    const result = await query(
      `
      INSERT INTO uma_slashing (
        id, voter, assertion_id, slash_amount, reason, timestamp,
        chain, block_number, tx_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
      RETURNING *
      `,
      [
        id,
        record.voter,
        record.assertionId,
        record.slashAmount,
        record.reason,
        record.timestamp,
        record.chain,
        record.blockNumber,
        record.txHash,
        now,
      ],
    );
    if (result.rows.length === 0) {
      const existing = await query('SELECT * FROM uma_slashing WHERE id = $1', [id]);
      return formatSlashingRecord(existing.rows[0] as Record<string, unknown>);
    }
    return formatSlashingRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<SlashingRecord>(SLASHING_KEY);
    if (data[id]) {
      return data[id] as SlashingRecord;
    }
    const newRecord: SlashingRecord = {
      ...record,
      id,
      createdAt: now,
    };
    data[id] = newRecord;
    await writeJsonFile(SLASHING_KEY, data);
    return newRecord;
  }
}

/**
 * 获取投票者的奖励历史
 */
export async function getVoterRewards(
  voter: string,
  options?: { claimed?: boolean; limit?: number; offset?: number },
): Promise<{ records: VoterRewardRecord[]; total: number }> {
  if (hasDatabase()) {
    let sql = 'SELECT * FROM uma_voter_rewards WHERE voter = $1';
    const params: (string | number | boolean)[] = [voter];

    if (options?.claimed !== undefined) {
      sql += ` AND claimed = $${params.length + 1}`;
      params.push(options.claimed);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS t`, params);
    const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await query(sql, params);
    return {
      records: result.rows.map((r) => formatRewardRecord(r as Record<string, unknown>)),
      total,
    };
  } else {
    const data = await getKvData<VoterRewardRecord>(REWARDS_KEY);
    let records = Object.values(data).filter((r) => r.voter === voter);

    if (options?.claimed !== undefined) {
      records = records.filter((r) => r.claimed === options.claimed);
    }

    const total = records.length;

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      records = records.slice(start, end);
    }

    return { records, total };
  }
}

/**
 * 获取投票者的质押信息
 */
export async function getVoterStaking(voter: string): Promise<StakingRecord | null> {
  if (hasDatabase()) {
    const result = await query('SELECT * FROM uma_staking WHERE voter = $1', [voter]);
    if (result.rows.length === 0) return null;
    return formatStakingRecord(result.rows[0] as Record<string, unknown>);
  } else {
    const data = await getKvData<StakingRecord>(STAKING_KEY);
    return data[voter] || null;
  }
}

/**
 * 获取投票者的惩罚历史
 */
export async function getVoterSlashing(
  voter: string,
  options?: { limit?: number; offset?: number },
): Promise<{ records: SlashingRecord[]; total: number }> {
  if (hasDatabase()) {
    let sql = 'SELECT * FROM uma_slashing WHERE voter = $1 ORDER BY timestamp DESC';
    const params: (string | number)[] = [voter];

    const countResult = await query(`SELECT COUNT(*) FROM uma_slashing WHERE voter = $1`, [voter]);
    const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await query(sql, params);
    return {
      records: result.rows.map((r) => formatSlashingRecord(r as Record<string, unknown>)),
      total,
    };
  } else {
    const data = await getKvData<SlashingRecord>(SLASHING_KEY);
    let records = Object.values(data)
      .filter((r) => r.voter === voter)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = records.length;

    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      records = records.slice(start, end);
    }

    return { records, total };
  }
}

/**
 * 获取所有质押者列表
 */
export async function getAllStakers(
  options?: { limit?: number; offset?: number; minStake?: string },
): Promise<{ records: StakingRecord[]; total: number }> {
  if (hasDatabase()) {
    let sql = 'SELECT * FROM uma_staking WHERE 1=1';
    const params: (number | string)[] = [];

    if (options?.minStake) {
      sql += ` AND staked_amount >= $${params.length + 1}`;
      params.push(options.minStake);
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS t`, params);
    const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

    sql += ' ORDER BY staked_amount DESC';

    if (options?.limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await query(sql, params);
    return {
      records: result.rows.map((r) => formatStakingRecord(r as Record<string, unknown>)),
      total,
    };
  } else {
    const data = await getKvData<StakingRecord>(STAKING_KEY);
    let records = Object.values(data);

    if (options?.minStake) {
      const minStake = options.minStake;
      records = records.filter((r) => BigInt(r.stakedAmount) >= BigInt(minStake));
    }

    const total = records.length;

    records.sort((a, b) => (BigInt(b.stakedAmount) > BigInt(a.stakedAmount) ? 1 : -1));

    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      records = records.slice(start, end);
    }

    return { records, total };
  }
}

/**
 * 计算投票者统计
 */
export async function calculateVoterStats(voter: string): Promise<VoterStats> {
  const [rewards, staking, slashing] = await Promise.all([
    getVoterRewards(voter),
    getVoterStaking(voter),
    getVoterSlashing(voter),
  ]);

  const totalRewards = rewards.records
    .filter((r) => r.claimed)
    .reduce((sum, r) => sum + BigInt(r.rewardAmount), 0n);

  const totalSlashed = slashing.records.reduce((sum, s) => sum + BigInt(s.slashAmount), 0n);

  // Calculate accuracy rate based on slashing vs rewards
  const totalVotes = rewards.records.length + slashing.records.length;
  const correctVotes = rewards.records.filter((r) => r.claimed).length;
  const accuracyRate = totalVotes > 0 ? correctVotes / totalVotes : 0;

  return {
    voter,
    totalRewards: totalRewards.toString(),
    totalSlashed: totalSlashed.toString(),
    currentStake: staking?.stakedAmount || '0',
    pendingRewards: staking?.pendingRewards || '0',
    participationRate: totalVotes > 0 ? Math.min(1, totalVotes / 100) : 0, // Simplified
    accuracyRate,
    totalVotes,
    correctVotes,
  };
}

/**
 * 获取奖励统计
 */
export async function getRewardsStats(): Promise<{
  totalRewardsDistributed: string;
  totalStaked: string;
  totalSlashed: string;
  activeStakers: number;
  averageStake: string;
}> {
  if (hasDatabase()) {
    const [rewardsResult, stakingResult, slashingResult] = await Promise.all([
      query('SELECT COALESCE(SUM(reward_amount), 0) as total FROM uma_voter_rewards WHERE claimed = true'),
      query('SELECT COALESCE(SUM(staked_amount), 0) as total, COUNT(*) as count FROM uma_staking'),
      query('SELECT COALESCE(SUM(slash_amount), 0) as total FROM uma_slashing'),
    ]);

    const totalRewards = (rewardsResult.rows[0] as { total: string | number }).total;
    const totalStaked = (stakingResult.rows[0] as { total: string | number }).total;
    const activeStakers = parseInt((stakingResult.rows[0] as { count: string }).count, 10);
    const totalSlashed = (slashingResult.rows[0] as { total: string | number }).total;

    return {
      totalRewardsDistributed: totalRewards.toString(),
      totalStaked: totalStaked.toString(),
      totalSlashed: totalSlashed.toString(),
      activeStakers,
      averageStake: activeStakers > 0 ? (BigInt(totalStaked.toString()) / BigInt(activeStakers)).toString() : '0',
    };
  } else {
    const rewardsData = await getKvData<VoterRewardRecord>(REWARDS_KEY);
    const stakingData = await getKvData<StakingRecord>(STAKING_KEY);
    const slashingData = await getKvData<SlashingRecord>(SLASHING_KEY);

    const totalRewards = Object.values(rewardsData)
      .filter((r) => r.claimed)
      .reduce((sum, r) => sum + BigInt(r.rewardAmount), 0n);

    const totalStaked = Object.values(stakingData).reduce(
      (sum, s) => sum + BigInt(s.stakedAmount),
      0n,
    );

    const totalSlashed = Object.values(slashingData).reduce(
      (sum, s) => sum + BigInt(s.slashAmount),
      0n,
    );

    const activeStakers = Object.keys(stakingData).length;

    return {
      totalRewardsDistributed: totalRewards.toString(),
      totalStaked: totalStaked.toString(),
      totalSlashed: totalSlashed.toString(),
      activeStakers,
      averageStake: activeStakers > 0 ? (totalStaked / BigInt(activeStakers)).toString() : '0',
    };
  }
}

// Helper functions to format database rows
function formatRewardRecord(row: Record<string, unknown>): VoterRewardRecord {
  return {
    id: String(row.id),
    voter: String(row.voter || row.voter_address),
    assertionId: String(row.assertion_id || row.assertionId),
    rewardAmount: String(row.reward_amount || row.rewardAmount),
    claimed: Boolean(row.claimed),
    claimedAt: row.claimed_at ? String(row.claimed_at) : undefined,
    claimDeadline: String(row.claim_deadline || row.claimDeadline),
    chain: String(row.chain),
    blockNumber: String(row.block_number || row.blockNumber),
    txHash: String(row.tx_hash || row.txHash),
    createdAt: String(row.created_at || row.createdAt),
    updatedAt: String(row.updated_at || row.updatedAt),
  };
}

function formatStakingRecord(row: Record<string, unknown>): StakingRecord {
  return {
    id: String(row.id),
    voter: String(row.voter || row.voter_address),
    stakedAmount: String(row.staked_amount || row.stakedAmount),
    pendingRewards: String(row.pending_rewards || row.pendingRewards),
    lastUpdateTime: String(row.last_update_time || row.lastUpdateTime),
    cooldownEnd: row.cooldown_end ? String(row.cooldown_end) : undefined,
    chain: String(row.chain),
    blockNumber: String(row.block_number || row.blockNumber),
    txHash: String(row.tx_hash || row.txHash),
    createdAt: String(row.created_at || row.createdAt),
    updatedAt: String(row.updated_at || row.updatedAt),
  };
}

function formatSlashingRecord(row: Record<string, unknown>): SlashingRecord {
  return {
    id: String(row.id),
    voter: String(row.voter || row.voter_address),
    assertionId: String(row.assertion_id || row.assertionId),
    slashAmount: String(row.slash_amount || row.slashAmount),
    reason: String(row.reason),
    timestamp: String(row.timestamp),
    chain: String(row.chain),
    blockNumber: String(row.block_number || row.blockNumber),
    txHash: String(row.tx_hash || row.txHash),
    createdAt: String(row.created_at || row.createdAt),
  };
}
