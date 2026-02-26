# 安全最佳实践

本文档介绍运行 Insight 系统的安全最佳实践，确保系统和数据的安全性。

## 概述

安全是生产环境部署的关键环节。Insight 系统处理敏感的预言机数据、用户配置和告警信息，必须采取全面的安全措施来保护这些数据。

## 身份认证安全

### 1. 管理员认证

Insight 使用令牌-based 认证系统保护管理员 API。

#### 生成强令牌

```bash
# 生成安全的管理员令牌（至少 32 字符）
openssl rand -hex 32

# 生成盐值
openssl rand -hex 16
```

#### 令牌最佳实践

- **长度**: 至少 32 个字符
- **复杂度**: 混合大小写字母、数字和特殊字符
- **轮换**: 每 90 天轮换一次
- **存储**: 绝不提交到 Git，使用安全的密钥管理系统

#### 环境变量配置

```env
# 在 .env.production 或 Vercel 环境变量中设置
INSIGHT_ADMIN_TOKEN=your-very-strong-admin-token-here
INSIGHT_ADMIN_TOKEN_SALT=your-random-salt-here
JWT_SECRET=your-jwt-secret-at-least-32-chars
```

### 2. Supabase 认证

#### 行级安全策略（RLS）

确保为所有表配置正确的 RLS 策略：

```sql
-- 启用 RLS
ALTER TABLE oracle_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 创建策略示例
CREATE POLICY "Public read access for non-sensitive data"
  ON oracle_instances FOR SELECT
  USING (true);

CREATE POLICY "Service role can modify all data"
  ON oracle_instances FOR ALL
  USING (auth.role() = 'service_role');
```

#### 密钥管理

- **Anon Key**: 用于客户端，权限受限
- **Service Role Key**: 用于服务端，完全权限，绝不暴露给客户端
- **Database Password**: 定期轮换，使用强密码

## 数据加密

### 1. 传输加密

#### HTTPS 强制

- 在 Vercel 中启用强制 HTTPS
- 使用 HSTS 头
- 配置 TLS 1.2+

```typescript
// next.config.js 或 middleware.ts 中配置
export const config = {
  headers: [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ],
    },
  ],
};
```

#### 数据库连接加密

确保数据库连接使用 SSL：

```typescript
// src/lib/database/db.ts 中已配置
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
```

### 2. 静态加密

#### 敏感配置加密

使用 `INSIGHT_CONFIG_ENCRYPTION_KEY` 加密敏感配置：

```bash
# 生成加密密钥（32 字节）
openssl rand -hex 32
```

#### Supabase 静态加密

Supabase 自动加密静态数据，确保：

- 使用 AES-256 加密
- 密钥由 Supabase 管理（或使用客户管理密钥）
- 定期轮换加密密钥

## API 安全

### 1. 速率限制

#### 配置 API 速率限制

实现速率限制以防止滥用：

```typescript
// 示例速率限制中间件
import { rateLimit } from '@/lib/rateLimit';

export const config = {
  matcher: '/api/:path*',
};

export default rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
});
```

#### 管理员 API 保护

管理员 API 应该有更严格的速率限制：

```typescript
// 管理员 API 速率限制
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 更严格的限制
});
```

### 2. 输入验证

使用 Zod 进行严格的输入验证：

```typescript
import { z } from 'zod';

const AlertSchema = z.object({
  name: z.string().min(1).max(100),
  threshold: z.number().positive(),
  chainId: z.number().int().positive(),
});

// 在 API 路由中使用
export async function POST(request: Request) {
  const body = await request.json();
  const validated = AlertSchema.parse(body);
  // ...
}
```

### 3. CORS 配置

限制跨域请求：

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://insight.yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};
```

### 4. 安全头

配置安全 HTTP 头：

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'");

  return response;
}
```

## 审计日志

### 1. 审计日志表

确保所有敏感操作都被记录：

```sql
-- 审计日志表结构
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
```

### 2. 日志内容

记录以下操作：

- 用户认证事件
- 数据修改（创建、更新、删除）
- 配置变更
- API 访问（特别是管理员 API）
- 系统错误

### 3. 日志保留

- 保留期限：至少 1 年
- 归档策略：超过保留期的日志归档到冷存储
- 完整性保护：防止日志被篡改

## 数据库安全

### 1. 最小权限原则

#### 数据库用户权限

```sql
-- 创建只读用户
CREATE USER insight_readonly WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE postgres TO insight_readonly;
GRANT USAGE ON SCHEMA public TO insight_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO insight_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO insight_readonly;

-- 应用用户只使用 service_role 进行必要的写操作
```

### 2. Drizzle ORM 安全最佳实践

#### 参数化查询

Drizzle 自动使用参数化查询，防止 SQL 注入：

```typescript
// Drizzle 自动处理参数化
const result = await db.select().from(oracleInstances).where(eq(oracleInstances.chainId, chainId));
```

#### 迁移安全

- 审查所有迁移文件
- 在测试环境先应用迁移
- 备份数据库前应用迁移
- 使用事务包裹迁移

```typescript
// 在迁移中使用事务
export async function up(db: Db) {
  await db.transaction(async (tx) => {
    // 迁移逻辑
  });
}
```

### 3. 网络安全

#### 数据库访问限制

- 在 Supabase 中配置 IP 白名单
- 只允许应用服务器访问数据库
- 使用 VPC peering（如果可用）

## 依赖安全

### 1. 依赖审计

定期审计依赖项：

```bash
# 运行安全审计
npm run lint:security

# 检查漏洞
npm audit

# 修复漏洞
npm audit fix
```

### 2. 依赖更新策略

- 定期更新依赖（至少每月一次）
- 使用 Dependabot 或 Renovate 自动更新
- 在更新前测试
- 关注安全公告

### 3. package.json 配置

```json
{
  "scripts": {
    "lint:security": "eslint src --rule 'security/*:error'",
    "audit": "npm audit"
  }
}
```

## 密钥管理

### 1. 密钥分类

| 密钥类型      | 示例                            | 轮换频率         | 存储位置        |
| ------------- | ------------------------------- | ---------------- | --------------- |
| 管理员令牌    | `INSIGHT_ADMIN_TOKEN`           | 90 天            | Vercel 环境变量 |
| JWT 密钥      | `JWT_SECRET`                    | 180 天           | Vercel 环境变量 |
| 加密密钥      | `INSIGHT_CONFIG_ENCRYPTION_KEY` | 365 天           | Vercel 环境变量 |
| Supabase 密钥 | `SUPABASE_SERVICE_ROLE_KEY`     | 随 Supabase 轮换 | Vercel 环境变量 |
| API 密钥      | `ALCHEMY_API_KEY`               | 根据提供商建议   | Vercel 环境变量 |

### 2. 密钥轮换流程

1. **生成新密钥**
2. **在密钥管理系统中更新**
3. **在 Vercel 中更新环境变量**
4. **重新部署应用**
5. **验证功能正常**
6. **撤销旧密钥**

### 3. 密钥存储

- **绝不**提交密钥到 Git
- 使用 `.gitignore` 排除 `.env` 文件
- 使用 Vercel 环境变量或类似的密钥管理服务
- 考虑使用 AWS KMS、HashiCorp Vault 等专业密钥管理系统

## 安全监控

### 1. 异常检测

监控以下异常行为：

- 短时间内大量失败的登录尝试
- 异常的数据访问模式
- 来自未知 IP 地址的管理员 API 访问
- 大量数据导出操作

### 2. 告警配置

配置安全告警：

```env
# 安全告警通知
INSIGHT_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
INSIGHT_TELEGRAM_BOT_TOKEN=your-bot-token
INSIGHT_TELEGRAM_CHAT_ID=your-chat-id
```

告警触发条件：

- 连续 5 次认证失败
- 管理员 API 从新 IP 访问
- 数据库连接异常
- 敏感数据修改

### 3. 定期安全审查

| 审查项         | 频率   | 负责人       |
| -------------- | ------ | ------------ |
| 依赖项漏洞扫描 | 每周   | DevOps       |
| 访问日志审查   | 每月   | 安全团队     |
| 权限审查       | 每季度 | 安全团队     |
| 渗透测试       | 每半年 | 外部安全团队 |
| 完整安全审计   | 每年   | 外部审计师   |

## 事件响应

### 1. 事件分类

| 严重程度 | 描述                           | 响应时间         |
| -------- | ------------------------------ | ---------------- |
| 严重     | 数据泄露、系统完全 compromised | 立即（< 1 小时） |
| 高       | 未授权访问、数据篡改           | < 4 小时         |
| 中       | 配置错误、非敏感数据泄露       | < 24 小时        |
| 低       | 可疑活动、小漏洞               | < 72 小时        |

### 2. 响应流程

1. **识别与确认**
   - 验证安全事件
   - 评估影响范围
   - 分类严重程度

2. **遏制**
   - 隔离受影响系统
   - 撤销泄露的凭据
   - 阻止攻击源

3. **根除**
   - 修复漏洞
   - 移除恶意代码
   - 加固系统

4. **恢复**
   - 从备份恢复数据
   - 验证系统完整性
   - 逐步恢复服务

5. **事后复盘**
   - 分析根本原因
   - 更新安全策略
   - 培训团队

### 3. 沟通计划

- **内部**: 立即通知技术团队和管理层
- **外部**: 根据法律要求通知受影响用户和监管机构
- **公开**: 必要时发布公开声明

## 合规性

### 1. 数据隐私

- 遵守 GDPR、CCPA 等数据保护法规
- 实现数据最小化原则
- 提供数据删除和导出功能
- 获取用户同意（如适用）

### 2. 安全标准

参考以下安全标准：

- OWASP Top 10
- NIST Cybersecurity Framework
- ISO 27001
- SOC 2

## 安全检查清单

### 部署前检查

- [ ] 所有环境变量使用强密钥
- [ ] HTTPS 已强制启用
- [ ] 安全 HTTP 头已配置
- [ ] RLS 策略已正确设置
- [ ] 速率限制已启用
- [ ] 审计日志已配置
- [ ] 依赖项已审计
- [ ] 备份策略已实施

### 定期检查

- [ ] 密钥已按计划轮换
- [ ] 依赖项已更新
- [ ] 安全审计已完成
- [ ] 备份已验证可恢复
- [ ] 日志已审查
- [ ] 权限已审核

## 相关资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Drizzle ORM Security](https://orm.drizzle.team/docs/security)

---

**返回 [文档总索引](../README.md)**
