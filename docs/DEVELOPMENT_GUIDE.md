# 开发指南

## 1. 项目概述

Insight 是一个先进的预言机监控和争议解决界面，使用现代 Web 技术栈构建。本指南将帮助您了解项目结构、开发流程和最佳实践。

## 2. 技术栈

### 2.1 前端

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **状态管理**: React Hooks + SWR (Stale-While-Revalidate)
- **Web3 集成**: `viem` for blockchain interaction, `wagmi` for wallet connection
- **图表**: Recharts
- **虚拟滚动**: React Virtuoso

### 2.2 后端

- **运行时**: Next.js Serverless Functions (Node.js)
- **数据库**: PostgreSQL
- **ORM**: pg (PostgreSQL 客户端)
- **验证**: Zod for runtime schema validation
- **API 缓存**: 双层缓存（内存 + 文件系统）

### 2.3 测试

- **测试框架**: Vitest
- **组件测试**: React Testing Library
- **API 测试**: Vitest + Supertest
- **合约测试**: Hardhat

### 2.4 开发工具

- **Linting**: ESLint
- **格式化**: Prettier
- **CI/CD**: GitHub Actions
- **Git Hooks**: Husky
- **容器化**: Docker

## 3. 项目结构

```
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # Backend API endpoints
│   │   ├── admin/     # Admin-only API routes
│   │   └── oracle/    # Oracle-related API routes
│   └── ...           # UI Pages
├── components/       # React components
│   ├── ui/           # Generic UI components
│   └── ...           # Business components
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── i18n/             # Internationalization
├── lib/              # Shared utilities and types
├── server/           # Backend logic
│   ├── oracle/       # Oracle contract interaction and indexing
│   ├── db.ts         # Database connection and queries
│   └── ...           # Other backend utilities
└── types/            # Global TypeScript types
```

## 4. 开发流程

### 4.1 环境设置

1. **克隆仓库**

   ```bash
   git clone https://github.com/insight-oracle/insight.git
   cd insight
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

5. **访问应用程序**
   ```
   http://localhost:3000
   ```

### 4.2 代码规范

- **TypeScript**: 使用严格模式，所有函数和组件必须有类型定义
- **命名规范**:
  - 组件名: PascalCase (e.g., `AssertionList`)
  - 函数名: camelCase (e.g., `useOracleTransaction`)
  - 文件命名: kebab-case (e.g., `oracle-config.ts`)
- **代码风格**: 使用 ESLint 和 Prettier 保持一致的代码风格

### 4.3 分支管理

- **main**: 主分支，包含稳定代码
- **develop**: 开发分支，包含最新功能
- **feature/xxx**: 功能分支，用于开发新功能
- **fix/xxx**: 修复分支，用于修复 bug

### 4.4 提交规范

提交信息应遵循以下格式：

```
<type>: <description>

[optional body]

[optional footer]
```

类型包括：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码风格更改（不影响功能）
- `refactor`: 代码重构（不添加新功能或修复 bug）
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

## 5. 测试

### 5.1 运行单元测试

```bash
npm test
```

### 5.2 运行 API 测试

```bash
npm test src/app/api/
```

### 5.3 运行组件测试

```bash
npm test src/components/
```

### 5.4 运行合约测试

```bash
npm run contracts:test
```

### 5.5 测试覆盖率

```bash
npm test -- --coverage
```

## 6. 构建与部署

### 6.1 构建生产版本

```bash
npm run build
```

### 6.2 运行生产服务器

```bash
npm start
```

### 6.3 部署到 Vercel

1. 连接 Vercel 到 GitHub 仓库
2. 配置环境变量
3. 触发自动部署

### 6.4 Docker 部署

```bash
# Build Docker image
docker build -t insight .

# Run Docker container
docker run -p 3000:3000 --env-file .env.local insight
```

## 7. 数据库

### 7.1 数据库架构

项目使用 PostgreSQL 数据库，主要表包括：

- `assertions`: 存储断言信息
- `disputes`: 存储争议信息
- `rate_limits`: 用于 API 速率限制
- `kv_store`: 用于存储配置和状态

### 7.2 数据库迁移

数据库迁移使用 PostgreSQL 脚本管理。所有迁移脚本位于 `scripts/migrations/` 目录。

### 7.3 本地开发数据库

可以使用 Docker 运行本地 PostgreSQL 实例：

```bash
docker run --name insight-db -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres -e POSTGRES_DB=insight -p 5432:5432 -d postgres
```

## 8. API 开发

### 8.1 API 路由结构

API 路由位于 `src/app/api/` 目录，遵循 Next.js App Router 规范。

### 8.2 认证

管理 API 路由需要认证，使用以下方式：

- `x-admin-token` header 或 `Authorization: Bearer <token>` header
- 令牌可以通过环境变量 `INSIGHT_ADMIN_TOKEN` 设置

### 8.3 速率限制

所有 API 路由都受到速率限制，配置可以通过环境变量调整。

### 8.4 缓存

API 响应使用双层缓存（内存 + 文件系统），缓存时间可以通过 `cachedJson` 函数参数调整。

### 8.5 核心 API 函数

后端提供了一系列核心函数来简化 API 开发：

#### `handleApi()`

主要的 API 处理包装器，提供统一的错误处理、日志记录和监控。

```typescript
import { handleApi } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    // 业务逻辑
    return { data: "result" };
  });
}
```

#### `cachedJson()`

缓存工具，支持内存和持久化存储。

```typescript
import { cachedJson } from "@/server/apiResponse";

const data = await cachedJson("cache-key", 60000, async () => {
  // 耗时计算或数据库查询
  return await fetchData();
});
```

#### `requireAdmin()`

管理员鉴权中间件。

```typescript
import { requireAdmin } from "@/server/apiResponse";

export async function POST(request: Request) {
  const error = await requireAdmin(request, { scope: "write" });
  if (error) return error;
  // ...
}
```

### 8.6 可观测性 (Observability)

API 集成了 OpenTelemetry 进行分布式追踪。

- **Tracing**: 响应头包含 `x-request-id`。
- **Logging**: API 访问日志根据 `INSIGHT_API_LOG_SAMPLE_RATE` 进行采样。
- **Metrics**: 记录请求耗时、状态码、路径等指标。

### 8.7 混沌工程 (Chaos Engineering)

系统支持混沌测试以验证弹性，可通过以下环境变量配置：

- `CHAOS_ENABLED`: 是否启用 (默认 false)
- `CHAOS_FAILURE_RATE`: 故障率 (默认 0.1)
- `CHAOS_MAX_DELAY_MS`: 最大网络延迟 (默认 500ms)

支持模拟网络延迟、数据库故障、服务错误等场景。

## 9. 智能合约开发

### 9.1 合约编译

```bash
npm run contracts:compile
```

### 9.2 合约部署

```bash
# Deploy to local network
npm run contracts:deploy

# Deploy to Polygon
npm run contracts:deploy:polygon

# Deploy to Arbitrum
npm run contracts:deploy:arbitrum
```

### 9.3 合约测试

```bash
npm run contracts:test
```

## 10. 国际化

### 10.1 添加新翻译

翻译文件位于 `src/i18n/translations.ts`，包含中文、英文和西班牙文翻译。

要添加新翻译键：

1. 在 `translations` 对象的所有语言版本中添加新键值对
2. 在组件中使用 `useI18n()` hook 获取翻译

### 10.2 添加新语言

1. 在 `Lang` 类型中添加新语言代码
2. 在 `languages` 数组中添加新语言选项
3. 在 `translations` 对象中添加新语言的翻译
4. 更新 `langToHtmlLang` 和 `langToLocale` 映射

## 11. 最佳实践

### 11.1 组件开发

- 组件应该是独立的、可复用的
- 使用 TypeScript 类型定义组件 props
- 组件状态应该尽量局部化
- 使用 `memo`、`useCallback` 和 `useMemo` 优化性能

### 11.2 API 开发

- 所有 API 路由应该进行输入验证
- 使用 `handleApi` 包装 API 路由处理函数
- 适当使用缓存减少数据库查询
- 添加适当的错误处理

### 11.3 测试

- 为所有新功能添加测试
- 测试应该覆盖正常和异常情况
- 优先编写集成测试，然后是单元测试
- 使用模拟（mocks）减少测试依赖

### 11.4 性能优化

- 对大型列表使用虚拟滚动
- 优化 API 响应，只返回必要的数据
- 适当使用缓存
- 优化组件渲染性能

## 12. CI/CD

### 12.1 GitHub Actions

项目使用 GitHub Actions 进行持续集成：

- 代码推送到 GitHub 时自动运行测试
- 代码合并到 main 分支时自动构建和部署
- 定期运行安全扫描

### 12.2 Pre-commit Hooks

项目使用 Husky 进行 pre-commit 检查：

- ESLint 检查
- Prettier 格式化
- TypeScript 类型检查

## 13. 故障排除

### 13.1 常见问题

1. **数据库连接错误**
   - 检查环境变量中的数据库连接字符串
   - 确保 PostgreSQL 服务正在运行
   - 确保数据库用户有正确的权限

2. **API 认证错误**
   - 确保提供了正确的管理员令牌
   - 检查环境变量中的令牌设置

3. **Web3 连接问题**
   - 确保钱包已连接
   - 确保在正确的链上
   - 检查 RPC URL 配置

4. **测试失败**
   - 检查测试依赖是否安装
   - 确保数据库已初始化
   - 检查测试环境变量配置

## 14. 贡献

欢迎贡献代码！请遵循以下流程：

1. Fork 仓库
2. 创建功能分支
3. 实现功能或修复 bug
4. 运行测试
5. 提交代码
6. 创建 Pull Request

## 15. 许可证

项目使用 MIT 许可证。请查看 `LICENSE` 文件了解详情。
