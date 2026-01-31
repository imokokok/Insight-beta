# OracleMonitor - Unified Oracle Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)

[English](README.md) | [中文](README.zh-CN.md)

**OracleMonitor** is a universal multi-protocol oracle monitoring platform, supporting real-time aggregation and monitoring of oracle data from 10+ protocols including Chainlink, Pyth, Band, API3, RedStone, Switchboard, and more.

## ✨ Features

### Multi-Protocol Support
- **UMA** - Optimistic Oracle with assertion and dispute mechanisms
- **Chainlink** - Industry-standard price feeds and data oracles
- **Pyth** - Low-latency financial data from institutional sources
- **Band** - Cross-chain data oracle platform
- **API3** - First-party oracle with Airnode
- **RedStone** - Modular oracle with on-demand data
- **Switchboard** - Solana and EVM compatible oracle network
- **Flux** - Decentralized oracle aggregator
- **DIA** - Transparent and verifiable data feeds

### Core Capabilities
- 🔴 **Real-time Price Aggregation** - Aggregate prices from multiple protocols with intelligent outlier detection
- 📊 **Cross-Protocol Comparison** - Compare prices across different oracle networks
- 🔔 **Smart Alerting** - Price deviation alerts, staleness detection, sync health monitoring
- 🌐 **WebSocket Streaming** - Real-time price updates via WebSocket
- 📈 **Unified Dashboard** - Single pane of glass for all oracle protocols
- 🔒 **Enterprise Security** - RBAC, API key management, audit logging
- 🐳 **Production Ready** - Docker, K8s, CI/CD ready

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- RPC URLs (Alchemy, Infura, etc.)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/oracle-monitor.git
cd oracle-monitor

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your RPC URLs and database credentials

# Setup database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Using Docker Compose (Recommended)
cp .env.example .env
docker-compose up -d

# Or build manually
docker build -t oracle-monitor .
docker run -p 3000:3000 --env-file .env oracle-monitor
```

## 📖 Documentation

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│   Next.js API   │────▶│  Price Engine   │
│   (Next.js)     │     │   Routes        │     │  (Aggregation)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         │                       ┌─────────────────┐     │
         └──────────────────────▶│  WebSocket      │◀────┘
                                 │  Price Stream   │
                                 └─────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │   Chainlink  │    │     Pyth     │    │     Band     │
            │    Sync      │    │    Sync      │    │    Sync      │
            └──────────────┘    └──────────────┘    └──────────────┘
```

### API Endpoints

#### REST API
```bash
# Get price comparison across protocols
GET /api/oracle/unified?type=comparison&symbol=ETH/USD

# Get historical price data
GET /api/oracle/unified?type=history&symbol=ETH/USD&hours=24

# Get platform statistics
GET /api/oracle/unified?type=stats

# Get protocol list
GET /api/oracle/unified?type=protocols

# Trigger price aggregation
POST /api/oracle/unified
Body: { "symbols": ["ETH/USD", "BTC/USD"] }
```

#### WebSocket API
```javascript
const ws = new WebSocket('ws://localhost:3001');

// Subscribe to price updates
ws.send(JSON.stringify({
  type: 'subscribe',
  symbols: ['ETH/USD', 'BTC/USD']
}));

// Handle updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'price_update') {
    console.log('New price:', data.data);
  }
  if (data.type === 'comparison_update') {
    console.log('Price comparison:', data.data);
  }
};
```

### Supported Trading Pairs
- ETH/USD, BTC/USD, LINK/USD
- MATIC/USD, AVAX/USD, BNB/USD
- UNI/USD, AAVE/USD, MKR/USD
- USDC/USD, USDT/USD, DAI/USD
- And more...

## 🛠️ Development

### Project Structure
```
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/               # API routes
│   │   └── oracle/            # Dashboard pages
│   ├── lib/
│   │   ├── blockchain/        # Oracle protocol clients
│   │   └── types/             # TypeScript types
│   └── server/
│       ├── oracle/            # Sync services & aggregation
│       └── websocket/         # WebSocket server
├── docker-compose.yml         # Docker deployment
├── Dockerfile                 # Main app container
└── Dockerfile.worker          # Background worker
```

### Adding a New Protocol

1. Create client in `src/lib/blockchain/{protocol}Oracle.ts`
2. Create sync service in `src/server/oracle/{protocol}Sync.ts`
3. Add to unified service in `src/server/oracle/unifiedService.ts`
4. Update types in `src/lib/types/unifiedOracleTypes.ts`

Example:
```typescript
// src/lib/blockchain/newProtocolOracle.ts
export class NewProtocolClient {
  async getPrice(symbol: string): Promise<UnifiedPriceFeed> {
    // Implementation
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Yes |
| `POLYGON_RPC_URL` | Polygon RPC endpoint | No |
| `JWT_SECRET` | JWT signing secret | Yes |
| `SENTRY_DSN` | Sentry error tracking | No |

See `.env.example` for complete list.

## 📊 Monitoring

### Health Checks
- `/api/health` - Application health
- `/api/health/db` - Database connectivity
- `/api/health/redis` - Redis connectivity

### Metrics
- Price feed latency
- Sync success rate
- WebSocket connections
- API request rates

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [Chainlink](https://chain.link/) - Industry-leading oracle network
- [Pyth Network](https://pyth.network/) - Low-latency financial data
- [Band Protocol](https://bandprotocol.com/) - Cross-chain data oracle
- [UMA](https://umaproject.org/) - Optimistic oracle pioneer

---

**Built with ❤️ for the DeFi community**
