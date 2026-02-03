-- ============================================================================
-- Supabase Database Manager for Universal Oracle Platform
-- 通用预言机平台数据库管理脚本
-- 
-- 使用方法：
-- 1. 打开 Supabase SQL Editor
-- 2. 复制需要的SQL块执行
-- 3. 不要一次性执行整个文件
-- ============================================================================

-- ============================================================================
-- 第一部分：查看数据库状态
-- ============================================================================

-- 1.1 查看所有表
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name LIKE 'oracle_%'
ORDER BY table_name;

-- 1.2 查看所有索引
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'oracle_%'
ORDER BY tablename, indexname;

-- 1.3 查看所有视图
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname LIKE 'uma_%';

-- 1.4 查看RLS状态
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'oracle_%';

-- 1.5 查看表数据量
SELECT 
    'oracle_assertions' as table_name, COUNT(*) as count FROM oracle_assertions
UNION ALL
SELECT 'oracle_disputes', COUNT(*) FROM oracle_disputes
UNION ALL
SELECT 'oracle_votes', COUNT(*) FROM oracle_votes
UNION ALL
SELECT 'oracle_price_feeds', COUNT(*) FROM oracle_price_feeds
UNION ALL
SELECT 'oracle_rewards', COUNT(*) FROM oracle_rewards
UNION ALL
SELECT 'oracle_staking', COUNT(*) FROM oracle_staking
UNION ALL
SELECT 'oracle_tvl', COUNT(*) FROM oracle_tvl
UNION ALL
SELECT 'oracle_protocol_config', COUNT(*) FROM oracle_protocol_config
UNION ALL
SELECT 'oracle_protocol_sync_state', COUNT(*) FROM oracle_protocol_sync_state
UNION ALL
SELECT 'oracle_slashing', COUNT(*) FROM oracle_slashing;

-- ============================================================================
-- 第二部分：协议管理
-- ============================================================================

-- 2.1 查看所有协议配置
SELECT * FROM oracle_protocol_config ORDER BY protocol, chain;

-- 2.2 添加新协议配置（修改后执行）
-- INSERT INTO oracle_protocol_config (
--     id, protocol, chain, name, rpc_url, contract_addresses, enabled
-- ) VALUES (
--     'chainlink-ethereum',
--     'chainlink',
--     'ethereum',
--     'Chainlink Ethereum',
--     'https://...',
--     '{"priceFeed": "0x..."}',
--     true
-- ) ON CONFLICT (id) DO NOTHING;

-- 2.3 启用/禁用协议
-- UPDATE oracle_protocol_config SET enabled = false WHERE id = 'uma-ethereum';

-- 2.4 删除协议配置
-- DELETE FROM oracle_protocol_config WHERE id = 'protocol-to-delete';

-- ============================================================================
-- 第三部分：数据查询
-- ============================================================================

-- 3.1 查看最近10条断言
SELECT 
    protocol,
    chain,
    assertion_id,
    proposer,
    status,
    proposed_at
FROM oracle_assertions
ORDER BY proposed_at DESC
LIMIT 10;

-- 3.2 按协议统计断言
SELECT 
    protocol,
    status,
    COUNT(*) as count
FROM oracle_assertions
GROUP BY protocol, status
ORDER BY protocol, status;

-- 3.3 查看最近价格数据
SELECT 
    protocol,
    pair,
    price,
    confidence,
    timestamp
FROM oracle_price_feeds
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 20;

-- 3.4 查看价格对比（多协议同一交易对）
SELECT 
    protocol,
    price,
    confidence,
    timestamp
FROM oracle_price_feeds
WHERE pair = 'ETH/USD'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

-- 3.5 查看活跃争议
SELECT 
    d.protocol,
    d.assertion_id,
    d.disputer,
    d.dispute_bond,
    d.status,
    d.voting_ends_at
FROM oracle_disputes d
WHERE d.status = 'pending'
ORDER BY d.disputed_at DESC;

-- 3.6 查看质押排行
SELECT 
    protocol,
    staker,
    staked_amount,
    pending_rewards
FROM oracle_staking
ORDER BY staked_amount DESC
LIMIT 20;

-- ============================================================================
-- 第四部分：数据维护
-- ============================================================================

-- 4.1 清理旧的价格数据（保留最近30天）
-- DELETE FROM oracle_price_feeds 
-- WHERE timestamp < NOW() - INTERVAL '30 days';

-- 4.2 清理已解决的旧争议（保留最近90天）
-- DELETE FROM oracle_disputes 
-- WHERE status = 'resolved' 
-- AND disputed_at < NOW() - INTERVAL '90 days';

-- 4.3 更新同步状态
-- UPDATE oracle_protocol_sync_state 
-- SET last_processed_block = 12345678,
--     last_success_at = NOW()
-- WHERE protocol = 'uma' AND chain = 'ethereum';

-- ============================================================================
-- 第五部分：用户查询
-- ============================================================================

-- 5.1 查看特定用户的断言
-- SELECT * FROM oracle_assertions 
-- WHERE proposer = '0x...' 
-- ORDER BY proposed_at DESC;

-- 5.2 查看特定用户的争议
-- SELECT * FROM oracle_disputes 
-- WHERE disputer = '0x...' 
-- ORDER BY disputed_at DESC;

-- 5.3 查看特定用户的投票
-- SELECT * FROM oracle_votes 
-- WHERE voter = '0x...' 
-- ORDER BY created_at DESC;

-- 5.4 查看特定用户的奖励
-- SELECT * FROM oracle_rewards 
-- WHERE recipient = '0x...' 
-- ORDER BY created_at DESC;

-- 5.5 查看特定用户的质押
-- SELECT * FROM oracle_staking 
-- WHERE staker = '0x...';

-- ============================================================================
-- 第六部分：统计报表
-- ============================================================================

-- 6.1 TVL统计
SELECT 
    protocol,
    chain,
    SUM(total_staked) as total_staked,
    SUM(total_bonded) as total_bonded,
    SUM(oracle_tvl) as oracle_tvl,
    MAX(timestamp) as last_update
FROM oracle_tvl
GROUP BY protocol, chain
ORDER BY oracle_tvl DESC;

-- 6.2 每日活跃度统计
SELECT 
    DATE(proposed_at) as date,
    protocol,
    COUNT(*) as assertions_count
FROM oracle_assertions
WHERE proposed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(proposed_at), protocol
ORDER BY date DESC, protocol;

-- 6.3 争议成功率统计
SELECT 
    protocol,
    COUNT(*) as total_disputes,
    COUNT(*) FILTER (WHERE resolution_result = true) as approved,
    COUNT(*) FILTER (WHERE resolution_result = false) as rejected,
    ROUND(
        COUNT(*) FILTER (WHERE resolution_result = true) * 100.0 / COUNT(*), 
        2
    ) as approval_rate
FROM oracle_disputes
WHERE status = 'resolved'
GROUP BY protocol;

-- ============================================================================
-- 第七部分：系统维护
-- ============================================================================

-- 7.1 查看表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'oracle_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 7.2 查看未使用索引（可能需要清理）
-- SELECT 
--     schemaname,
--     tablename,
--     indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'oracle_%';

-- ============================================================================
-- 第八部分：测试数据插入（开发环境使用）
-- ============================================================================

-- 8.1 插入测试断言
-- INSERT INTO oracle_assertions (
--     id, protocol, chain, instance_id, assertion_id, identifier, claim,
--     proposer, proposed_value, reward, bond, status,
--     proposed_at, tx_hash, block_number, log_index
-- ) VALUES (
--     'test-1', 'uma', 'ethereum', 'default', 'assertion-1', 'ETH/USD', 'Price is 3000',
--     '0x1234...', 3000, 100, 500, 'pending',
--     NOW(), '0xabc...', 12345678, 0
-- ) ON CONFLICT (id) DO NOTHING;

-- 8.2 插入测试价格
-- INSERT INTO oracle_price_feeds (
--     protocol, chain, pair, base_asset, quote_asset,
--     price, decimals, confidence, timestamp
-- ) VALUES 
-- ('chainlink', 'ethereum', 'ETH/USD', 'ETH', 'USD', 3000.50,