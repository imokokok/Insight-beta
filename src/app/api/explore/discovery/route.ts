import { ok } from '@/lib/api/apiResponse';

// 注意：以下为示例数据，用于演示数据发现功能的界面展示
// 实际生产环境应接入真实的数据发现服务

interface DiscoveryItem {
  id: string;
  type: 'new_feed' | 'price_spike' | 'protocol_update' | 'anomaly' | 'trending';
  title: string;
  description: string;
  symbol: string;
  protocol: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  actionUrl: string;
}

const mockDiscoveryItems: DiscoveryItem[] = [
  {
    id: 'discovery-001',
    type: 'new_feed',
    title: '新增数据源',
    description: 'Chainlink 新增支持 SEI/USD 价格源，现已上线主网',
    symbol: 'SEI/USD',
    protocol: 'chainlink',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actionUrl: '/feeds/sei-usd',
  },
  {
    id: 'discovery-002',
    type: 'price_spike',
    title: '价格异常波动',
    description: 'ARB/USD 在过去 1 小时内上涨超过 8%，请关注市场动态',
    symbol: 'ARB/USD',
    protocol: 'chainlink',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    actionUrl: '/feeds/arb-usd',
  },
  {
    id: 'discovery-003',
    type: 'protocol_update',
    title: '协议升级通知',
    description: 'Pyth Network 完成重大升级，延迟降低 40%',
    symbol: 'N/A',
    protocol: 'pyth',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    actionUrl: '/protocols/pyth',
  },
  {
    id: 'discovery-004',
    type: 'anomaly',
    title: '数据源异常',
    description: 'MATIC/USD 数据源更新延迟超过 2 分钟，正在调查中',
    symbol: 'MATIC/USD',
    protocol: 'chainlink',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    actionUrl: '/feeds/matic-usd',
  },
  {
    id: 'discovery-005',
    type: 'trending',
    title: '热门关注',
    description: 'SOL/USD 成为今日最受欢迎的价格源，新增 500+ 关注',
    symbol: 'SOL/USD',
    protocol: 'pyth',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    actionUrl: '/feeds/sol-usd',
  },
  {
    id: 'discovery-006',
    type: 'new_feed',
    title: '新增数据源',
    description: 'Redstone 新增支持 LDO/USD 价格源',
    symbol: 'LDO/USD',
    protocol: 'redstone',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    actionUrl: '/feeds/ldo-usd',
  },
  {
    id: 'discovery-007',
    type: 'price_spike',
    title: '价格异常波动',
    description: 'LINK/USD 价格偏离多源均值超过 3%',
    symbol: 'LINK/USD',
    protocol: 'chainlink',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    actionUrl: '/feeds/link-usd',
  },
];

export async function GET() {
  return ok(mockDiscoveryItems, {
    total: mockDiscoveryItems.length,
    meta: {
      dataSource: 'manual',
      isExample: true,
      disclaimer: '此数据为示例数据，非自动发现',
      timestamp: new Date().toISOString(),
    },
  });
}
