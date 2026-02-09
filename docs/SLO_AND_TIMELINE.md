# SLO / Error Budget 和事件时间线功能

本文档介绍新实现的两个高级运维功能：

1. **SLO / Error Budget 视图**
2. **基于事件时间线的视图**

---

## 1. SLO / Error Budget 视图

### 功能概述

SLO (Service Level Objective) 是定义服务承诺的核心机制。不同于传统的 Uptime/Latency 监控，SLO 视图提供了：

- **承诺视角**：从"看数据"升级为"看承诺是否被打破"
- **Error Budget**：量化本周/本月还能"容忍"多少异常
- **趋势分析**：合规率的历史趋势和预测

### 核心概念

#### SLO 定义
```typescript
{
  name: "Chainlink ETH/USD 延迟 SLO",
  protocol: "chainlink",
  chain: "ethereum",
  metricType: "latency",
  targetValue: 99.9,        // 目标：99.9% 的请求延迟 < 2s
  thresholdValue: 95.0,     // 阈值：低于 95% 视为违约
  evaluationWindow: "30d",  // 评估窗口：30天
  errorBudgetPolicy: "monthly"
}
```

#### Error Budget 计算
- **总预算**：基于 SLO 目标计算（如 99.9% → 0.1% 的 Error Budget）
- **已使用**：不合规时间窗口的累积
- **剩余预算**：当前周期内还能容忍的异常时间
- **消耗速率**：每天消耗的 Error Budget
- **预计耗尽时间**：基于当前消耗速率的预测

### 页面功能

访问 `/oracle/slo-v2` 查看 SLO 仪表板：

1. **概览卡片**：显示平均合规率、合规/风险/违约 SLO 数量
2. **SLO 卡片视图**：每个 SLO 的详细状态、Error Budget 仪表盘、趋势图
3. **列表视图**：表格形式展示所有 SLO 的关键指标
4. **事件时间线**：关联的告警、争议等事件

### API 接口

- `GET /api/slo/definitions` - 获取 SLO 定义列表
- `POST /api/slo/definitions` - 创建新的 SLO 定义
- `GET /api/slo/reports` - 获取 SLO 报告（包含 Error Budget）
- `POST /api/slo/evaluate` - 手动触发 SLO 评估

---

## 2. 事件时间线视图

### 功能概述

事件时间线将分散的系统事件整合为统一的时间轴，帮助用户快速回答：

- "这次异常是发生在升级前还是升级后？"
- "这个价格 spike 当时有没有触发 dispute/alert？"
- "争议创建前发生了什么？"

### 支持的事件类型

- `alert_triggered` / `alert_resolved` - 告警触发/恢复
- `dispute_created` / `dispute_resolved` - 争议创建/解决
- `deployment` - 部署事件
- `config_changed` - 配置变更
- `price_spike` / `price_drop` - 价格异常波动
- `system_maintenance` - 系统维护
- `incident_created` / `incident_resolved` - 事件创建/解决
- `fix_completed` - 修复完成

### 核心功能

1. **时间线展示**：按日期分组，垂直时间线布局
2. **事件筛选**：按类型、严重程度、协议、链、交易对筛选
3. **事件详情**：点击事件查看完整信息和元数据
4. **关联分析**：自动识别相关事件（原因/结果/相关）
5. **时间窗口查询**：查看特定时间点前后的事件

### 页面功能

访问 `/oracle/timeline` 查看完整事件时间线：

1. **统计卡片**：今日事件、告警、争议、部署数量
2. **时间线组件**：可滚动的事件列表，支持筛选
3. **事件详情面板**：选中事件的详细信息和关联事件

### API 接口

- `GET /api/timeline/events` - 查询事件列表
- `POST /api/timeline/events` - 创建新事件
- `GET /api/timeline/events/:id` - 获取单个事件详情
- `GET /api/timeline/events/:id/correlations` - 获取事件关联
- `GET /api/timeline/around` - 获取特定时间点附近的事件
- `GET /api/timeline/summary` - 获取事件统计摘要

---

## 3. 数据库模型

### SLO 相关表

```prisma
model SloDefinition {
  id          String   @id @default(uuid())
  name        String
  protocol    String
  chain       String
  metricType  String
  targetValue Decimal
  thresholdValue Decimal
  evaluationWindow String
  errorBudgetPolicy String
  conditionConfig Json?
  isActive    Boolean
  metrics     SloMetric[]
  errorBudgets ErrorBudget[]
}

model SloMetric {
  id            String   @id @default(uuid())
  sloId         String
  actualValue   Decimal
  targetValue   Decimal
  isCompliant   Boolean
  complianceRate Decimal
  totalEvents   Int
  goodEvents    Int
  badEvents     Int
  windowStart   DateTime
  windowEnd     DateTime
}

model ErrorBudget {
  id          String   @id @default(uuid())
  sloId       String
  periodStart DateTime
  periodEnd   DateTime
  totalBudget Decimal
  usedBudget  Decimal
  remainingBudget Decimal
  burnRate    Decimal
  projectedDepletion DateTime?
  status      String
}
```

### 事件时间线表

```prisma
model EventTimeline {
  id          String   @id @default(uuid())
  eventType   String
  severity    String
  title       String
  description String?
  protocol    String?
  chain       String?
  symbol      String?
  entityType  String?
  entityId    String?
  metadata    Json?
  occurredAt  DateTime
  parentEventId String?
  relatedEventIds String[]
  source      String
  sourceUser  String?
}
```

---

## 4. 使用指南

### 创建 SLO

1. 访问 `/oracle/slo-v2`
2. 点击"新建 SLO"按钮
3. 填写 SLO 参数：
   - 名称和描述
   - 协议和链
   - 指标类型（延迟/可用性/准确性）
   - 目标值和阈值
   - 评估窗口和 Error Budget 策略
4. 保存后系统会自动开始评估

### 查看事件时间线

1. 访问 `/oracle/timeline`
2. 使用筛选按钮过滤事件类型
3. 点击事件查看详情
4. 查看关联事件了解事件链

### 在代码中创建事件

```typescript
import { createTimelineEvent } from '@/server/timeline/eventTimelineService';

// 创建告警事件
await createTimelineEvent({
  eventType: 'alert_triggered',
  severity: 'warning',
  title: 'Price deviation detected',
  protocol: 'chainlink',
  chain: 'ethereum',
  symbol: 'ETH/USD',
  entityType: 'alert',
  entityId: 'alert-123',
  metadata: { deviation: 0.05, threshold: 0.01 }
});
```

---

## 5. 后续优化建议

1. **SLO 告警**：当 Error Budget 即将耗尽时发送告警
2. **自动修复建议**：基于事件关联分析提供修复建议
3. **SLO 模板**：提供常见 SLO 配置的模板
4. **事件工作流**：支持事件的确认、分配、关闭流程
5. **与现有告警系统集成**：自动将告警转换为时间线事件

---

## 6. 迁移说明

运行以下命令创建数据库表：

```bash
npx prisma migrate dev --name add_slo_and_event_timeline
```

或者生成迁移文件后手动执行：

```bash
npx prisma migrate dev --create-only --name add_slo_and_event_timeline
npx prisma migrate deploy
```
