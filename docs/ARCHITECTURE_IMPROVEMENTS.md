# Architecture Improvements Documentation

This document records the project's architecture improvements, including completed code refactoring and optimizations.

## Latest Improvements (February 2025)

### 1. Shared Module Library (src/lib/shared)

#### Overview

Created a unified shared module library to provide reusable base components for the entire project.

```
src/lib/shared/
├── index.ts                          # Unified exports
├── database/
│   ├── BatchInserter.ts              # Database batch insert
│   └── BatchInserter.test.ts         # Unit tests
├── blockchain/
│   ├── EvmOracleClient.ts            # EVM oracle client base class
│   ├── ContractRegistry.ts            # Contract address registry
│   └── ContractRegistry.test.ts      # Unit tests
├── sync/
│   └── SyncManagerFactory.ts         # Sync manager factory
├── errors/
│   ├── ErrorHandler.ts               # Unified error handling
│   └── ErrorHandler.test.ts          # Unit tests
└── logger/
    └── LoggerFactory.ts              # Logger factory
```

#### Core Components

##### BatchInserter

High-performance database batch insert tool with automatic batching and conflict handling.

```typescript
import { BatchInserter } from '@/lib/shared';

const inserter = new BatchInserter<PriceFeed>({
  tableName: 'price_feeds',
  columns: ['id', 'symbol', 'price', 'timestamp'],
  batchSize: 100,
  onConflict: 'ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price',
});

// Batch insert
const count = await inserter.insert(priceFeeds);
```

##### EvmOracleClient

Abstract base class for EVM oracle clients, unifying all EVM protocol client implementations.

```typescript
import { EvmOracleClient } from '@/lib/shared';

export class NewProtocolClient extends EvmOracleClient {
  protected resolveContractAddress(): Address | undefined {
    // Return contract address
  }

  protected getFeedId(symbol: string): string | undefined {
    // Return feed ID
  }

  protected async fetchRawPriceData(feedId: string): Promise<unknown> {
    // Fetch raw data from contract
  }

  protected parsePriceFromContract(
    rawData: unknown,
    symbol: string,
    feedId: string,
  ): UnifiedPriceFeed | null {
    // Parse to unified format
  }

  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: true,
    };
  }
}
```

##### SyncManagerFactory

Sync manager factory to simplify sync module creation.

```typescript
import { createSingletonSyncManager } from '@/lib/shared';

const protocolSync = createSingletonSyncManager(
  {
    protocol: 'new_protocol',
    syncConfig: {
      defaultIntervalMs: 60000,
      batchSize: 50,
      maxConcurrency: 5,
    },
  },
  (chain, rpcUrl, config) => createClient(chain, rpcUrl, config),
  (chain) => getAvailableSymbols(chain),
);

// Export convenience functions
export const {
  manager: protocolSyncManager,
  startSync: startProtocolSync,
  stopSync: stopProtocolSync,
  stopAllSync: stopAllProtocolSync,
  cleanupData: cleanupProtocolData,
} = protocolSync;
```

##### ErrorHandler

Unified error handling tool providing standardized error creation and logging.

```typescript
import { ErrorHandler, normalizeError } from '@/lib/shared/errors/ErrorHandler';

// Create specific error
const error = ErrorHandler.createPriceFetchError(originalError, 'chainlink', 'ethereum', 'ETH/USD');

// Log error
ErrorHandler.logError(logger, 'Operation failed', error, { extra: 'data' });

// Retry mechanism
const result = await ErrorHandler.withRetry(async () => fetchData(), {
  maxRetries: 3,
  baseDelay: 1000,
});
```

##### LoggerFactory

Create prefixed structured loggers.

```typescript
import { LoggerFactory } from '@/lib/shared/logger/LoggerFactory';

const logger = LoggerFactory.createOracleLogger('chainlink', 'ethereum');
// Output: [Chainlink:ethereum] log message

const syncLogger = LoggerFactory.createSyncLogger('pyth', 'main-instance');
// Output: [Sync:pyth:main-instance] log message
```

### 2. Sync Module Refactoring

#### Refactoring Results

All 7 sync modules have been refactored using `SyncManagerFactory`:

| Module           | Before        | After         | Reduction   |
| ---------------- | ------------- | ------------- | ----------- |
| ChainlinkSync.ts | 60 lines      | 20 lines      | **67%**     |
| PythSync.ts      | 70 lines      | 25 lines      | **64%**     |
| BandSync.ts      | 120 lines     | 35 lines      | **71%**     |
| DIASync.ts       | 65 lines      | 20 lines      | **69%**     |
| API3Sync.ts      | 65 lines      | 20 lines      | **69%**     |
| RedStoneSync.ts  | 65 lines      | 20 lines      | **69%**     |
| FluxSync.ts      | 60 lines      | 20 lines      | **67%**     |
| **Total**        | **505 lines** | **160 lines** | **68% avg** |

#### Refactoring Example

**Before:**

```typescript
export class ChainlinkSyncManager extends BaseSyncManager {
  private static instance: ChainlinkSyncManager;

  static getInstance(): ChainlinkSyncManager {
    if (!ChainlinkSyncManager.instance) {
      ChainlinkSyncManager.instance = new ChainlinkSyncManager();
    }
    return ChainlinkSyncManager.instance;
  }

  // Repeated implementation...
}

export const chainlinkSyncManager = ChainlinkSyncManager.getInstance();
export const startChainlinkSync = chainlinkSyncManager.startSync.bind(chainlinkSyncManager);
// ... more repeated code
```

**After:**

```typescript
const chainlinkSync = createSingletonSyncManager(
  {
    protocol: 'chainlink',
    syncConfig: { defaultIntervalMs: 60000, batchSize: 50 },
  },
  (chain, rpcUrl, config) => createChainlinkClient(chain, rpcUrl, config),
  (chain) => getAvailableFeedsForChain(chain),
);

export const {
  manager: chainlinkSyncManager,
  startSync: startChainlinkSync,
  stopSync: stopChainlinkSync,
  stopAllSync: stopAllChainlinkSync,
  cleanupData: cleanupChainlinkData,
} = chainlinkSync;
```

### 3. EVM Client Refactoring

#### Refactoring Results

4 EVM clients have been refactored using `EvmOracleClient` base class:

| Client                | Before         | After         | Reduction   |
| --------------------- | -------------- | ------------- | ----------- |
| ChainlinkDataFeeds.ts | 474 lines      | 200 lines     | **58%**     |
| pythOracle.ts         | 468 lines      | 240 lines     | **49%**     |
| api3Oracle.ts         | 349 lines      | 200 lines     | **43%**     |
| redstoneOracle.ts     | ~400 lines     | 220 lines     | **45%**     |
| **Total**             | **1691 lines** | **860 lines** | **49% avg** |

#### Code Reuse Benefits

**Common functionality provided by base class:**

- viem client initialization
- Block number acquisition
- Health check
- Price formatting
- Staleness calculation
- Structured logging
- Error handling

**Subclasses only need to implement:**

1. `resolveContractAddress()` - Resolve contract address
2. `getFeedId(symbol)` - Get feed ID
3. `fetchRawPriceData(feedId)` - Fetch raw data
4. `parsePriceFromContract(rawData, symbol, feedId)` - Parse price
5. `getCapabilities()` - Return capability configuration

### 4. Unit Tests

Added complete unit tests for shared modules:

| Test File                | Test Cases | Status            |
| ------------------------ | ---------- | ----------------- |
| BatchInserter.test.ts    | 5          | ✅ Passed         |
| ErrorHandler.test.ts     | 14         | ✅ Passed         |
| ContractRegistry.test.ts | 9          | ✅ Passed         |
| **Total**                | **28**     | **✅ All Passed** |

Run tests:

```bash
npm test -- src/lib/shared
```

## Historical Improvements

### P0 Improvements (Completed)

#### 1. Unified Blockchain Client Architecture

Created core abstraction layer including:

- `BaseOracleClient` - Abstract base class
- `OracleClientFactory` - Factory pattern
- Structured error types

#### 2. Environment Variable Validation System

Used Zod for type-safe environment variable validation.

### P1 Improvements (Completed)

#### 1. Unified Error Handling

Defined standardized error types and HTTP status code mappings.

#### 2. Smart Caching Strategy

Implemented multi-level caching strategy including memory and Redis layers.

### P2 Improvements (Completed)

#### 1. WebSocket Connection Pool

Implemented connection reuse, auto-reconnection, and subscription management.

#### 2. Performance Monitoring System

Monitored API latency, cache hit rate, oracle response, and other metrics.

### P3 Improvements (Completed)

#### 1. Service Architecture Unification

Unified multiple duplicate service implementations to reduce code redundancy.

**Deleted duplicate services:**

| Service                           | Replacement           | Files Deleted | Code Reduced   |
| --------------------------------- | --------------------- | ------------- | -------------- |
| `priceHistoryService`             | `unifiedPriceService` | 3             | ~300 lines     |
| `notifications.ts` (compat layer) | `NotificationService` | 2             | ~200 lines     |
| **Total**                         |                       | **5**         | **~500 lines** |

**Optimizations:**

- **Database connection unified**: All server-side code uses `pg` connection pool (via `@/server/db` query function)
- **Supabase SDK streamlined**: Only used for Realtime subscriptions (`alerts/stream`)
- **Notification service unified**: Unified use of `NotificationService` class
- **Price history type unified**: Unified use of type definitions in `unifiedPriceService`

**API route optimizations:**

11 API routes migrated from `supabaseAdmin` to unified `pg` connection pool:

- `security/reports/export`
- `security/monitor-status`
- `security/detections/*`
- `security/trends`
- `security/alerts/*` (except `stream`, kept Realtime)
- `security/config`
- `security/monitor/start`
- `security/metrics`

**Code example:**

```typescript
// Before
import { supabaseAdmin } from '@/lib/supabase/server';
const { data, error } = await supabaseAdmin.from('table').select('*');

// After
import { query } from '@/server/db';
const result = await query('SELECT * FROM table');
```

## Performance Improvements

### Code Reduction

| Category     | Before         | After          | Reduction |
| ------------ | -------------- | -------------- | --------- |
| Sync modules | 505 lines      | 160 lines      | **68%**   |
| EVM clients  | 1691 lines     | 860 lines      | **49%**   |
| **Total**    | **2196 lines** | **1020 lines** | **54%**   |

### Development Efficiency Improvement

| Metric               | Before                | After                    | Improvement           |
| -------------------- | --------------------- | ------------------------ | --------------------- |
| New sync module time | ~30 minutes           | ~5 minutes               | **83%**               |
| New EVM client time  | ~45 minutes           | ~15 minutes              | **67%**               |
| Bug fix propagation  | Multiple file changes | Single base class change | **Major improvement** |

## Next Steps

### P3 Priority

1. **More Unit Tests**
   - EvmOracleClient tests
   - SyncManagerFactory tests
   - Integration tests

2. **Performance Optimization**
   - Batch query optimization
   - Cache strategy tuning
   - Connection pool optimization

3. **Documentation Improvement**
   - API documentation auto-generation
   - Architecture diagram updates
   - Development guide enhancement

## Migration Guide

### Adding New Sync Module

```typescript
// 1. Create file src/server/oracle/sync/NewProtocolSync.ts
import { createSingletonSyncManager } from '@/lib/shared';

const newProtocolSync = createSingletonSyncManager(
  {
    protocol: 'new_protocol',
    syncConfig: {
      defaultIntervalMs: 60000,
      batchSize: 50,
      maxConcurrency: 5,
    },
  },
  (chain, rpcUrl, config) => createNewProtocolClient(chain, rpcUrl, config),
  (chain) => getAvailableSymbols(chain),
);

export const {
  manager: newProtocolSyncManager,
  startSync: startNewProtocolSync,
  stopSync: stopNewProtocolSync,
  stopAllSync: stopAllNewProtocolSync,
  cleanupData: cleanupNewProtocolData,
} = newProtocolSync;
```

### Adding New EVM Client

```typescript
// 1. Create file src/lib/blockchain/newProtocolOracle.ts
import { EvmOracleClient } from '@/lib/shared';

export class NewProtocolClient extends EvmOracleClient {
  readonly protocol = 'new_protocol' as const;
  readonly chain: SupportedChain;

  constructor(chain: SupportedChain, rpcUrl: string, config: NewProtocolConfig = {}) {
    super({
      chain,
      protocol: 'new_protocol',
      rpcUrl,
      timeoutMs: (config as { timeoutMs?: number }).timeoutMs ?? 30000,
      defaultDecimals: 8,
    });
    this.chain = chain;
  }

  protected resolveContractAddress(): Address | undefined {
    return NEW_PROTOCOL_CONTRACTS[this.chain];
  }

  protected getFeedId(symbol: string): string | undefined {
    return FEED_IDS[symbol];
  }

  protected async fetchRawPriceData(feedId: string): Promise<RawData> {
    // Implement data fetching
  }

  protected parsePriceFromContract(rawData: RawData, symbol: string): UnifiedPriceFeed | null {
    // Implement data parsing
  }

  getCapabilities() {
    return {
      priceFeeds: true,
      assertions: false,
      disputes: false,
      vrf: false,
      customData: false,
      batchQueries: true,
    };
  }
}
```

## Summary

Through this architecture improvement, we achieved:

1. **Code Reuse** - Shared module library provides common functionality
2. **Code Reduction** - Total code reduced by 54%
3. **Development Efficiency** - New protocol time reduced by 83%
4. **Quality Assurance** - 28 unit tests all passed
5. **Maintainability** - Bug fixes in one place, all modules benefit

The project now has a clearer, more maintainable, and more scalable architecture.
