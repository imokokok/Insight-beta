# Insight 文档中心

欢迎来到 Insight 预言机数据分析平台的文档中心！

## 快速导航

按用户角色快速找到所需文档：

### 👤 最终用户

- [用户快速入门](./user-guide/getting-started.md) - 了解如何开始使用 Insight
- [功能说明](./user-guide/features.md) - 详细功能介绍
- [常见问题 FAQ](./user-guide/faq.md) - 常见问题解答

### 👨‍💻 开发者

- [开发环境设置](./developer/setup.md) - 本地开发环境配置指南
- [调试指南](./developer/debugging.md) - 调试技巧和常见问题
- [测试指南](./developer/testing.md) - 测试策略和最佳实践
- [API 使用指南](./developer/api.md) - API 接口文档和最佳实践
- [编码标准](../CODING_STANDARDS.md) - 代码风格和规范
- [贡献指南](../CONTRIBUTING.md) - 如何为项目贡献代码

### 🛠️ 运维人员

- [生产部署](./deployment/production.md) - 生产环境部署指南
- [备份与恢复](./deployment/backup.md) - 数据备份和恢复策略
- [安全最佳实践](./deployment/security.md) - 安全配置和最佳实践
- [生产检查清单](../PRODUCTION_CHECKLIST.md) - 上线前检查清单
- [故障排查指南](../TROUBLESHOOTING.md) - 常见问题排查

### 📚 架构与设计

- [系统架构概述](./architecture/overview.md) - 整体架构介绍
- [模块设计](./architecture/modules.md) - 各模块详细设计
- [数据流图](./architecture/data-flow.md) - 关键功能的数据流
- [数据库设计](./architecture/database.md) - 数据库 schema 和 ER 图
- [架构决策记录 (ADR)](./adr/) - 重要技术决策记录

### 📖 参考资料

- [变更日志](../CHANGELOG.md) - 版本发布历史
- [根目录 README](../README.md) - 项目总览

## 文档结构

```
docs/
├── README.md                    # 本文档 - 文档总索引
├── architecture/                # 架构文档
│   ├── overview.md              # 系统架构概述
│   ├── modules.md               # 模块设计
│   ├── data-flow.md             # 数据流图
│   └── database.md              # 数据库设计
├── user-guide/                  # 用户文档
│   ├── getting-started.md       # 快速入门
│   ├── features.md              # 功能说明
│   └── faq.md                   # 常见问题
├── developer/                   # 开发者文档
│   ├── setup.md                 # 开发环境设置
│   ├── debugging.md             # 调试指南
│   ├── testing.md               # 测试指南
│   └── api.md                   # API 使用指南
├── deployment/                  # 部署文档
│   ├── production.md            # 生产部署
│   ├── backup.md                # 备份与恢复
│   └── security.md              # 安全最佳实践
└── adr/                         # 架构决策记录
    └── README.md
```

## 关于 Insight

Insight 是一个专业的**预言机数据分析平台**，专为 DeFi 协议和数据提供商设计。它提供来自多个协议的预言机数据的全面实时聚合、分析和监控。

### 核心功能

- 多协议预言机数据聚合（Chainlink、Pyth、RedStone、UMA 等）
- 实时价格监控和偏差分析
- 智能告警系统
- 跨链数据分析和比较
- 数据探索和搜索
- 多语言支持（中英文）

### 技术栈

- **框架**: Next.js 16 + React 19
- **语言**: TypeScript 5.7
- **样式**: Tailwind CSS 3.4
- **数据库**: PostgreSQL + Supabase
- **区块链**: viem

---

**有问题？** 请先查看 [常见问题 FAQ](./user-guide/faq.md) 或 [故障排查指南](../TROUBLESHOOTING.md)。
