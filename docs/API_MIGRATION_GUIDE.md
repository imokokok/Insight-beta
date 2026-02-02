# API 迁移指南

本文档描述了 API 端点的变更和迁移路径。

## 概述

为了提高代码可维护性，我们对部分 API 端点进行了扁平化重构。旧的端点仍然可用，但已标记为弃用，将在 90 天后停用。

## 迁移时间线

- **2025-02-02**: 新端点上线，旧端点标记为弃用
- **2025-03-02**: 30 天提醒
- **2025-04-02**: 60 天提醒
- **2025-05-03**: 旧端点停用（Sunset Date）

## 已弃用的端点

### UMA Users API

| 旧端点                                           | 新端点                                           | 状态   |
| ------------------------------------------------ | ------------------------------------------------ | ------ |
| `GET /api/oracle/uma/users/{address}/stats`      | `GET /api/oracle/uma-users/{address}/stats`      | 已弃用 |
| `GET /api/oracle/uma/users/{address}/assertions` | `GET /api/oracle/uma-users/{address}/assertions` | 已弃用 |

### Config History API

| 旧端点                                 | 新端点                                 | 状态   |
| -------------------------------------- | -------------------------------------- | ------ |
| `GET /api/oracle/config/history/{id}`  | `GET /api/oracle/config-history/{id}`  | 已弃用 |
| `POST /api/oracle/config/history/{id}` | `POST /api/oracle/config-history/{id}` | 已弃用 |
| `GET /api/oracle/config/history/stats` | `GET /api/oracle/config-history/stats` | 已弃用 |

## 如何识别弃用端点

### HTTP 响应头

弃用的端点会在响应中包含以下 HTTP 头：

```http
Deprecation: true
Sunset: 2025-05-03T00:00:00.000Z
Link: </api/oracle/uma-users/0x123.../stats>; rel="successor-version"
```

- `Deprecation: true` - 表示此端点已弃用
- `Sunset` - 端点将被停用的日期（ISO 8601 格式）
- `Link` - 指向新端点的链接

### 响应体

弃用的端点仍然返回与之前相同的数据结构，不会破坏现有集成。

## 迁移步骤

### 1. 识别使用的端点

检查你的代码中是否使用了以下端点：

```bash
# 搜索旧端点模式
grep -r "uma/users" your-project/
grep -r "config/history" your-project/
```

### 2. 更新端点 URL

将旧端点 URL 替换为新端点 URL：

```typescript
// 旧代码
const response = await fetch(`/api/oracle/uma/users/${address}/stats`);

// 新代码
const response = await fetch(`/api/oracle/uma-users/${address}/stats`);
```

### 3. 验证响应

新端点的响应格式与旧端点完全相同，无需修改数据处理逻辑。

```typescript
// 新旧端点的响应格式相同
const data = await response.json();
// data 的结构没有变化
```

### 4. 测试

确保迁移后的功能正常：

```bash
# 运行测试
npm test

# 或者手动测试
npm run dev
# 访问 http://localhost:3000/api/oracle/uma-users/0x.../stats
```

## 向后兼容性

### 旧端点行为

- 旧端点将继续工作直到 Sunset Date
- 响应数据格式保持不变
- 添加了弃用警告头

### 建议的迁移策略

1. **渐进式迁移**: 逐步更新客户端代码，无需一次性全部迁移
2. **监控弃用头**: 在开发环境中监控弃用警告，及时发现需要更新的代码
3. **设置提醒**: 在日历中设置 Sunset Date 前的提醒

## 代码示例

### 使用新端点

```typescript
// 获取用户统计信息
async function getUserStats(address: string) {
  const response = await fetch(`/api/oracle/uma-users/${address}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch user stats');
  }
  return response.json();
}

// 获取用户断言列表
async function getUserAssertions(address: string, options?: { status?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', options.limit.toString());

  const response = await fetch(`/api/oracle/uma-users/${address}/assertions?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user assertions');
  }
  return response.json();
}

// 获取配置历史详情
async function getConfigHistory(id: number) {
  const response = await fetch(`/api/oracle/config-history/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch config history');
  }
  return response.json();
}

// 回滚配置
async function rollbackConfig(id: number, options?: { changeReason?: string; changedBy?: string }) {
  const response = await fetch(`/api/oracle/config-history/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });
  if (!response.ok) {
    throw new Error('Failed to rollback config');
  }
  return response.json();
}
```

### 检测弃用警告

```typescript
// 在开发环境中检测弃用警告
async function fetchWithDeprecationWarning(url: string, options?: RequestInit) {
  const response = await fetch(url, options);

  if (process.env.NODE_ENV === 'development') {
    const deprecation = response.headers.get('Deprecation');
    const sunset = response.headers.get('Sunset');
    const link = response.headers.get('Link');

    if (deprecation) {
      console.warn(`⚠️  API Deprecation Warning:`);
      console.warn(`   Endpoint: ${url}`);
      console.warn(`   Sunset Date: ${sunset}`);
      console.warn(`   New Endpoint: ${link}`);
    }
  }

  return response;
}
```

## 常见问题

### Q: 旧端点什么时候会停止工作？

A: 旧端点将在 Sunset Date（2025-05-03）后停止工作。请在此之前完成迁移。

### Q: 响应格式有变化吗？

A: 没有。新旧端点的响应格式完全相同，只需更改 URL 即可。

### Q: 我需要立即迁移吗？

A: 不需要立即迁移，但建议尽早开始。旧端点有 90 天的过渡期。

### Q: 如果我在 Sunset Date 后还在使用旧端点会怎样？

A: 旧端点将返回 404 或 410 错误。请确保在 Sunset Date 前完成迁移。

### Q: 如何获取最新的 API 文档？

A: 访问 `/api/docs/swagger` 查看 Swagger UI 文档，或访问 `/api/docs/openapi.json` 获取 OpenAPI 规范。

## 获取帮助

如果在迁移过程中遇到问题：

1. 查看 [API 文档](./API.md)
2. 检查 [Swagger UI](http://localhost:3000/api/docs/swagger)（开发环境）
3. 提交 Issue 到项目仓库

## 相关文档

- [API 文档](./API.md)
- [架构决策记录 - API 目录结构扁平化](./adr/0003-api-directory-structure.md)
