# 架构决策摘要

本文档记录 OracleMonitor 项目的关键架构决策。

## 核心决策

| 决策                  | 说明                                   | 状态   |
| --------------------- | -------------------------------------- | ------ |
| Next.js App Router    | 使用 Next.js 14+ App Router 架构       | 已实施 |
| API 扁平化结构        | API 路由采用扁平化目录结构             | 已实施 |
| React 19 + Next.js 15 | 前端框架升级至最新版本                 | 已实施 |
| 多链支持              | 支持 Ethereum、BSC、Polygon、Avalanche | 已实施 |

## 技术栈

- **框架**: Next.js 15 + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL + Prisma
- **区块链**: viem + wagmi
