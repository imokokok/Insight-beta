# Insight - Oracle Data Analytics Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-cyan)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

Insight is a universal multi-protocol oracle data analytics platform, supporting real-time aggregation and analysis of oracle data from 4 protocols.

## ✨ Features

### Multi-Protocol Support (4 Protocols Integrated)

- **UMA** - Optimistic Oracle with assertion and dispute mechanisms
- **Chainlink** - Industry-standard price feeds and data oracles
- **Pyth** - Low-latency financial data from institutional sources
- **RedStone** - Modular oracle with on-demand data

### Architecture Highlights

- **Shared Module Library** - Reusable components for database, blockchain, sync, errors, and logging
- **Factory Pattern** - `SyncManagerFactory` and `EvmOracleClient` for rapid protocol integration
- **Code Reusability** - 54% code reduction through shared abstractions
- **Type Safety** - Full TypeScript coverage with strict type checking

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
git clone https://github.com/your-org/insight-beta.git
cd insight-beta
npm install
cp .env.example .env.local
npm run supabase:push
npm run dev
```

Visit http://localhost:3000

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [User Manual](./docs/USER_MANUAL.md) | End user guide |
| [Development Guide](./docs/DEVELOPMENT_GUIDE.md) | Development environment setup |
| [Architecture](./docs/ARCHITECTURE.md) | System architecture design |
| [API Documentation](./docs/API.md) | Complete API reference |
| [Database Documentation](./docs/DATABASE.md) | Database design and schema |
| [Deployment Guide](./docs/DEPLOYMENT.md) | Production deployment |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |
| [Error Codes](./docs/ERROR_CODES.md) | Error code reference |
| [UI Guidelines](./docs/UI_GUIDELINES.md) | User interface design standards |

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build production version
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type check
npm run test             # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e        # Run E2E tests
npm run supabase:push   # Push database changes
npm run supabase:studio # Open Supabase Studio
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [Contributing Guide](./CONTRIBUTING.md) and [Coding Standards](./CODING_STANDARDS.md) for details.

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for the DeFi community**
