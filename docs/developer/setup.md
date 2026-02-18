# 开发环境设置指南

本指南将帮助你在本地搭建 Insight 预言机数据分析平台的开发环境。

## 前置要求

在开始之前，请确保你已安装以下软件：

- **Node.js**: 20.0 或更高版本
- **npm**: 9.0 或更高版本（随 Node.js 一起安装）
- **Git**: 最新版本
- **现代浏览器**: Chrome、Firefox、Safari 或 Edge

## 1. 克隆项目

```bash
git clone https://github.com/your-org/insight-beta.git
cd insight-beta
```

## 2. 安装依赖

```bash
npm install
```

## 3. Supabase 设置

Insight 使用 Supabase 作为后端服务。你需要创建一个 Supabase 项目或使用本地开发环境。

### 选项 A: 使用 Supabase Cloud（推荐用于开发）

1. 访问 [supabase.com](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - 项目名称
   - 数据库密码（请记住这个密码！）
   - 选择离你最近的区域
4. 等待项目初始化完成（通常需要 2-5 分钟）

### 选项 B: 使用本地 Supabase

如果你想使用本地 Supabase 开发环境：

```bash
# 安装 Supabase CLI
npm install -g supabase

# 初始化 Supabase
supabase init

# 启动本地 Supabase
supabase start
```

## 4. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env.local
```

现在编辑 `.env.local` 文件，填入你的配置值。

### 必需配置项

#### Supabase 配置

从 Supabase 项目设置中获取以下信息：

```env
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"

# Supabase Anon Key（客户端使用）
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Supabase Service Role Key（服务端使用，保密！）
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# 数据库连接 URL
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

如何获取这些值：

1. 在 Supabase 仪表板中，进入你的项目
2. 点击左侧菜单的 "Settings" → "API"
3. 复制 "Project URL"、"anon public" 和 "service_role" 密钥

#### 安全配置

生成并设置以下密钥（使用强随机字符串）：

```env
# 管理员令牌 - 用于 API 认证
INSIGHT_ADMIN_TOKEN="your-strong-random-token-here"

# 管理员令牌盐值
INSIGHT_ADMIN_TOKEN_SALT="another-strong-random-string"

# JWT 密钥
JWT_SECRET="a-very-long-random-string-at-least-32-characters"
```

生成随机密钥的方法：

```bash
# 使用 Node.js 生成随机字符串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### RPC 端点配置

你需要配置区块链 RPC 端点来获取预言机数据。

**选项 1: 使用 Alchemy（推荐）**

1. 注册 [Alchemy](https://www.alchemy.com) 账户
2. 创建应用获取 API Key
3. 配置环境变量：

```env
ALCHEMY_API_KEY="your-alchemy-api-key"
```

**选项 2: 使用 Infura**

1. 注册 [Infura](https://infura.io) 账户
2. 创建项目获取 API Key
3. 配置环境变量：

```env
INFURA_API_KEY="your-infura-api-key"
```

**选项 3: 使用自定义 RPC URL**

如果你有自己的 RPC 节点或其他提供商：

```env
ETHEREUM_RPC_URL="https://your-ethereum-rpc.com"
POLYGON_RPC_URL="https://your-polygon-rpc.com"
# ... 其他链
```

### 可选配置项

#### 告警通知配置

```env
# Slack
INSIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Telegram
INSIGHT_TELEGRAM_BOT_TOKEN="your-bot-token"
INSIGHT_TELEGRAM_CHAT_ID="your-chat-id"

# Webhook
INSIGHT_WEBHOOK_URL="https://your-webhook-url.com"
```

#### Sentry 错误追踪

```env
SENTRY_DSN="https://your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="https://your-public-sentry-dsn"
```

#### 演示模式

如果你想在没有真实数据的情况下测试 UI：

```env
INSIGHT_DEMO_MODE="true"
```

## 5. 数据库设置

### 运行数据库迁移

```bash
# 推送数据库 schema 到 Supabase
npm run supabase:push
```

### 验证数据库连接

```bash
# 打开 Supabase Studio
npm run supabase:studio
```

## 6. 启动开发服务器

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

## 7. 验证安装

### 检查应用是否正常运行

1. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)
2. 你应该能看到 Insight 仪表板
3. 检查控制台是否有错误

### 运行健康检查

```bash
curl http://localhost:3000/api/health
```

应该返回：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 运行测试

```bash
# 运行单元测试
npm run test

# 运行类型检查
npm run typecheck

# 运行 lint
npm run lint
```

## 8. 常见问题

### 问题: 数据库连接失败

**解决方案**:

- 检查 `DATABASE_URL` 是否正确
- 确认 Supabase 项目已启动
- 检查网络连接和防火墙设置

### 问题: RPC 请求失败

**解决方案**:

- 确认 RPC API Key 有效且有足够配额
- 尝试使用其他 RPC 提供商
- 检查网络连接

### 问题: 依赖安装失败

**解决方案**:

```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 问题: 端口 3000 已被占用

**解决方案**:

```bash
# 查找占用端口的进程
lsof -ti :3000 | xargs kill -9

# 或使用其他端口
PORT=3001 npm run dev
```

## 9. 开发工作流

### 可用的 npm 脚本

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm start                # 启动生产服务器
npm run lint             # 运行 ESLint
npm run typecheck        # 运行 TypeScript 类型检查
npm run test             # 运行单元测试
npm run test:ci          # 运行 CI 测试
npm run test:coverage    # 运行带覆盖率的测试
npm run test:e2e         # 运行 E2E 测试
npm run supabase:push    # 推送数据库变更
npm run supabase:studio  # 打开 Supabase Studio
```

### 代码规范

在提交代码前，请确保：

```bash
# 运行 lint 和 typecheck
npm run lint
npm run typecheck

# 运行测试
npm run test
```

更多信息请参考 [编码标准](../../CODING_STANDARDS.md)。

## 10. 下一步

现在你的开发环境已经设置好了！

- 查看 [系统架构概述](../architecture/overview.md) 了解系统架构
- 阅读 [编码标准](../../CODING_STANDARDS.md) 了解代码规范
- 查看 [调试指南](./debugging.md) 学习如何调试问题
- 阅读 [贡献指南](../../CONTRIBUTING.md) 了解如何贡献代码

---

**需要帮助？** 请查看 [故障排查指南](../../TROUBLESHOOTING.md) 或在 GitHub 上提交 issue。
