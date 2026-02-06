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

### Multi-Protocol Support (8 Protocols Integrated)

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

> **Note**: All 8 protocols are now fully integrated into the unified service with real-time price aggregation.

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

完整文档请访问 [docs/README.md](./docs/README.md)

### 快速导航

| 文档                                    | 说明                   |
| --------------------------------------- | ---------------------- |
| [用户手册](./docs/USER_MANUAL.md)       | 终端用户指南           |
| [开发指南](./docs/DEVELOPMENT_GUIDE.md) | 开发环境设置和编码规范 |
| [架构文档](./docs/ARCHITECTURE.md)      | 系统架构设计           |
| [API 文档](./docs/API.md)               | 完整的 API 参考        |
| [部署指南](./docs/DEPLOYMENT.md)        | 生产环境部署           |
| [故障排除](./TROUBLESHOOTING.md)        | 常见问题解决           |

### Supported Trading Pairs

- ETH/USD, BTC/USD, LINK/USD
- MATIC/USD, AVAX/USD, BNB/USD
- UNI/USD, AAVE/USD, MKR/USD
- USDC/USD, USDT/USD, DAI/USD
- And more...

## 🛠️ Development

详见 [开发指南](./docs/DEVELOPMENT_GUIDE.md)

## 🔧 Configuration

详见 [部署指南](./docs/DEPLOYMENT.md#环境变量)

## 📊 Monitoring

- Health Check: `/api/health`
- 详见 [监控文档](./monitoring/README.md)

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
