# OracleMonitor

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)

[English](README.md) | [中文](README.zh-CN.md)

**OracleMonitor** is a universal multi-protocol oracle monitoring platform, supporting real-time aggregation and monitoring of oracle data from Chainlink, Pyth, API3, DIA, Band, RedStone, and more.

## Features

- **Multi-Protocol Support**: Chainlink, Pyth, API3, DIA, Band, RedStone, and more
- **Real-time Monitoring**: Oracle price feeds, data trends, sync status
- **Unified Dashboard**: Aggregate view of all oracle protocols
- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC

## Quick Start

```bash
git clone https://github.com/your-org/oracle-monitor.git
cd oracle-monitor
npm install
cp .env.example .env.local
npm run dev
```

## Documentation

### English Documentation

- [Development Guide](docs/DEVELOPMENT_GUIDE.md) - Development environment setup
- [Architecture](docs/ARCHITECTURE.md) - System architecture and data flow
- [Database Design](docs/DATABASE.md) - Table structure and indexes
- [Smart Contracts](docs/CONTRACTS.md) - Contract logic and events
- [API Documentation](docs/API.md) - API documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [User Manual](docs/USER_MANUAL.md) - User operation guide

### 中文文档

- [开发指南](docs/DEVELOPMENT_GUIDE.zh-CN.md) - 开发环境搭建
- [架构设计](docs/ARCHITECTURE.zh-CN.md) - 系统架构和数据流
- [数据库设计](docs/DATABASE.zh-CN.md) - 表结构和索引
- [智能合约](docs/CONTRACTS.zh-CN.md) - 合约逻辑和事件
- [API 文档](docs/API.zh-CN.md) - 接口文档
- [部署指南](docs/DEPLOYMENT.zh-CN.md) - 生产环境部署
- [用户手册](docs/USER_MANUAL.zh-CN.md) - 用户操作指南

## Commands

| Command                  | Description              |
| ------------------------ | ------------------------ |
| `npm run dev`            | Start development server |
| `npm test`               | Run tests                |
| `npm run build`          | Build production version |
| `npm run contracts:test` | Run contract tests       |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT
