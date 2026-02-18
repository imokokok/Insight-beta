# 数据流图

本文档包含 Insight 系统关键功能的数据流图。

## 目录

- [预言机数据同步流程](#预言机数据同步流程)
- [价格聚合数据流](#价格聚合数据流)
- [告警触发流程](#告警触发流程)
- [跨链分析数据流](#跨链分析数据流)

---

## 预言机数据同步流程

### 概述

本流程描述 Insight 如何从多个预言机协议获取数据并存储到数据库。

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端
    participant API as API Routes
    participant SyncService as 同步服务
    participant RPC as RPC 节点
    participant Oracle as 预言机协议
    participant Cache as 缓存层
    participant DB as 数据库

    Note over SyncService,DB: 后台同步流程

    SyncService->>RPC: 获取最新区块
    RPC-->>SyncService: 返回区块数据

    loop 每个预言机协议
        SyncService->>Oracle: 查询价格数据
        Oracle-->>SyncService: 返回价格
        SyncService->>Cache: 写入缓存
        SyncService->>DB: 存储历史数据
    end

    Note over User,DB: 用户请求流程

    User->>Frontend: 访问页面
    Frontend->>API: 请求价格数据
    API->>Cache: 检查缓存
    alt 缓存命中
        Cache-->>API: 返回缓存数据
    else 缓存未命中
        API->>DB: 查询数据库
        DB-->>API: 返回数据
    end
    API-->>Frontend: 返回价格数据
    Frontend-->>User: 显示数据
```

### 详细步骤

#### 1. 后台同步

1. **同步服务启动**
   - 从 `sync_state` 表读取上次同步的区块号
   - 从 RPC 节点获取最新区块号
   - 计算需要同步的区块范围

2. **数据获取**
   - 遍历每个配置的预言机协议（Chainlink、Pyth、RedStone、UMA）
   - 从各协议获取价格数据
   - 统一数据格式

3. **数据存储**
   - 写入缓存（Redis）
   - 存储历史数据到数据库
   - 更新同步状态

#### 2. 用户请求

1. **前端发起请求**
   - 用户访问页面
   - 前端调用 API

2. **API 处理请求**
   - 先检查缓存
   - 缓存命中则直接返回
   - 缓存未命中则查询数据库

3. **返回数据**
   - 返回统一格式数据
   - 前端渲染展示

---

## 价格聚合数据流

### 概述

描述多个预言机协议价格聚合和偏差计算流程。

```mermaid
flowchart TD
    A[接收价格数据] --> B{协议来源}
    B -->|Chainlink| C1[Chainlink 数据]
    B -->|Pyth| C2[Pyth 数据]
    B -->|RedStone| C3[RedStone 数据]
    B -->|UMA| C4[UMA 数据]

    C1 --> D[统一格式化]
    C2 --> D
    C3 --> D
    C4 --> D

    D --> E[计算统计]

    E --> F1[计算平均价格]
    E --> F2[计算偏差]
    E --> F3[计算标准差]

    F1 --> G[存储聚合结果]
    F2 --> G
    F3 --> G

    G --> H[偏差热力图]
    G --> I[偏差趋势图]
    G --> J[异常检测]
```

### 详细步骤

#### 1. 数据接收与聚合

1. **接收多源数据**
   - 从各协议原始数据
   - 时间戳对齐

2. **统一格式化**
   - 统一数据结构
   - 标准化价格格式
   - 验证数据有效性

3. **统计计算**
   - 计算平均价格
   - 计算最大/最小值
   - 计算标准差
   - 计算各协议相对于平均值的偏差

4. **存储结果**
   - 缓存聚合结果
   - 写入数据库

#### 2. 数据分析

1. **偏差热力图**
   - 两两协议间偏差
   - 颜色编码偏差大小

2. **偏差趋势图**
   - 时间序列数据
   - 趋势线分析

3. **异常检测**
   - 统计异常检测
   - 阈值触发
   - 告警触发

---

## 告警触发流程

### 概述

描述告警规则检查和通知发送流程。

```mermaid
sequenceDiagram
    participant Scheduler as 定时任务
    participant AlertEngine as 告警引擎
    participant PriceService as 价格服务
    participant AlertRules as 告警规则
    participant Condition as 条件检查
    participant Notifier as 通知服务
    participant AlertHistory as 告警历史
    participant User as 用户

    loop 定期检查
        Scheduler->>AlertEngine: 触发检查
        AlertEngine->>AlertRules: 获取活跃规则

        loop 每个规则
            AlertEngine->>PriceService: 获取价格数据
            PriceService-->>AlertEngine: 返回数据

            AlertEngine->>Condition: 检查条件
            alt 条件满足
                Condition-->>AlertEngine: 触发告警
                AlertEngine->>Notifier: 发送通知
                Notifier->>User: 邮件/Telegram/Slack
                AlertEngine->>AlertHistory: 记录告警历史
            else 条件不满足
                Condition-->>AlertEngine: 不触发
            end
        end
    end
```

### 详细步骤

#### 1. 告警检查

1. **定时触发**
   - 定时任务定期触发检查
   - 可配置检查频率

2. **获取规则**
   - 从数据库读取活跃告警规则
   - 加载规则配置

3. **获取数据**
   - 根据规则获取对应价格数据
   - 获取历史数据用于比较

4. **条件检查**
   - 价格偏差检查
   - 价格阈值检查
   - 数据陈旧检查
   - 多条件组合

#### 2. 告警处理

1. **触发告警**
   - 条件满足时触发
   - 去重检查（避免重复告警）

2. **发送通知**
   - 邮件
   - Telegram 机器人
   - Slack Webhook
   - 自定义 Webhook

3. **记录历史**
   - 记录告警事件
   - 记录触发时间
   - 记录当时数据

---

## 跨链分析数据流

### 概述

描述跨链价格比较和套利机会识别流程。

```mermaid
flowchart LR
    A[获取多链价格] --> B[对齐时间戳]
    B --> C[计算价格差异]

    C --> D[相关性分析]
    C --> E[套利机会检测]

    D --> F[相关性矩阵]
    D --> G[相关性热图]

    E --> H[套利机会列表]
    E --> I[利润估算]

    H --> J[展示结果]
    I --> J
    F --> J
    G --> J
```

### 详细步骤

#### 1. 数据获取

1. **获取多链数据**
   - 各链 RPC 节点
   - 各链预言机协议
   - 价格数据

2. **对齐时间戳**
   - 时间对齐
   - 缺失数据插值

#### 2. 分析计算

1. **价格差异计算**
   - 链间价格差
   - 百分比差异

2. **相关性分析**
   - 皮尔逊相关系数
   - 时间序列相关性

3. **套利检测**
   - 价格差超过阈值
   - 扣除 gas 成本估算
   - 利润计算

#### 3. 结果展示

1. **相关性矩阵**
   - 矩阵展示
   - 热图可视化

2. **套利机会**
   - 机会列表
   - 利润估算
   - 风险提示

---

**返回 [文档总索引](../README.md)**
