/**
 * Protocol Feature Components - Index
 *
 * This module exports all protocol-related components for the oracle monitoring platform.
 * These components provide data visualization, comparison, and alert functionality.
 */

// Price History Chart Component
export {
  PriceHistoryChart,
  generateMockPriceHistory,
  type PriceDataPoint,
  type PriceHistoryChartProps,
} from './PriceHistoryChart';

// Protocol Comparison Component
export {
  ProtocolComparison,
  type ProtocolMetrics,
  type ProtocolComparisonProps,
} from './ProtocolComparison';

// Price Alert Settings Component
export {
  PriceAlertSettings,
  type PriceAlert,
  type PriceAlertSettingsProps,
} from './PriceAlertSettings';

// Protocol Page Layout Component
export { ProtocolPageLayout, type ProtocolPageLayoutProps } from './ProtocolPageLayout';

// Feed Table Component
export {
  FeedTable,
  feedColumnRenderers,
  commonFeedColumns,
  type FeedColumn,
  type FeedTableProps,
} from './FeedTable';
