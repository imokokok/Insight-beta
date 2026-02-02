[中文](./USER_MANUAL.zh-CN.md)

# User Manual

## 1. Quick Start

### Connect Wallet

1. Click "Connect Wallet" button in top right
2. Select wallet provider (e.g., MetaMask)
3. Complete the connection

### Browse Oracle Data

1. **Unified Dashboard**: View aggregated prices from multiple protocols
2. **Protocol Comparison**: Compare prices across Chainlink, Pyth, Band, etc.
3. **Price Analytics**: View deviation analysis and trends

### UMA Assertions (Specific Protocol Feature)

1. View recent assertions on the UMA page
2. Use filters to search by status, chain, or keywords
3. Click assertion card to view details

## 2. Core Features

### Multi-Protocol Price Monitoring

- **Real-time Price Aggregation**: View aggregated prices from 8+ protocols
- **Cross-Protocol Comparison**: Compare price feeds across different oracle networks
- **Deviation Alerts**: Get notified when prices deviate significantly
- **Historical Data**: View price history and trends

### UMA Assertion Features (Specific to UMA Protocol)

#### Create Assertion

1. Navigate to UMA section
2. Click "New Assertion" button
3. Fill in: protocol name, market question, assertion content, bond amount, liveness period
4. Click "Create Assertion" and sign transaction

#### Dispute Assertion

1. Open assertion detail page
2. If assertion is in "Pending" status and within liveness period, click "Dispute this Assertion"
3. Fill in dispute reason and sign transaction

#### Settle Assertion

1. Open assertion detail page
2. If assertion has passed liveness period, click "Settle Assertion"
3. Select settlement result and sign transaction

## 3. Navigation

| Page          | Function                                                      |
| ------------- | ------------------------------------------------------------- |
| Dashboard     | System overview, price aggregation, cross-protocol comparison |
| Protocols     | Individual protocol details (Chainlink, Pyth, Band, etc.)     |
| UMA           | UMA-specific features: Assertions, Disputes, Governance       |
| Alerts        | Monitoring configuration, alert handling                      |
| Audit         | Admin operation logs                                          |
| My Assertions | Manage created assertions (UMA)                               |
| My Disputes   | Manage initiated disputes (UMA)                               |
| Watchlist     | View watched items                                            |

## 4. Supported Protocols

- **UMA** - Optimistic Oracle with assertion and dispute mechanisms
- **Chainlink** - Industry-standard price feeds
- **Pyth** - Low-latency financial data
- **Band** - Cross-chain data oracle
- **API3** - First-party oracle
- **RedStone** - Modular oracle
- **Switchboard** - Solana and EVM compatible
- **Flux** - Decentralized oracle aggregator
- **DIA** - Transparent data feeds

## 5. FAQ

**How to view price comparison?**

- Go to Dashboard or Comparison page
- Select the trading pair (e.g., ETH/USD)
- View real-time prices from all supported protocols

**What is price deviation?**

- Price deviation shows the difference between prices from different protocols
- High deviation may indicate market volatility or oracle issues

**Can't create assertion?** (UMA-specific)

- Ensure wallet is connected
- Ensure sufficient funds for fees and bond
- Ensure on correct chain

**How to participate in dispute?** (UMA-specific)

- Assertion must be in "Pending" status
- Must be within liveness period
- Must have sufficient funds for dispute bond

**How to settle assertion?** (UMA-specific)

- Assertion must have passed liveness period
- Must have sufficient funds for transaction fees
