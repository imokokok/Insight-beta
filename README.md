# OracleMonitor - Unified Oracle Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)

[English](README.md) | [中文](README.zh-CN.md)

**OracleMonitor** is a universal multi-protocol oracle monitoring platform, supporting real-time aggregation and monitoring of oracle data from 10+ protocols.

## ✨ Features

### Multi-Protocol Support (9 Protocols Integrated)

#### Fully Integrated ✅

- **UMA** - Optimistic Oracle with assertion and dispute mechanisms
- **Chainlink** - Industry-standard price feeds and data oracles
- **Pyth** - Low-latency financial data from institutional sources
- **Band** - Cross-chain data oracle platform
- **API3** - First-party oracle with Airnode
- **RedStone** - Modular oracle with on-demand data
- **Switchboard** - Solana and EVM compatible oracle network
- **Flux** - Decentralized oracle aggregator
- **DIA** - Transparent and verifiable data feeds

> **Note**: All 9 protocols are now fully integrated into the unified service with real-time price aggregation.

### 🏗️ Architecture Highlights

- **Shared Module Library** - Reusable components for database, blockchain, sync, errors, and logging
- **Factory Pattern** - `SyncManagerFactory` and `EvmOracleClient` for rapid protocol integration
- **Code Reusability** - 54% code reduction through shared abstractions
- **Type Safety** - Full TypeScript coverage with strict type checking
- **Test Coverage** - 28+ unit tests for shared modules

### Core Capabilities

- 🔴 **Real-time Price Aggregation** - Aggregate prices from multiple protocols with intelligent outlier detection
- 📊 **Cross-Protocol Comparison** - Compare prices across different oracle networks
- 🔔 **Smart Alerting** - Price deviation alerts, staleness detection, sync health monitoring
- 🌐 **WebSocket Streaming** - Real-time price updates via WebSocket
- 📈 **Unified Dashboard** - Single pane of glass for all oracle protocols
- 🔒 **Enterprise Security** - RBAC, API key management, audit logging
- 🚀 **Serverless Ready** - Optimized for Vercel + Supabase
- 🌍 **Multi-language Support** - 5 languages (English, Chinese, Spanish, French, Korean)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (or PostgreSQL 16+)
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

## 📖 Documentation

完整文档请访问 [docs/README.md](./docs/README.md)

### 快速导航

| 文档                                            | 说明                   |
| ----------------------------------------------- | ---------------------- |
| [用户手册](./docs/USER_MANUAL.md)               | 终端用户指南           |
| [开发指南](./docs/DEVELOPMENT_GUIDE.md)         | 开发环境设置和编码规范 |
| [架构文档](./docs/ARCHITECTURE.md)              | 系统架构设计           |
| [架构改进](./docs/ARCHITECTURE_IMPROVEMENTS.md) | 代码重构和优化记录     |
| [API 文档](./docs/API.md)                       | 完整的 API 参考        |
| [数据库文档](./docs/DATABASE.md)                | 数据库设计和 Schema    |
| [部署指南](./docs/DEPLOYMENT.md)                | 生产环境部署           |
| [故障排除](./TROUBLESHOOTING.md)                | 常见问题解决           |
| [错误代码](./docs/ERROR_CODES.md)               | 错误代码参考           |
| [UI 规范](./docs/UI_GUIDELINES.md)              | 用户界面设计规范       |

### Supported Trading Pairs

- ETH/USD, BTC/USD, LINK/USD
- MATIC/USD, AVAX/USD, BNB/USD
- UNI/USD, AAVE/USD, MKR/USD
- USDC/USD, USDT/USD, DAI/USD
- And more...

## 🛠️ Development

详见 [开发指南](./docs/DEVELOPMENT_GUIDE.md)

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build production version
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type check
npm run test             # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests
npm run db:migrate       # Run database migrations
npm run db:studio        # Open Prisma Studio
```

## 🔧 Configuration

详见 [部署指南](./docs/DEPLOYMENT.md#环境变量)

## 📊 Monitoring

- Health Check: `/api/health`
- Metrics: `/api/monitoring/metrics`
- Dashboard: `/monitoring`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

详见 [贡献指南](./CONTRIBUTING.md) 和 [代码规范](./CODING_STANDARDS.md)

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [Chainlink](https://chain.link/) - Industry-leading oracle network
- [Pyth Network](https://pyth.network/) - Low-latency financial data
- [Band Protocol](https://bandprotocol.com/) - Cross-chain data oracle
- [UMA](https://umaproject.org/) - Optimistic oracle pioneer

---

**Built with ❤️ for the DeFi community**
