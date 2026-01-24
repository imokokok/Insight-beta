# Insight

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3-cyan)

[English](README.md) | [中文](README.zh-CN.md)

**Insight** 是一个预言机监控和争议解决界面，支持实时可视化预言机数据、参与争议解决。

## 主要功能

- **实时监控**: 预言机数据趋势、交易量、同步状态
- **争议解决**: 浏览、投票、解决争议
- **断言管理**: 创建和追踪断言
- **多链支持**: Polygon、Arbitrum、Optimism、Local

## 快速开始

```bash
git clone https://github.com/your-org/insight.git
cd insight
npm install
cp .env.example .env.local
npm run dev
```

## 文档

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

## 命令

| 命令                     | 说明           |
| ------------------------ | -------------- |
| `npm run dev`            | 启动开发服务器 |
| `npm test`               | 运行测试       |
| `npm run build`          | 构建生产版本   |
| `npm run contracts:test` | 运行合约测试   |

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

MIT
