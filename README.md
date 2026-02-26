# Insight - Oracle Data Analytics Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4.17-cyan)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-green)
![Vitest](https://img.shields.io/badge/Vitest-Testing-yellow)
![Sentry](https://img.shields.io/badge/Sentry-Monitoring-purple)

Insight 是一个专业的**预言机数据分析平台**，专为 DeFi 协议和数据提供商设计。它提供来自多个协议的预言机数据的全面实时聚合、分析和监控。

## ✨ 功能特性

### 多协议支持（集成 5 个协议）

- **Chainlink** - 行业标准价格源和数据预言机
- **Pyth** - 来自机构来源的低延迟金融数据
- **API3** - 去中心化 API 服务，提供 dAPIs 和 Airnode
- **Band Protocol** - 跨链数据预言机平台
- **UMA** - 具有断言和争议机制的乐观预言机

### 核心功能模块

- 📊 **仪表盘** - 统一视图展示所有预言机协议的状态和关键指标
- 🔍 **预言机分析** - 价格偏差分析、争议分析、协议对比
- 📈 **价格比较** - 实时价格对比、热力图、延迟分析
- 🌐 **跨链分析** - 跨链价格比较、相关性分析、价格一致性监控
- 🔎 **数据探索** - 市场概览、热门价格源、协议和地址探索
- 🔔 **智能告警** - 价格偏差告警、陈旧检测、同步健康监控
- 🎯 **预言机专项分析** - 各协议深度分析功能
  - **API3 分析**：Airnode 监控、dAPIs 价格、OEV 监控
  - **Band Protocol 分析**：数据源验证、跨链桥监控
  - **Pyth 分析**：Publisher 监控、置信区间分析
  - **Chainlink 分析**：OCR 轮次监控、节点运营商
- 🌍 **多语言支持** - 支持中英文
- 🔌 **钱包连接** - 支持 MetaMask、Phantom、WalletConnect 等

### 技术特性

- 🔴 **实时价格聚合** - 智能异常检测聚合多个协议的价格
- 📊 **偏差分析** - 高级价格偏差分析，含趋势检测和异常识别
- 🌐 **SSE 流式传输** - 通过 Server-Sent Events 实时价格更新
- 🔒 **企业级安全** - API 密钥管理、审计日志、CSP 安全策略
- 🚀 **无服务器就绪** - 为 Vercel + Supabase 优化
- 📝 **完整 API 文档** - Swagger/OpenAPI 规范
- ⭐ **预言机可靠性评分系统** - 基于多维度指标的预言机可靠性评估
- 🛡️ **异常检测和安全监控** - 实时监控预言机数据异常和安全风险
- 💾 **Drizzle ORM** - 类型安全的数据库访问层
- 🧪 **Vitest + Playwright** - 完整的测试解决方案（单元测试 + E2E 测试）
- 🎯 **Sentry 集成** - 完整的错误追踪和性能监控
- 📦 **Web Worker** - 价格聚合计算在后台线程执行
- 🌍 **i18n 国际化** - 完整的多语言支持框架

## 🚀 快速开始

### 环境要求

- Node.js 20+
- Supabase 账户（或 PostgreSQL 16+）
- Drizzle ORM（数据库 ORM）
- RPC URLs（Alchemy、Infura、QuickNode 等）
- Sentry（可选，用于错误追踪）

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-org/insight-beta.git
cd insight-beta

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置（包括 Supabase、RPC URLs 等）

# 设置数据库（如果使用本地 Supabase）
npm run supabase:start

# 生成并推送数据库 schema
npm run db:generate
npm run db:push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用

### 数据库管理

项目使用 **Drizzle ORM** 进行数据库管理：

```bash
# 生成迁移文件
npm run db:generate

# 推送迁移到数据库
npm run db:push

# 运行迁移
npm run db:migrate

# 打开 Drizzle Studio（数据库管理界面）
npm run db:studio
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 📖 文档

### 📚 文档中心

访问 [完整文档中心](./docs/README.md) 查看所有文档。

### 快速链接

| 类别           | 文档                                                                    | 描述                   |
| -------------- | ----------------------------------------------------------------------- | ---------------------- |
| **用户文档**   | [用户快速入门](./docs/user-guide/getting-started.md)                    | 新用户快速上手指南     |
|                | [功能说明](./docs/user-guide/features.md)                               | 详细功能介绍           |
|                | [常见问题 FAQ](./docs/user-guide/faq.md)                                | 常见问题解答           |
| **开发者文档** | [开发环境设置](./docs/developer/setup.md)                               | 本地开发环境配置       |
|                | [调试指南](./docs/developer/debugging.md)                               | 调试技巧和问题排查     |
|                | [测试指南](./docs/developer/testing.md)                                 | 测试策略和最佳实践     |
|                | [API 使用指南](./docs/developer/api.md)                                 | API 接口文档           |
| **部署文档**   | [生产部署](./docs/deployment/production.md)                             | 生产环境部署指南       |
|                | [备份与恢复](./docs/deployment/backup.md)                               | 数据备份和恢复         |
|                | [安全最佳实践](./docs/deployment/security.md)                           | 安全配置指南           |
| **架构文档**   | [系统架构概述](./docs/architecture/overview.md)                         | 整体架构介绍           |
|                | [模块设计](./docs/architecture/modules.md)                              | 各模块详细设计         |
|                | [数据流图](./docs/architecture/data-flow.md)                            | 关键功能数据流         |
|                | [数据库设计](./docs/architecture/database.md)                           | 数据库 schema          |
| **参考资料**   | [编码标准](./CODING_STANDARDS.md)                                       | 代码风格和规范         |
|                | [贡献指南](./CONTRIBUTING.md)                                           | 如何贡献代码           |
|                | [生产检查清单](./PRODUCTION_CHECKLIST.md)                               | 上线前检查清单         |
|                | [故障排查指南](./TROUBLESHOOTING.md)                                    | 常见问题排查           |
|                | [变更日志](./CHANGELOG.md)                                              | 版本发布历史           |
| **项目规格**   | [部署指南](./.trae/specs/oracle-analytics-platform-launch/spec.md)      | 生产部署和上线指南     |
|                | [实现计划](./.trae/specs/oracle-analytics-platform-launch/tasks.md)     | 项目任务分解和实现计划 |
|                | [验证清单](./.trae/specs/oracle-analytics-platform-launch/checklist.md) | 上线前验证检查清单     |
| **API**        | [Swagger UI](./#api-文档)                                               | 访问 /api/docs/swagger |

## 🛠️ 开发

### 可用脚本

```bash
npm run dev                  # 启动开发服务器
npm run build                # 构建生产版本
npm run lint                 # 运行 ESLint
npm run lint:security        # 运行安全规则检查
npm run format:check         # 检查代码格式
npm run format:write         # 自动格式化代码
npm run typecheck            # 运行 TypeScript 类型检查
npm run test                 # 运行单元测试 (Vitest)
npm run test:ci              # 运行 CI 测试
npm run test:coverage        # 运行带覆盖率的测试
npm run test:coverage:report # 运行测试并打开覆盖率报告
npm run test:e2e             # 运行 E2E 测试 (Playwright)
npm run test:e2e:headed      # 运行有头模式的 E2E 测试
npm run test:chaos            # 运行混沌测试
npm run db:generate           # 生成 Drizzle 数据库迁移
npm run db:push              # 推送数据库变更
npm run db:migrate           # 运行数据库迁移
npm run db:studio            # 打开 Drizzle Studio
npm run supabase:start       # 启动本地 Supabase
npm run supabase:stop        # 停止本地 Supabase
npm run supabase:status      # 查看 Supabase 状态
npm run supabase:push        # 推送 Supabase 数据库变更
npm run supabase:pull        # 拉取 Supabase 数据库变更
npm run supabase:reset       # 重置 Supabase 数据库
npm run analyze:bundle       # 分析打包体积
npm run docs:api             # 生成 API 文档
npm run i18n:extract         # 提取翻译键
npm run i18n:validate        # 验证翻译文件
npm run changeset            # 创建变更集
npm run changeset:version    # 版本更新
npm run changeset:publish    # 发布变更
```

## 🎯 上线状态

✅ **已验证**:

- 核心功能完整性
- 代码质量检查（lint, typecheck）
- 生产构建成功
- 多语言功能（中英文）
- API 文档完整
- 钱包连接功能

📋 **部署准备**:

- 项目已准备好部署
- 环境变量配置完整
- 生产服务器可正常启动

## 🤝 贡献

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交变更（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 开启 Pull Request

详情请参阅 [Contributing Guide](./CONTRIBUTING.md) 和 [Coding Standards](./CODING_STANDARDS.md)。

## 📄 许可证

本项目采用 MIT 许可证。

---

**Built with ❤️ for the DeFi community**
