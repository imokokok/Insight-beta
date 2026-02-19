# 预言机平台核心能力补足方案

## Why

当前预言机数据分析平台缺少两个核心能力：

1. **历史数据存储** - 数据主要来自实时获取，无法进行长期趋势分析和回溯
2. **预言机可靠性评分** - 缺少对各预言机协议历史准确率的量化评估

这两项能力是平台从"数据展示"升级为"数据分析平台"的关键。

## What Changes

### 1. 历史价格数据存储

- 新增数据库表 `price_history` 存储历史价格快照
- 新增数据采集服务，定时采集并存储价格数据
- 在现有页面中增加历史趋势图表组件

### 2. 预言机可靠性评分

- 新增数据库表 `oracle_reliability_scores` 存储评分数据
- 新增评分计算服务，基于历史偏差数据计算可靠性指标
- 新增页面 `/oracle/reliability` 展示可靠性评分

## Impact

- Affected specs: oracle-analytics-platform-launch
- Affected code:
  - `src/lib/database/` - 新增数据库表
  - `src/features/oracle/services/` - 新增数据服务
  - `src/app/oracle/` - 新增页面和API
  - `src/i18n/` - 新增翻译

## ADDED Requirements

### Requirement: 历史价格数据存储

系统 SHALL 提供历史价格数据的存储和查询能力。

#### 数据库设计

```sql
-- 价格历史表
CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  protocol TEXT NOT NULL,           -- 预言机协议 (chainlink, pyth, redstone)
  symbol TEXT NOT NULL,             -- 交易对符号 (BTC/USD)
  chain TEXT,                       -- 链名称
  price NUMERIC NOT NULL,           -- 价格
  confidence NUMERIC,               -- 置信度 (Pyth)
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_price_history_protocol_symbol ON price_history(protocol, symbol);
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp DESC);
CREATE INDEX idx_price_history_protocol_symbol_time ON price_history(protocol, symbol, timestamp DESC);
```

#### Scenario: 价格数据自动采集

- **WHEN** 系统运行时
- **THEN** 每5分钟采集一次各预言机的价格数据并存储

#### Scenario: 历史价格查询

- **WHEN** 用户在偏差分析页面选择时间范围
- **THEN** 系统返回该时间范围内的历史价格数据

### Requirement: 预言机可靠性评分

系统 SHALL 基于历史数据计算并展示各预言机协议的可靠性评分。

#### 数据库设计

```sql
-- 可靠性评分表
CREATE TABLE oracle_reliability_scores (
  id BIGSERIAL PRIMARY KEY,
  protocol TEXT NOT NULL,
  symbol TEXT,
  chain TEXT,
  score NUMERIC NOT NULL,           -- 综合评分 (0-100)
  accuracy_score NUMERIC,           -- 准确度评分
  latency_score NUMERIC,            -- 延迟评分
  availability_score NUMERIC,       -- 可用性评分
  deviation_avg NUMERIC,            -- 平均偏差
  deviation_max NUMERIC,            -- 最大偏差
  sample_count INTEGER,             -- 样本数量
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(protocol, symbol, chain, period_start, period_end)
);

-- 索引
CREATE INDEX idx_reliability_protocol ON oracle_reliability_scores(protocol);
CREATE INDEX idx_reliability_protocol_symbol ON oracle_reliability_scores(protocol, symbol);
```

#### 评分算法

```
综合评分 = 准确度评分 * 0.5 + 延迟评分 * 0.3 + 可用性评分 * 0.2

准确度评分 = 100 - (平均偏差 * 1000)  // 偏差越小分数越高
延迟评分 = 100 - min(平均延迟(ms) / 10, 100)  // 延迟越低分数越高
可用性评分 = 成功请求次数 / 总请求次数 * 100
```

#### Scenario: 可靠性评分计算

- **WHEN** 每日定时任务执行
- **THEN** 系统计算各预言机协议过去7天/30天的可靠性评分并存储

#### Scenario: 可靠性评分展示

- **WHEN** 用户访问 `/oracle/reliability` 页面
- **THEN** 显示各预言机协议的可靠性评分、排名和详细指标

## 页面布局方案

### 方案选择：集成现有页面 + 新增独立页面

| 功能           | 放置位置                           | 原因                                                 |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| **历史趋势图** | 集成到偏差分析页面                 | 与现有偏差分析功能互补，用户在同一页面可查看历史趋势 |
| **可靠性评分** | 新增独立页面 `/oracle/reliability` | 这是一个独立的分析维度，需要完整的展示空间           |

### 页面结构

```
/oracle
├── /dashboard          # 现有：预言机仪表盘
├── /comparison         # 现有：价格比较
├── /protocols          # 现有：协议列表
├── /analytics
│   ├── /deviation      # 增强：偏差分析 + 历史趋势图
│   └── /disputes       # 现有：争议分析
├── /reliability        # 新增：可靠性评分页面
└── /address            # 现有：地址浏览
```

### 可靠性评分页面设计

```
┌─────────────────────────────────────────────────────────────┐
│  预言机可靠性评分                                            │
│  基于历史数据的客观评估                                       │
├─────────────────────────────────────────────────────────────┤
│  [时间范围选择: 7天 | 30天 | 90天]                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Chainlink│ │  Pyth   │ │RedStone │ │  UMA    │           │
│  │  92分   │ │  88分   │ │  85分   │ │  78分   │           │
│  │ 🥇第一  │ │ 🥈第二  │ │ 🥉第三  │ │ 第四    │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  详细指标对比                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 协议     │ 准确度 │ 延迟  │ 可用性 │ 平均偏差 │ 样本数 │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │Chainlink │  95   │  90   │  99.5  │ 0.02%   │ 12,345 │  │
│  │Pyth      │  92   │  95   │  99.2  │ 0.03%   │ 11,234 │  │
│  │RedStone  │  88   │  92   │  98.8  │ 0.05%   │ 10,123 │  │
│  │UMA       │  82   │  75   │  97.5  │ 0.08%   │ 5,678  │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  历史评分趋势图                                              │
│  [折线图展示各协议评分随时间的变化]                           │
└─────────────────────────────────────────────────────────────┘
```

### 偏差分析页面增强

在现有偏差分析页面增加"历史趋势"Tab：

```
[概览] [趋势] [异常] [历史趋势]  <-- 新增Tab
```

历史趋势Tab内容：

- 价格历史折线图（支持多协议对比）
- 偏差历史分布图
- 时间范围选择器
