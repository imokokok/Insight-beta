# OracleMonitor 文档中心

欢迎来到 OracleMonitor 文档中心。本文档涵盖了项目的所有方面，从用户指南到开发文档。

## 📚 文档导航

### 快速开始

| 文档                               | 说明               | 读者     |
| ---------------------------------- | ------------------ | -------- |
| [README.md](../README.md)          | 项目介绍、快速开始 | 所有人   |
| [USER_MANUAL.md](./USER_MANUAL.md) | 用户手册           | 终端用户 |

### 开发文档

| 文档                                                           | 说明         | 读者           |
| -------------------------------------------------------------- | ------------ | -------------- |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)                 | 开发指南     | 开发者         |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                           | 系统架构     | 开发者、架构师 |
| [ARCHITECTURE_IMPROVEMENTS.md](./ARCHITECTURE_IMPROVEMENTS.md) | 架构改进记录 | 开发者         |
| [API.md](./API.md)                                             | API 文档     | 开发者         |
| [DATABASE.md](./DATABASE.md)                                   | 数据库设计   | 开发者、DBA    |
| [CONTRACTS.md](./CONTRACTS.md)                                 | 智能合约     | 区块链开发者   |
| [ERROR_CODES.md](./ERROR_CODES.md)                             | 错误代码参考 | 开发者         |
| [UI_GUIDELINES.md](./UI_GUIDELINES.md)                         | UI 设计规范  | 前端开发者     |

### 部署运维

| 文档                                                  | 说明         | 读者       |
| ----------------------------------------------------- | ------------ | ---------- |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                      | 生产部署指南 | 运维工程师 |
| [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) | 部署检查清单 | 运维工程师 |
| [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)           | 故障排除     | 运维工程师 |

### 项目规范

| 文档                                          | 说明     |
| --------------------------------------------- | -------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md)         | 贡献指南 |
| [CODING_STANDARDS.md](../CODING_STANDARDS.md) | 代码规范 |
| [CHANGELOG.md](../CHANGELOG.md)               | 变更日志 |
| [LICENSE](../LICENSE)                         | 许可证   |

### 模块文档

| 模块       | 文档路径                                                                                        | 说明           |
| ---------- | ----------------------------------------------------------------------------------------------- | -------------- |
| Server     | [src/server/README.md](../src/server/README.md)                                                 | 服务端模块架构 |
| i18n       | [src/i18n/README.md](../src/i18n/README.md)                                                     | 国际化系统     |
| Onboarding | [src/components/features/onboarding/README.md](../src/components/features/onboarding/README.md) | 新手引导组件   |
| Scripts    | [scripts/README.md](../scripts/README.md)                                                       | 维护工具脚本   |

### 架构决策

| 文档                             | 说明               |
| -------------------------------- | ------------------ |
| [adr/README.md](./adr/README.md) | 架构决策记录 (ADR) |

## 🗂️ 项目结构

```
oracle-monitor/
├── docs/                       # 文档目录
│   ├── README.md              # 本文档
│   ├── ARCHITECTURE.md        # 架构文档
│   ├── ARCHITECTURE_IMPROVEMENTS.md  # 架构改进
│   ├── API.md                 # API 文档
│   ├── DATABASE.md            # 数据库文档
│   ├── DEPLOYMENT.md          # 部署指南
│   ├── DEVELOPMENT_GUIDE.md   # 开发指南
│   ├── USER_MANUAL.md         # 用户手册
│   ├── UI_GUIDELINES.md       # UI 规范
│   ├── ERROR_CODES.md         # 错误代码
│   ├── CONTRACTS.md           # 智能合约
│   └── adr/                   # 架构决策记录
├── src/
│   ├── app/                   # Next.js 应用
│   │   ├── api/              # API 路由
│   │   ├── oracle/           # 预言机页面
│   │   ├── alerts/           # 告警页面
│   │   ├── disputes/         # 争议页面
│   │   ├── monitoring/       # 监控页面
│   │   ├── security/         # 安全页面
│   │   └── ...
│   ├── components/
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── common/           # 通用组件
│   │   └── features/         # 功能组件
│   │       ├── alert/        # 告警组件
│   │       ├── assertion/    # 断言组件
│   │       ├── charts/       # 图表组件
│   │       ├── dashboard/    # 仪表板组件
│   │       ├── dispute/      # 争议组件
│   │       ├── monitoring/   # 监控组件
│   │       ├── onboarding/   # 新手引导
│   │       ├── oracle/       # 预言机组件
│   │       └── protocol/     # 协议组件
│   ├── server/               # 服务端逻辑
│   │   ├── alerts/           # 告警服务
│   │   ├── oracle/           # 预言机服务
│   │   ├── oracleIndexer/    # 索引器
│   │   ├── auth/             # 认证授权
│   │   └── ...
│   ├── lib/                  # 工具库
│   │   ├── shared/           # 共享模块
│   │   ├── blockchain/       # 区块链工具
│   │   └── types/            # 类型定义
│   └── i18n/                 # 国际化
├── scripts/                  # 维护脚本
├── prisma/                   # 数据库 Schema
└── ...
```

## 🚀 快速链接

### 开发相关

- [开发环境设置](./DEVELOPMENT_GUIDE.md#环境设置)
- [项目结构说明](./DEVELOPMENT_GUIDE.md#项目结构)
- [API 开发指南](./DEVELOPMENT_GUIDE.md#api-开发)
- [数据库操作](./DATABASE.md#数据库操作)

### API 相关

- [API 端点列表](./API.md)
- [错误代码参考](./ERROR_CODES.md)
- [认证方式](./API.md#认证)

### 部署相关

- [环境变量配置](./DEPLOYMENT.md#环境变量)
- [Vercel 部署](./DEPLOYMENT.md)
- [生产检查清单](../PRODUCTION_CHECKLIST.md)

### 故障排除

- [常见问题](../TROUBLESHOOTING.md)
- [错误代码说明](./ERROR_CODES.md)

## 📝 文档维护

本文档会随项目发展持续更新。如果发现文档有误或需要补充，请：

1. 提交 Issue 描述问题
2. 或者直接提交 PR 修改文档

## 📞 获取帮助

- 查看 [故障排除指南](../TROUBLESHOOTING.md)
- 查阅 [API 文档](./API.md)
- 参考 [错误代码](./ERROR_CODES.md)
