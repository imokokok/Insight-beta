/**
 * Universal Oracle Database Schema
 *
 * 通用预言机数据库表定义
 * 支持多协议乐观预言机和价格预言机
 */

import type { TableDefinition, IndexDefinition, QueryFn } from './types';

// ============================================================================
// 通用协议配置表
// ============================================================================
export const universalOracleConfig: TableDefinition = {
  name: 'oracle_protocol_config',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_protocol_config (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL, -- 'uma', 'insight', 'chainlink', 'pyth'
      chain TEXT NOT NULL,
      name TEXT NOT NULL,
      rpc_url TEXT,
      
      -- 合约地址 (JSONB存储不同协议的合约地址)
      contract_addresses JSONB DEFAULT '{}',
      
      -- 配置参数
      start_block BIGINT DEFAULT 0,
      max_block_range INTEGER DEFAULT 10000,
      voting_period_hours INTEGER DEFAULT 72,
      confirmation_blocks INTEGER DEFAULT 12,
      
      -- 协议特定配置
      protocol_config JSONB DEFAULT '{}',
      
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain)
    )
  `,
};

// ============================================================================
// 通用同步状态表
// ============================================================================
export const universalSyncState: TableDefinition = {
  name: 'oracle_protocol_sync_state',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_protocol_sync_state (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      
      -- 同步状态
      last_processed_block BIGINT DEFAULT 0,
      latest_block BIGINT,
      safe_block BIGINT,
      last_success_processed_block BIGINT,
      consecutive_failures INTEGER DEFAULT 0,
      
      -- RPC状态
      rpc_active_url TEXT,
      rpc_stats JSONB,
      
      -- 时间戳
      last_attempt_at TIMESTAMP WITH TIME ZONE,
      last_success_at TIMESTAMP WITH TIME ZONE,
      last_duration_ms INTEGER,
      last_error TEXT,
      
      -- 统计
      total_synced INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain, instance_id)
    )
  `,
};

// ============================================================================
// 通用断言表 (支持所有乐观预言机协议)
// ============================================================================
export const universalAssertions: TableDefinition = {
  name: 'oracle_assertions',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_assertions (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL, -- 'uma', 'insight'
      chain TEXT NOT NULL,
      instance_id TEXT NOT NULL DEFAULT 'default',
      
      -- 断言标识
      assertion_id TEXT NOT NULL,
      identifier TEXT,
      claim TEXT,
      
      -- 提议信息
      proposer TEXT NOT NULL,
      proposed_value NUMERIC,
      reward NUMERIC,
      bond NUMERIC,
      currency TEXT,
      
      -- 争议信息
      disputer TEXT,
      dispute_bond NUMERIC,
      
      -- 解决信息
      settlement_value NUMERIC,
      resolution_result BOOLEAN,
      
      -- 时间戳
      proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
      expiration_at TIMESTAMP WITH TIME ZONE,
      disputed_at TIMESTAMP WITH TIME ZONE,
      settled_at TIMESTAMP WITH TIME ZONE,
      
      -- 状态
      status TEXT NOT NULL, -- 'pending', 'disputed', 'resolved', 'expired'
      
      -- 区块链元数据
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      log_index INTEGER NOT NULL,
      
      -- 协议版本和特定数据
      version TEXT NOT NULL DEFAULT 'v1',
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain, assertion_id)
    )
  `,
};

// ============================================================================
// 通用争议表
// ============================================================================
export const universalDisputes: TableDefinition = {
  name: 'oracle_disputes',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_disputes (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      instance_id TEXT NOT NULL DEFAULT 'default',
      
      -- 关联断言
      assertion_id TEXT NOT NULL,
      assertion_uuid TEXT REFERENCES oracle_assertions(id),
      
      -- 争议标识
      dispute_id TEXT,
      identifier TEXT,
      ancillary_data TEXT,
      
      -- 争议方
      disputer TEXT NOT NULL,
      dispute_bond NUMERIC NOT NULL,
      
      -- 投票信息
      voting_ends_at TIMESTAMP WITH TIME ZONE,
      current_votes_for NUMERIC DEFAULT 0,
      current_votes_against NUMERIC DEFAULT 0,
      total_votes NUMERIC DEFAULT 0,
      
      -- 状态
      status TEXT NOT NULL, -- 'pending', 'resolved'
      resolution_result BOOLEAN,
      
      -- 区块链元数据
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      log_index INTEGER NOT NULL,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `,
};

// ============================================================================
// 通用投票表
// ============================================================================
export const universalVotes: TableDefinition = {
  name: 'oracle_votes',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_votes (
      id BIGSERIAL PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      instance_id TEXT NOT NULL DEFAULT 'default',
      
      -- 关联断言
      assertion_id TEXT NOT NULL,
      assertion_uuid TEXT REFERENCES oracle_assertions(id),
      
      -- 投票信息
      voter TEXT NOT NULL,
      support BOOLEAN NOT NULL,
      weight NUMERIC DEFAULT 0,
      
      -- 区块链元数据
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      log_index INTEGER NOT NULL,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain, tx_hash, log_index)
    )
  `,
};

// ============================================================================
// 通用价格源表 (支持所有价格预言机协议)
// ============================================================================
export const universalPriceFeeds: TableDefinition = {
  name: 'oracle_price_feeds',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_price_feeds (
      id BIGSERIAL PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL, -- 'chainlink', 'pyth', 'redstone', 'uma'
      chain TEXT NOT NULL,
      instance_id TEXT NOT NULL DEFAULT 'default',
      
      -- 价格对
      pair TEXT NOT NULL, -- 'ETH/USD'
      base_asset TEXT NOT NULL,
      quote_asset TEXT NOT NULL,
      
      -- 价格数据
      price NUMERIC NOT NULL,
      decimals INTEGER DEFAULT 8,
      confidence NUMERIC, -- 置信度 (0-100)
      
      -- 时间戳
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      block_number BIGINT,
      round_id TEXT,
      
      -- 合约信息
      contract_address TEXT,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain, pair, timestamp)
    )
  `,
};

// ============================================================================
// 通用奖励表
// ============================================================================
export const universalRewards: TableDefinition = {
  name: 'oracle_rewards',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_rewards (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      
      -- 奖励接收方
      recipient TEXT NOT NULL,
      recipient_type TEXT NOT NULL, -- 'voter', 'proposer', 'disputer'
      
      -- 关联数据
      assertion_id TEXT,
      dispute_id TEXT,
      
      -- 奖励信息
      reward_amount NUMERIC NOT NULL DEFAULT 0,
      reward_token TEXT,
      
      -- 状态
      claimed BOOLEAN NOT NULL DEFAULT false,
      claimed_at TIMESTAMP WITH TIME ZONE,
      claim_deadline TIMESTAMP WITH TIME ZONE,
      
      -- 区块链元数据
      tx_hash TEXT,
      block_number BIGINT,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `,
};

// ============================================================================
// 通用质押表
// ============================================================================
export const universalStaking: TableDefinition = {
  name: 'oracle_staking',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_staking (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      
      -- 质押者
      staker TEXT NOT NULL,
      
      -- 质押信息
      staked_amount NUMERIC NOT NULL DEFAULT 0,
      staked_token TEXT,
      pending_rewards NUMERIC NOT NULL DEFAULT 0,
      
      -- 时间戳
      last_update_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      cooldown_end TIMESTAMP WITH TIME ZONE,
      
      -- 区块链元数据
      tx_hash TEXT,
      block_number BIGINT,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      UNIQUE(protocol, chain, staker)
    )
  `,
};

// ============================================================================
// 通用惩罚表
// ============================================================================
export const universalSlashing: TableDefinition = {
  name: 'oracle_slashing',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_slashing (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      
      -- 被惩罚者
      slashed_entity TEXT NOT NULL,
      entity_type TEXT NOT NULL, -- 'voter', 'proposer', 'validator'
      
      -- 关联数据
      assertion_id TEXT,
      dispute_id TEXT,
      
      -- 惩罚信息
      slash_amount NUMERIC NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      
      -- 时间戳
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      
      -- 区块链元数据
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `,
};

// ============================================================================
// 通用TVL表
// ============================================================================
export const universalTVL: TableDefinition = {
  name: 'oracle_tvl',
  sql: `
    CREATE TABLE IF NOT EXISTS oracle_tvl (
      id TEXT PRIMARY KEY,
      protocol VARCHAR(50) NOT NULL,
      chain TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      
      -- TVL数据
      total_staked NUMERIC NOT NULL DEFAULT 0,
      total_bonded NUMERIC NOT NULL DEFAULT 0,
      total_rewards NUMERIC NOT NULL DEFAULT 0,
      oracle_tvl NUMERIC NOT NULL DEFAULT 0,
      
      -- 活跃数据
      active_assertions INTEGER NOT NULL DEFAULT 0,
      active_disputes INTEGER NOT NULL DEFAULT 0,
      
      -- 时间戳
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      
      -- 协议特定数据
      protocol_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `,
};

// ============================================================================
// 表列表
// ============================================================================
export const universalOracleTables: TableDefinition[] = [
  universalOracleConfig,
  universalSyncState,
  universalAssertions,
  universalDisputes,
  universalVotes,
  universalPriceFeeds,
  universalRewards,
  universalStaking,
  universalSlashing,
  universalTVL,
];

// ============================================================================
// 索引定义
// ============================================================================
export const universalOracleIndexes: IndexDefinition[] = [
  // 配置表索引
  {
    name: 'idx_oracle_config_protocol_chain',
    table: 'oracle_protocol_config',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_config_protocol_chain ON oracle_protocol_config(protocol, chain)',
  },
  {
    name: 'idx_oracle_config_enabled',
    table: 'oracle_protocol_config',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_config_enabled ON oracle_protocol_config(enabled)',
  },

  // 同步状态表索引
  {
    name: 'idx_oracle_sync_protocol_chain',
    table: 'oracle_protocol_sync_state',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_sync_protocol_chain ON oracle_protocol_sync_state(protocol, chain)',
  },
  {
    name: 'idx_oracle_sync_instance',
    table: 'oracle_protocol_sync_state',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_sync_instance ON oracle_protocol_sync_state(instance_id)',
  },

  // 断言表索引
  {
    name: 'idx_oracle_assertions_protocol',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_protocol ON oracle_assertions(protocol)',
  },
  {
    name: 'idx_oracle_assertions_chain',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_chain ON oracle_assertions(chain)',
  },
  {
    name: 'idx_oracle_assertions_status',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_status ON oracle_assertions(status)',
  },
  {
    name: 'idx_oracle_assertions_proposer',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_proposer ON oracle_assertions(proposer)',
  },
  {
    name: 'idx_oracle_assertions_proposed_at',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_proposed_at ON oracle_assertions(proposed_at DESC)',
  },
  {
    name: 'idx_oracle_assertions_protocol_chain',
    table: 'oracle_assertions',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_assertions_protocol_chain ON oracle_assertions(protocol, chain)',
  },

  // 争议表索引
  {
    name: 'idx_oracle_disputes_protocol',
    table: 'oracle_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_disputes_protocol ON oracle_disputes(protocol)',
  },
  {
    name: 'idx_oracle_disputes_assertion',
    table: 'oracle_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_disputes_assertion ON oracle_disputes(assertion_id)',
  },
  {
    name: 'idx_oracle_disputes_status',
    table: 'oracle_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_disputes_status ON oracle_disputes(status)',
  },
  {
    name: 'idx_oracle_disputes_disputer',
    table: 'oracle_disputes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_disputes_disputer ON oracle_disputes(disputer)',
  },

  // 投票表索引
  {
    name: 'idx_oracle_votes_protocol',
    table: 'oracle_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_votes_protocol ON oracle_votes(protocol)',
  },
  {
    name: 'idx_oracle_votes_assertion',
    table: 'oracle_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_votes_assertion ON oracle_votes(assertion_id)',
  },
  {
    name: 'idx_oracle_votes_voter',
    table: 'oracle_votes',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_votes_voter ON oracle_votes(voter)',
  },

  // 价格表索引
  {
    name: 'idx_oracle_prices_protocol',
    table: 'oracle_price_feeds',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_prices_protocol ON oracle_price_feeds(protocol)',
  },
  {
    name: 'idx_oracle_prices_pair',
    table: 'oracle_price_feeds',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_prices_pair ON oracle_price_feeds(pair)',
  },
  {
    name: 'idx_oracle_prices_timestamp',
    table: 'oracle_price_feeds',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_prices_timestamp ON oracle_price_feeds(timestamp DESC)',
  },
  {
    name: 'idx_oracle_prices_protocol_pair',
    table: 'oracle_price_feeds',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_prices_protocol_pair ON oracle_price_feeds(protocol, pair)',
  },

  // 奖励表索引
  {
    name: 'idx_oracle_rewards_protocol',
    table: 'oracle_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_rewards_protocol ON oracle_rewards(protocol)',
  },
  {
    name: 'idx_oracle_rewards_recipient',
    table: 'oracle_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_rewards_recipient ON oracle_rewards(recipient)',
  },
  {
    name: 'idx_oracle_rewards_claimed',
    table: 'oracle_rewards',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_rewards_claimed ON oracle_rewards(claimed)',
  },

  // 质押表索引
  {
    name: 'idx_oracle_staking_protocol',
    table: 'oracle_staking',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_staking_protocol ON oracle_staking(protocol)',
  },
  {
    name: 'idx_oracle_staking_staker',
    table: 'oracle_staking',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_staking_staker ON oracle_staking(staker)',
  },

  // 惩罚表索引
  {
    name: 'idx_oracle_slashing_protocol',
    table: 'oracle_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_slashing_protocol ON oracle_slashing(protocol)',
  },
  {
    name: 'idx_oracle_slashing_entity',
    table: 'oracle_slashing',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_slashing_entity ON oracle_slashing(slashed_entity)',
  },

  // TVL表索引
  {
    name: 'idx_oracle_tvl_protocol',
    table: 'oracle_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_tvl_protocol ON oracle_tvl(protocol)',
  },
  {
    name: 'idx_oracle_tvl_chain',
    table: 'oracle_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_tvl_chain ON oracle_tvl(chain)',
  },
  {
    name: 'idx_oracle_tvl_timestamp',
    table: 'oracle_tvl',
    sql: 'CREATE INDEX IF NOT EXISTS idx_oracle_tvl_timestamp ON oracle_tvl(timestamp DESC)',
  },
];

// ============================================================================
// 创建函数
// ============================================================================
export async function createUniversalOracleTables(queryFn: QueryFn): Promise<void> {
  for (const table of universalOracleTables) {
    await queryFn(table.sql);
  }
}

export async function createUniversalOracleIndexes(queryFn: QueryFn): Promise<void> {
  for (const index of universalOracleIndexes) {
    await queryFn(index.sql);
  }
}

// ============================================================================
// 向后兼容视图
// ============================================================================
export const compatibilityViews = [
  {
    name: 'uma_assertions_view',
    sql: `
      CREATE OR REPLACE VIEW uma_assertions_view AS
      SELECT * FROM oracle_assertions WHERE protocol = 'uma'
    `,
  },
  {
    name: 'uma_disputes_view',
    sql: `
      CREATE OR REPLACE VIEW uma_disputes_view AS
      SELECT * FROM oracle_disputes WHERE protocol = 'uma'
    `,
  },
  {
    name: 'uma_votes_view',
    sql: `
      CREATE OR REPLACE VIEW uma_votes_view AS
      SELECT * FROM oracle_votes WHERE protocol = 'uma'
    `,
  },
  {
    name: 'uma_rewards_view',
    sql: `
      CREATE OR REPLACE VIEW uma_rewards_view AS
      SELECT * FROM oracle_rewards WHERE protocol = 'uma'
    `,
  },
  {
    name: 'uma_staking_view',
    sql: `
      CREATE OR REPLACE VIEW uma_staking_view AS
      SELECT * FROM oracle_staking WHERE protocol = 'uma'
    `,
  },
];

export async function createCompatibilityViews(queryFn: QueryFn): Promise<void> {
  for (const view of compatibilityViews) {
    await queryFn(view.sql);
  }
}
