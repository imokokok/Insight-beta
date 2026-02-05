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

// Re-export from PriceFeedTable if it exists
export { PriceFeedTable } from './PriceFeedTable';
