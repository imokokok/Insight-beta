# OracleMonitor 文档中心

欢迎来到 OracleMonitor 文档中心。这里包含了项目所有重要文档的索引。

## 📚 文档导航

### 快速开始

| 文档                               | 说明                             | 目标读者 |
| ---------------------------------- | -------------------------------- | -------- |
| [README.md](../README.md)          | 项目介绍、功能特性、快速开始     | 所有人   |
| [USER_MANUAL.md](./USER_MANUAL.md) | 用户手册，包含核心功能和导航说明 | 终端用户 |

### 开发文档

| 文档                                           | 说明                                          | 目标读者           |
| ---------------------------------------------- | --------------------------------------------- | ------------------ |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 开发指南，包含环境设置、项目结构、开发标准    | 开发者             |
| [ARCHITECTURE.md](./ARCHITECTURE.md)           | 系统架构文档，包含架构图、核心流程、组件关系  | 开发者、架构师     |
| [API.md](./API.md)                             | API 详细文档，包含所有端点说明、请求/响应格式 | 开发者、API 使用者 |
| [DATABASE.md](./DATABASE.md)                   | 数据库设计文档，包含表结构、索引优化策略      | 开发者、DBA        |
| [CONTRACTS.md](./CONTRACTS.md)                 | 智能合约文档，包含合约接口、事件、访问控制    | 区块链开发者       |

### 部署运维

| 文档                                                  | 说明                                                | 目标读者           |
| ----------------------------------------------------- | --------------------------------------------------- | ------------------ |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                      | 生产部署文档，包含环境变量、Docker 部署、初始化流程 | 运维工程师         |
| [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) | 生产环境检查清单                                    | 运维工程师         |
| [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)           | 故障排除指南，包含常见问题解决方案                  | 开发者、运维工程师 |

### 项目规范

| 文档                                  | 说明                             | 目标读者 |
| ------------------------------------- | -------------------------------- | -------- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南，包含代码规范、提交规范 | 贡献者   |
| [CHANGELOG.md](../CHANGELOG.md)       | 版本变更日志                     | 所有人   |
| [LICENSE](../LICENSE)                 | 许可证文件 (MIT)                 | 所有人   |

### 架构决策记录 (ADR)

位于 [adr/](./adr/) 目录，记录了项目的重要架构决策：

- [ADR 0001: 记录架构决策](./adr/0001-record-architecture-decisions.md)
- [ADR 0002: 使用 Next.js App Router](./adr/0002-nextjs-app-router.md)
- [ADR 0003: API 目录结构扁平化](./adr/0003-api-directory-structure.md)
- [ADR 0004: React 19 和 Next.js 15 升级](./adr/0004-react-19-nextjs-15-upgrade.md)

### 模块文档

| 模块        | 文档路径                                                        |
| ----------- | --------------------------------------------------------------- |
| Server 模块 | [src/server/README.md](../src/server/README.md)                 |
| 国际化系统  | [src/i18n/README.md](../src/i18n/README.md)                     |
| Oracle API  | [src/app/api/oracle/README.md](../src/app/api/oracle/README.md) |
| 脚本工具    | [scripts/README.md](../scripts/README.md)                       |
| Kubernetes  | [k8s/README.md](../k8s/README.md)                               |
| 监控栈      | [monitoring/README.md](../monitoring/README.md)                 |

### 生成文档

| 文档                                                 | 说明                    |
| ---------------------------------------------------- | ----------------------- |
| [generated/api-routes.md](./generated/api-routes.md) | 自动生成的 API 路由文档 |
| [generated/openapi.json](./generated/openapi.json)   | OpenAPI 规范文件        |

---

## 🚀 按角色快速导航

### 我是新用户

→ 从 [README.md](../README.md) 开始，然后查看 [USER_MANUAL.md](./USER_MANUAL.md)

### 我是开发者

→ 阅读 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 和 [ARCHITECTURE.md](./ARCHITECTURE.md)

### 我是运维工程师

→ 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 和 [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md)

### 我想贡献代码

→ 阅读 [CONTRIBUTING.md](../CONTRIBUTING.md) 和 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)

---

## 📝 文档维护

- 所有文档使用 Markdown 格式
- 主要文档提供中英文版本
- API 文档通过脚本自动生成
- 架构决策使用 ADR 格式记录

如有文档问题，请提交 Issue 或 Pull Request。
