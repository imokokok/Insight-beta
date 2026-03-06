/**
 * Pyth Publisher Types with Source Type
 * 
 * 扩展的 Publisher 类型，包含数据源类型信息
 */

/**
 * 数据发布者类型
 */
export type PublisherSourceType = 'exchange' | 'market_maker' | 'financial_institution' | 'defi_protocol';

/**
 * 数据发布者详细信息
 */
export interface Publisher {
  id: string;
  name: string;
  description?: string;
  sourceType: PublisherSourceType;
  sourceTypeLabel: string;
  credibilityScore: number;
  publishFrequency: number;
  supportedFeeds: number;
  status: 'active' | 'inactive' | 'degraded';
  website?: string;
  location?: string;
  established?: number;
}

/**
 * 数据源类型映射
 */
export const PUBLISHER_SOURCE_TYPE_LABELS: Record<PublisherSourceType, string> = {
  exchange: '交易所',
  market_maker: '做市商',
  financial_institution: '金融机构',
  defi_protocol: 'DeFi 协议',
};

/**
 * 数据源类型颜色映射
 */
export const PUBLISHER_SOURCE_TYPE_COLORS: Record<PublisherSourceType, string> = {
  exchange: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  market_maker: 'bg-green-500/10 text-green-500 border-green-500/30',
  financial_institution: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  defi_protocol: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
};

/**
 * 示例发布者数据（用于演示）
 */
export const EXAMPLE_PUBLISHERS: Publisher[] = [
  {
    id: '1',
    name: 'Binance',
    description: '全球领先的加密货币交易所',
    sourceType: 'exchange',
    sourceTypeLabel: '交易所',
    credibilityScore: 98,
    publishFrequency: 2.3,
    supportedFeeds: 156,
    status: 'active',
    website: 'https://www.binance.com',
    location: 'Global',
    established: 2017,
  },
  {
    id: '2',
    name: 'Jump Trading',
    description: '知名做市商和量化交易公司',
    sourceType: 'market_maker',
    sourceTypeLabel: '做市商',
    credibilityScore: 96,
    publishFrequency: 1.8,
    supportedFeeds: 98,
    status: 'active',
    website: 'https://www.jumptrading.com',
    established: 1999,
  },
  {
    id: '3',
    name: 'Coinbase',
    description: '美国最大的加密货币交易所',
    sourceType: 'exchange',
    sourceTypeLabel: '交易所',
    credibilityScore: 97,
    publishFrequency: 3.1,
    supportedFeeds: 87,
    status: 'active',
    website: 'https://www.coinbase.com',
    location: 'USA',
    established: 2012,
  },
  {
    id: '4',
    name: 'Aave',
    description: '去中心化借贷协议',
    sourceType: 'defi_protocol',
    sourceTypeLabel: 'DeFi 协议',
    credibilityScore: 94,
    publishFrequency: 5.2,
    supportedFeeds: 45,
    status: 'active',
    website: 'https://aave.com',
    established: 2020,
  },
  {
    id: '5',
    name: 'Goldman Sachs',
    description: '全球领先的投资银行',
    sourceType: 'financial_institution',
    sourceTypeLabel: '金融机构',
    credibilityScore: 99,
    publishFrequency: 10.5,
    supportedFeeds: 234,
    status: 'active',
    website: 'https://www.goldmansachs.com',
    location: 'USA',
    established: 1869,
  },
];

/**
 * 获取数据源类型统计
 */
export function getSourceTypeStats(publishers: Publisher[]): Record<PublisherSourceType, number> {
  return publishers.reduce(
    (acc, pub) => {
      acc[pub.sourceType] = (acc[pub.sourceType] || 0) + 1;
      return acc;
    },
    {} as Record<PublisherSourceType, number>,
  );
}
