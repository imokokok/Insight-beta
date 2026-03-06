# Chainlink 历史数据趋势分析功能

## 功能概述

实现了完整的 Chainlink 历史数据趋势分析功能，包括：

1. **Feed 长期历史趋势图表** - 支持 1h/24h/7d/30d/90d 时间范围
2. **节点历史表现追踪** - 在线率、响应时间趋势图表
3. **OCR 轮次历史统计** - 参与节点数、聚合时间、Gas 消耗等指标
4. **异常事件标记和分析** - 多类型异常事件检测与可视化

## 技术特性

- ✅ 使用 Recharts 图表库（与项目一致）
- ✅ 支持多时间范围切换
- ✅ 图表支持缩放和工具提示
- ✅ 异常事件在图表上标记
- ✅ 大数据量性能优化（自动数据采样）
- ✅ 完整的 TypeScript 类型支持
- ✅ 中英文国际化

## 文件结构

```
src/features/oracle/chainlink/
├── types/
│   ├── historical.ts          # 类型定义
│   └── index.ts               # 导出所有类型
├── components/
│   └── historical/
│       ├── TimeRangeSelector.tsx       # 时间范围选择器
│       ├── FeedTrendChart.tsx          # Feed 趋势图表
│       ├── NodePerformanceChart.tsx    # 节点表现图表
│       ├── OCRRoundChart.tsx           # OCR 轮次图表
│       ├── AnomalyTimeline.tsx         # 异常事件时间线
│       ├── HistoricalTrendsDashboard.tsx  # 主容器组件
│       └── index.ts                    # 组件导出
├── hooks/
│   └── useHistoricalTrends.ts          # 数据获取 Hook
└── index.ts                            # 统一导出

src/app/api/oracle/chainlink/
└── historical-trends/
    └── route.ts                        # API 路由
```

## 使用示例

### 基础用法

```tsx
import { HistoricalTrendsDashboard } from '@/features/oracle/chainlink';

export default function ChainlinkHistoricalPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Chainlink 历史数据分析</h1>
      <HistoricalTrendsDashboard defaultTimeRange="24h" />
    </div>
  );
}
```

### 使用独立组件

```tsx
import {
  FeedTrendChart,
  NodePerformanceChart,
  OCRRoundChart,
  AnomalyTimeline,
} from '@/features/oracle/chainlink/components/historical';
import { useHistoricalTrends } from '@/features/oracle/chainlink/hooks';

export function CustomDashboard() {
  const { data, isLoading } = useHistoricalTrends('7d');

  if (isLoading) return <div>加载中...</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <FeedTrendChart
        data={data.feedTrends}
        timeRange="7d"
        onTimeRangeChange={(range) => console.log('Range changed:', range)}
      />
      
      <NodePerformanceChart
        data={data.nodePerformance}
        timeRange="7d"
      />
      
      <OCRRoundChart
        data={data.ocrStats}
        timeRange="7d"
      />
      
      <AnomalyTimeline
        data={data.anomalyStats.recentAnomalies}
        stats={data.anomalyStats}
        timeRange="7d"
      />
    </div>
  );
}
```

### 使用 Hook 自定义

```tsx
import { useHistoricalTrends } from '@/features/oracle/chainlink/hooks';

function MyComponent() {
  const { data, error, isLoading, setTimeRange, refresh } = useHistoricalTrends('30d', {
    refreshInterval: 60000,      // 1 分钟刷新
    dedupingInterval: 30000,     // 30 秒去重
    revalidateOnFocus: true,     // 聚焦时重新验证
    enableSampling: true,        // 启用数据采样
  });

  return (
    <div>
      {isLoading && <p>加载中...</p>}
      {error && <p>加载失败</p>}
      {data && (
        <div>
          <p>Feed 数：{data.metadata.totalFeeds}</p>
          <p>节点数：{data.metadata.totalNodes}</p>
          <button onClick={() => setTimeRange('90d')}>查看 90 天</button>
          <button onClick={() => refresh()}>刷新</button>
        </div>
      )}
    </div>
  );
}
```

## API 接口

### GET /api/oracle/chainlink/historical-trends

获取历史趋势数据。

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| timeRange | TimeRange | 否 | '24h' | 时间范围：1h, 24h, 7d, 30d, 90d |
| limit | number | 否 | 500 | 数据点限制 |
| sampling | number | 否 | auto | 采样率（1-100）或 'auto' |

**响应示例：**

```typescript
{
  success: true,
  data: {
    feedTrends: FeedTrendData[];
    nodePerformance: NodePerformanceHistory[];
    ocrStats: OCRRoundStats;
    anomalyStats: AnomalyStats;
    timeRange: TimeRange;
    generatedAt: string;
    metadata: {
      totalFeeds: number;
      totalNodes: number;
      totalRounds: number;
      dataPoints: number;
      samplingRate: number;
    };
  }
}
```

## 类型定义

### TimeRange

```typescript
type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';
```

### FeedTrendData

```typescript
interface FeedTrendData {
  feedId: string;
  symbol: string;
  pair: string;
  chain: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
  history: FeedHistoricalDataPoint[];
}
```

### NodePerformanceHistory

```typescript
interface NodePerformanceHistory {
  nodeName: string;
  operatorName?: string;
  currentUptime: number;
  avgResponseTime: number;
  totalProposals: number;
  totalObservations: number;
  history: NodePerformanceDataPoint[];
  events?: NodeEvent[];
}
```

### OCRRoundStats

```typescript
interface OCRRoundStats {
  totalRounds: number;
  avgParticipants: number;
  avgAggregationTime: number;
  avgGasUsed: number;
  mostActiveProposer: string;
  proposerDistribution: Record<string, number>;
  history: OCRRoundHistoryDataPoint[];
}
```

### AnomalyEvent

```typescript
interface AnomalyEvent {
  id: string;
  feedId?: string;
  nodeName?: string;
  type:
    | 'price_spike'
    | 'price_drop'
    | 'delayed_update'
    | 'node_offline'
    | 'consensus_failure'
    | 'unusual_gas';
  timestamp: string;
  resolvedAt?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact?: string;
  metadata?: Record<string, unknown>;
}
```

## 性能优化

### 数据采样

当数据量超过 1000 个点时，系统会自动启用数据采样：

```typescript
// 自动计算采样率
const samplingRate = totalDataPoints > 1000 
  ? Math.ceil(totalDataPoints / 1000) 
  : 1;

// 手动设置采样率
useHistoricalTrends('90d', {
  enableSampling: true
});
```

### 时间范围数据点限制

| 时间范围 | 最大数据点 | 采样间隔 |
|---------|-----------|---------|
| 1h      | 60        | 1 分钟   |
| 24h     | 96        | 15 分钟  |
| 7d      | 168       | 1 小时   |
| 30d     | 180       | 4 小时   |
| 90d     | 180       | 12 小时  |

## 国际化

支持中英文两种语言：

```typescript
// 中文
{
  historical: {
    title: '历史数据趋势',
    tabs: {
      feeds: 'Feed 趋势',
      nodes: '节点表现',
      ocr: 'OCR 轮次',
      anomalies: '异常事件',
    },
  }
}

// English
{
  historical: {
    title: 'Historical Trends',
    tabs: {
      feeds: 'Feed Trends',
      nodes: 'Node Performance',
      ocr: 'OCR Rounds',
      anomalies: 'Anomaly Events',
    },
  }
}
```

## 注意事项

1. **Mock 数据**: 当前实现使用 Mock 数据，实际生产环境需要对接真实数据源
2. **性能**: 90 天数据量较大时建议启用数据采样
3. **刷新频率**: 建议设置合理的刷新间隔（60 秒以上）避免频繁请求
4. **图表高度**: 可根据实际需要调整图表高度参数

## 后续优化建议

1. 对接真实 Chainlink 历史数据 API
2. 添加数据导出功能（CSV、Excel）
3. 支持自定义时间范围
4. 添加更多图表类型（K 线图、成交量图等）
5. 实现图表联动和钻取功能
6. 添加数据预测和趋势分析
