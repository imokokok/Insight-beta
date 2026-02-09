/**
 * Unified Oracle Schema - 通用预言机监控平台数据库Schema
 *
 * 支持多预言机协议的统一数据存储
 */

import { logger } from '@/lib/logger';

import { hasDatabase, query } from './db';

// 保留供将来使用的事务回滚函数
// async function safeRollback() {
//   try {
//     await query('ROLLBACK');
//   } catch (rollbackError) {
//     logger.error('Failed to rollback transaction', {
//       error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
//     });
//     throw rollbackError;
//   }
// }

export async function ensureUnifiedSchema() {
  if (!hasDatabase()) return;

  logger.info('Ensuring unified oracle schema...');

  // ============================================================================
  // 核心表：预言机实例管理
  // ============================================================================
  await query(`
    -- 统一预言机实例表
    CREATE TABLE IF NOT EXISTS unified_oracle_instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      
      -- 通用配置（JSONB存储）
      config JSONB NOT NULL DEFAULT '{}',
      
      -- 协议特定配置
      protocol_config JSONB DEFAULT '{}',
      
      -- 元数据
      metadata JSONB DEFAULT '{}',
      
      -- 统计信息
      total_updates BIGINT DEFAULT 0,
      last_update_at TIMESTAMP WITH TIME ZONE,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_unified_instances_protocol ON unified_oracle_instances(protocol);
    CREATE INDEX IF NOT EXISTS idx_unified_instances_chain ON unified_oracle_instances(chain);
    CREATE INDEX IF NOT EXISTS idx_unified_instances_enabled ON unified_oracle_instances(enabled);
    CREATE INDEX IF NOT EXISTS idx_unified_instances_protocol_chain ON unified_oracle_instances(protocol, chain);
    CREATE INDEX IF NOT EXISTS idx_unified_instances_created_at ON unified_oracle_instances(created_at DESC);
  `);

  // ============================================================================
  // 核心表：价格喂价数据
  // ============================================================================
  await query(`
    -- 统一价格喂价表
    CREATE TABLE IF NOT EXISTS unified_price_feeds (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      -- 资产信息
      symbol TEXT NOT NULL,
      base_asset TEXT NOT NULL,
      quote_asset TEXT NOT NULL,
      
      -- 价格数据
      price NUMERIC NOT NULL,
      price_raw TEXT NOT NULL,
      decimals INTEGER NOT NULL DEFAULT 8,
      
      -- 时间戳
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      block_number BIGINT,
      
      -- 元数据
      confidence NUMERIC,
      sources INTEGER,
      
      -- 状态
      is_stale BOOLEAN DEFAULT false,
      staleness_seconds INTEGER,
      
      -- 交易信息
      tx_hash TEXT,
      log_index INTEGER,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_price_feeds_instance ON unified_price_feeds(instance_id);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_protocol ON unified_price_feeds(protocol);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_chain ON unified_price_feeds(chain);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol ON unified_price_feeds(symbol);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_timestamp ON unified_price_feeds(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_instance_symbol ON unified_price_feeds(instance_id, symbol);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_symbol_timestamp ON unified_price_feeds(symbol, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_price_feeds_protocol_chain_symbol ON unified_price_feeds(protocol, chain, symbol);
  `);

  // ============================================================================
  // 核心表：价格更新历史
  // ============================================================================
  await query(`
    -- 统一价格更新历史表
    CREATE TABLE IF NOT EXISTS unified_price_updates (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL REFERENCES unified_price_feeds(id) ON DELETE CASCADE,
      instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      
      -- 价格变化
      previous_price NUMERIC NOT NULL,
      current_price NUMERIC NOT NULL,
      price_change NUMERIC NOT NULL,
      price_change_percent NUMERIC NOT NULL,
      
      -- 时间戳
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      block_number BIGINT,
      tx_hash TEXT,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_price_updates_feed ON unified_price_updates(feed_id);
    CREATE INDEX IF NOT EXISTS idx_price_updates_instance ON unified_price_updates(instance_id);
    CREATE INDEX IF NOT EXISTS idx_price_updates_timestamp ON unified_price_updates(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_price_updates_feed_timestamp ON unified_price_updates(feed_id, timestamp DESC);
  `);

  // ============================================================================
  // 核心表：断言数据（兼容 UMA 等乐观预言机）
  // ============================================================================
  await query(`
    -- 统一断言表
    CREATE TABLE IF NOT EXISTS unified_assertions (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      -- 断言内容
      identifier TEXT NOT NULL,
      description TEXT,
      proposer TEXT NOT NULL,
      proposed_value TEXT,
      
      -- 时间线
      proposed_at TIMESTAMP WITH TIME ZONE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE,
      settled_at TIMESTAMP WITH TIME ZONE,
      
      -- 状态
      status TEXT NOT NULL DEFAULT 'active',
      settlement_value TEXT,
      
      -- 经济参数
      bond_amount NUMERIC,
      bond_token TEXT,
      reward NUMERIC,
      
      -- 争议信息
      disputed BOOLEAN DEFAULT false,
      disputer TEXT,
      disputed_at TIMESTAMP WITH TIME ZONE,
      
      -- 交易信息
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      log_index INTEGER NOT NULL,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_assertions_instance ON unified_assertions(instance_id);
    CREATE INDEX IF NOT EXISTS idx_assertions_protocol ON unified_assertions(protocol);
    CREATE INDEX IF NOT EXISTS idx_assertions_chain ON unified_assertions(chain);
    CREATE INDEX IF NOT EXISTS idx_assertions_status ON unified_assertions(status);
    CREATE INDEX IF NOT EXISTS idx_assertions_proposer ON unified_assertions(proposer);
    CREATE INDEX IF NOT EXISTS idx_assertions_proposed_at ON unified_assertions(proposed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_assertions_status_proposed ON unified_assertions(status, proposed_at DESC);
  `);

  // ============================================================================
  // 核心表：争议数据
  // ============================================================================
  await query(`
    -- 统一争议表
    CREATE TABLE IF NOT EXISTS unified_disputes (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      assertion_id TEXT NOT NULL REFERENCES unified_assertions(id) ON DELETE CASCADE,
      disputer TEXT NOT NULL,
      reason TEXT,
      
      disputed_at TIMESTAMP WITH TIME ZONE NOT NULL,
      voting_ends_at TIMESTAMP WITH TIME ZONE,
      resolved_at TIMESTAMP WITH TIME ZONE,
      
      status TEXT NOT NULL DEFAULT 'active',
      outcome TEXT,
      
      -- 投票统计
      votes_for NUMERIC DEFAULT 0,
      votes_against NUMERIC DEFAULT 0,
      total_votes NUMERIC DEFAULT 0,
      
      -- 经济参数
      dispute_bond NUMERIC,
      
      -- 交易信息
      tx_hash TEXT NOT NULL,
      block_number BIGINT NOT NULL,
      log_index INTEGER NOT NULL,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_disputes_instance ON unified_disputes(instance_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_assertion ON unified_disputes(assertion_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON unified_disputes(status);
    CREATE INDEX IF NOT EXISTS idx_disputes_disputer ON unified_disputes(disputer);
    CREATE INDEX IF NOT EXISTS idx_disputes_disputed_at ON unified_disputes(disputed_at DESC);
  `);

  // ============================================================================
  // 核心表：同步状态
  // ============================================================================
  await query(`
    -- 统一同步状态表
    CREATE TABLE IF NOT EXISTS unified_sync_state (
      instance_id TEXT PRIMARY KEY REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      -- 区块同步状态
      last_processed_block BIGINT DEFAULT 0,
      latest_block BIGINT,
      safe_block BIGINT,
      lag_blocks BIGINT,
      
      -- 同步性能
      last_sync_at TIMESTAMP WITH TIME ZONE,
      last_sync_duration_ms INTEGER,
      avg_sync_duration_ms INTEGER,
      
      -- 健康状态
      status TEXT NOT NULL DEFAULT 'healthy',
      consecutive_failures INTEGER DEFAULT 0,
      last_error TEXT,
      last_error_at TIMESTAMP WITH TIME ZONE,
      
      -- RPC 状态
      active_rpc_url TEXT,
      rpc_health TEXT DEFAULT 'healthy',
      
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sync_state_protocol ON unified_sync_state(protocol);
    CREATE INDEX IF NOT EXISTS idx_sync_state_status ON unified_sync_state(status);
    CREATE INDEX IF NOT EXISTS idx_sync_state_updated_at ON unified_sync_state(updated_at DESC);
  `);

  // ============================================================================
  // 核心表：统计数据
  // ============================================================================
  await query(`
    -- 统一统计表（按小时聚合）
    CREATE TABLE IF NOT EXISTS unified_statistics (
      id BIGSERIAL PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES unified_oracle_instances(id) ON DELETE CASCADE,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      -- 时间窗口
      hour TIMESTAMP WITH TIME ZONE NOT NULL,
      
      -- 通用指标
      total_updates BIGINT DEFAULT 0,
      
      -- 价格特定指标
      avg_price NUMERIC,
      min_price NUMERIC,
      max_price NUMERIC,
      price_volatility NUMERIC,
      
      -- 断言特定指标
      total_assertions BIGINT DEFAULT 0,
      active_assertions BIGINT DEFAULT 0,
      disputed_assertions BIGINT DEFAULT 0,
      settled_assertions BIGINT DEFAULT 0,
      
      -- 争议特定指标
      total_disputes BIGINT DEFAULT 0,
      resolved_disputes BIGINT DEFAULT 0,
      
      -- 性能指标
      avg_response_time_ms INTEGER,
      uptime_percent NUMERIC,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_statistics_instance ON unified_statistics(instance_id);
    CREATE INDEX IF NOT EXISTS idx_statistics_protocol ON unified_statistics(protocol);
    CREATE INDEX IF NOT EXISTS idx_statistics_hour ON unified_statistics(hour DESC);
    CREATE INDEX IF NOT EXISTS idx_statistics_instance_hour ON unified_statistics(instance_id, hour DESC);
    
    -- 唯一约束：每个实例每小时一条记录
    CREATE UNIQUE INDEX IF NOT EXISTS idx_statistics_unique_instance_hour 
    ON unified_statistics(instance_id, hour);
  `);

  // ============================================================================
  // 核心表：跨预言机对比数据
  // ============================================================================
  await query(`
    -- 跨预言机价格对比表
    CREATE TABLE IF NOT EXISTS cross_oracle_comparisons (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      base_asset TEXT NOT NULL,
      quote_asset TEXT NOT NULL,
      
      -- 聚合价格
      avg_price NUMERIC NOT NULL,
      median_price NUMERIC NOT NULL,
      min_price NUMERIC NOT NULL,
      max_price NUMERIC NOT NULL,
      price_range NUMERIC NOT NULL,
      price_range_percent NUMERIC NOT NULL,
      
      -- 偏差分析
      max_deviation NUMERIC NOT NULL,
      max_deviation_percent NUMERIC NOT NULL,
      outlier_protocols TEXT[],
      
      -- 推荐
      recommended_price NUMERIC NOT NULL,
      recommendation_source TEXT,
      
      -- 参与对比的预言机
      participating_protocols TEXT[],
      participating_instances TEXT[],
      
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_comparisons_symbol ON cross_oracle_comparisons(symbol);
    CREATE INDEX IF NOT EXISTS idx_comparisons_timestamp ON cross_oracle_comparisons(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_comparisons_symbol_timestamp ON cross_oracle_comparisons(symbol, timestamp DESC);
  `);

  // ============================================================================
  // 核心表：统一告警
  // ============================================================================
  await query(`
    -- 统一告警规则表
    CREATE TABLE IF NOT EXISTS unified_alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      
      -- 触发条件
      event TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      
      -- 过滤条件
      protocols TEXT[],
      chains TEXT[],
      instances TEXT[],
      symbols TEXT[],
      
      -- 阈值配置
      params JSONB DEFAULT '{}',
      
      -- 通知配置
      channels TEXT[] NOT NULL DEFAULT '{}',
      recipients TEXT[],
      
      -- 抑制配置
      cooldown_minutes INTEGER DEFAULT 60,
      max_notifications_per_hour INTEGER DEFAULT 10,
      
      runbook TEXT,
      owner TEXT,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON unified_alert_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_alert_rules_event ON unified_alert_rules(event);
  `);

  await query(`
    -- 统一告警记录表
    CREATE TABLE IF NOT EXISTS unified_alerts (
      id TEXT PRIMARY KEY,
      rule_id TEXT REFERENCES unified_alert_rules(id) ON DELETE SET NULL,
      
      event TEXT NOT NULL,
      severity TEXT NOT NULL,
      
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      
      -- 关联实体
      protocol TEXT,
      chain TEXT,
      instance_id TEXT,
      symbol TEXT,
      assertion_id TEXT,
      dispute_id TEXT,
      
      -- 上下文数据
      context JSONB DEFAULT '{}',
      
      -- 状态
      status TEXT NOT NULL DEFAULT 'open',
      acknowledged_by TEXT,
      acknowledged_at TIMESTAMP WITH TIME ZONE,
      resolved_by TEXT,
      resolved_at TIMESTAMP WITH TIME ZONE,
      
      -- 统计
      occurrences INTEGER DEFAULT 1,
      first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_status ON unified_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON unified_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_protocol ON unified_alerts(protocol);
    CREATE INDEX IF NOT EXISTS idx_alerts_instance ON unified_alerts(instance_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON unified_alerts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON unified_alerts(status, created_at DESC);
  `);

  // ============================================================================
  // 核心表：配置模板
  // ============================================================================
  await query(`
    -- 统一配置模板表
    CREATE TABLE IF NOT EXISTS unified_config_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      protocol TEXT NOT NULL,
      
      -- 模板配置
      config JSONB NOT NULL DEFAULT '{}',
      
      -- 适用条件
      supported_chains TEXT[] NOT NULL,
      requirements TEXT[],
      
      -- 元数据
      is_default BOOLEAN DEFAULT false,
      is_official BOOLEAN DEFAULT false,
      author TEXT,
      
      -- 统计
      usage_count INTEGER DEFAULT 0,
      rating NUMERIC,
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_templates_protocol ON unified_config_templates(protocol);
    CREATE INDEX IF NOT EXISTS idx_templates_default ON unified_config_templates(is_default);
    CREATE INDEX IF NOT EXISTS idx_templates_official ON unified_config_templates(is_official);
  `);

  // ============================================================================
  // 核心表：预言机协议元数据
  // ============================================================================
  await query(`
    -- 预言机协议信息表
    CREATE TABLE IF NOT EXISTS oracle_protocols_info (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      website TEXT,
      
      -- 支持的链
      supported_chains TEXT[] NOT NULL DEFAULT '{}',
      
      -- 功能特性
      features TEXT[] NOT NULL DEFAULT '{}',
      
      -- 市场数据
      tvl NUMERIC,
      market_share NUMERIC,
      
      -- 状态
      is_active BOOLEAN DEFAULT true,
      
      -- 元数据
      metadata JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_protocols_active ON oracle_protocols_info(is_active);
  `);

  // ============================================================================
  // 初始化默认数据
  // ============================================================================
  await query(`
    -- 插入默认协议信息
    INSERT INTO oracle_protocols_info (id, name, description, supported_chains, features, is_active)
    VALUES 
      ('uma', 'UMA Optimistic Oracle', 'UMA 乐观预言机 V2/V3', 
       ARRAY['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'polygonAmoy'],
       ARRAY['price_feeds', 'dispute_resolution', 'governance'], true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO oracle_protocols_info (id, name, description, supported_chains, features, is_active)
    VALUES 
      ('chainlink', 'Chainlink Data Feeds', 'Chainlink 去中心化预言机网络', 
       ARRAY['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc', 'fantom'],
       ARRAY['price_feeds', 'randomness', 'automation', 'ccip', 'functions', 'proof_of_reserve'], true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO oracle_protocols_info (id, name, description, supported_chains, features, is_active)
    VALUES 
      ('pyth', 'Pyth Network', '低延迟金融数据预言机', 
       ARRAY['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc', 'solana'],
       ARRAY['price_feeds'], true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO oracle_protocols_info (id, name, description, supported_chains, features, is_active)
    VALUES 
      ('band', 'Band Protocol', '跨链数据预言机', 
       ARRAY['ethereum', 'polygon', 'bsc', 'fantom', 'solana'],
       ARRAY['price_feeds'], true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO oracle_protocols_info (id, name, description, supported_chains, features, is_active)
    VALUES 
      ('api3', 'API3', '第一方预言机', 
       ARRAY['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'],
       ARRAY['price_feeds', 'randomness'], true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // ============================================================================
  // 核心表：健康检查
  // ============================================================================
  await query(`
    -- 预言机健康检查表
    CREATE TABLE IF NOT EXISTS oracle_health_checks (
      id SERIAL PRIMARY KEY,
      protocol TEXT NOT NULL,
      chain TEXT NOT NULL,
      feed_id TEXT NOT NULL,
      healthy BOOLEAN NOT NULL DEFAULT false,
      last_update TIMESTAMP WITH TIME ZONE,
      staleness_seconds INTEGER DEFAULT 0,
      issues JSONB DEFAULT '[]'::jsonb,
      checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      latency_ms INTEGER DEFAULT 0,
      
      -- UMA 特定字段
      active_assertions INTEGER,
      active_disputes INTEGER,
      total_bonded TEXT,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(protocol, chain, feed_id)
    );

    CREATE INDEX IF NOT EXISTS idx_health_checks_protocol ON oracle_health_checks(protocol);
    CREATE INDEX IF NOT EXISTS idx_health_checks_chain ON oracle_health_checks(chain);
    CREATE INDEX IF NOT EXISTS idx_health_checks_healthy ON oracle_health_checks(healthy);
    CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON oracle_health_checks(checked_at);
    CREATE INDEX IF NOT EXISTS idx_health_checks_protocol_chain ON oracle_health_checks(protocol, chain);
  `);

  // ============================================================================
  // 核心表：网络指标
  // ============================================================================
  await query(`
    -- 网络指标表（Gas价格等）
    CREATE TABLE IF NOT EXISTS oracle_network_metrics (
      id SERIAL PRIMARY KEY,
      chain TEXT NOT NULL,
      
      -- Gas 价格
      gas_price_gwei NUMERIC(20, 4),
      gas_price_fast_gwei NUMERIC(20, 4),
      gas_price_standard_gwei NUMERIC(20, 4),
      gas_price_slow_gwei NUMERIC(20, 4),
      
      -- 网络状态
      block_number BIGINT,
      block_timestamp TIMESTAMP WITH TIME ZONE,
      network_congestion NUMERIC(5, 2),
      
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_network_metrics_chain ON oracle_network_metrics(chain);
    CREATE INDEX IF NOT EXISTS idx_network_metrics_timestamp ON oracle_network_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_network_metrics_chain_timestamp ON oracle_network_metrics(chain, timestamp);
  `);

  // ============================================================================
  // 核心表：流动性数据
  // ============================================================================
  await query(`
    -- 流动性数据表
    CREATE TABLE IF NOT EXISTS oracle_liquidity (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      chain TEXT NOT NULL,
      
      -- 流动性数据
      liquidity_usd NUMERIC(30, 2),
      liquidity_token NUMERIC(30, 8),
      volume_24h_usd NUMERIC(30, 2),
      
      -- DEX 信息
      dex_name TEXT,
      pool_address TEXT,
      
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_liquidity_symbol ON oracle_liquidity(symbol);
    CREATE INDEX IF NOT EXISTS idx_liquidity_chain ON oracle_liquidity(chain);
    CREATE INDEX IF NOT EXISTS idx_liquidity_timestamp ON oracle_liquidity(timestamp);
    CREATE INDEX IF NOT EXISTS idx_liquidity_symbol_chain ON oracle_liquidity(symbol, chain);
  `);

  logger.info('Unified oracle schema ensured successfully');
}

// ============================================================================
// 迁移函数：从旧Schema迁移数据
// ============================================================================

export async function migrateFromLegacySchema() {
  if (!hasDatabase()) return;

  logger.info('Starting migration from legacy schema...');

  try {
    // 迁移 UMA Oracle 实例
    await query(`
      INSERT INTO unified_oracle_instances (id, name, protocol, chain, enabled, config, protocol_config)
      SELECT 
        id,
        id as name,
        'uma' as protocol,
        chain,
        enabled,
        jsonb_build_object(
          'rpcUrl', rpc_url,
          'startBlock', start_block,
          'maxBlockRange', max_block_range,
          'confirmationBlocks', confirmation_blocks
        ),
        jsonb_build_object(
          'optimisticOracleV2Address', optimistic_oracle_v2_address,
          'optimisticOracleV3Address', optimistic_oracle_v3_address,
          'votingPeriodHours', voting_period_hours
        )
      FROM uma_oracle_config
      ON CONFLICT (id) DO NOTHING;
    `);

    logger.info('Migration from legacy schema completed');
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
