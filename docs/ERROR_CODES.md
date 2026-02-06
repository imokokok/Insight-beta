# Error Codes Documentation - 错误码文档

本文档描述了 OracleMonitor 平台中使用的所有错误码，帮助开发者理解和处理 API 返回的错误。

## 错误响应格式

所有 API 错误都遵循统一的响应格式：

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE",
    "category": "ERROR_CATEGORY",
    "details": {
      // Additional error context
    }
  }
}
```

## 错误分类 (Error Categories)

| 分类             | 描述           | HTTP 状态码范围 |
| ---------------- | -------------- | --------------- |
| `VALIDATION`     | 输入验证错误   | 400             |
| `AUTHENTICATION` | 认证错误       | 401             |
| `AUTHORIZATION`  | 授权错误       | 403             |
| `NOT_FOUND`      | 资源未找到     | 404             |
| `CONFLICT`       | 资源冲突       | 409             |
| `RATE_LIMIT`     | 请求限流       | 429             |
| `INTERNAL`       | 内部服务器错误 | 500             |
| `EXTERNAL`       | 外部服务错误   | 502             |
| `TIMEOUT`        | 请求超时       | 504             |
| `UNAVAILABLE`    | 服务不可用     | 503             |

## 通用错误码

### 400 Bad Request

| 错误码                   | 描述                 | 场景                     |
| ------------------------ | -------------------- | ------------------------ |
| `VALIDATION_ERROR`       | 请求参数验证失败     | 缺少必填字段、格式错误   |
| `INVALID_JSON`           | 请求体 JSON 格式错误 | 请求体解析失败           |
| `INVALID_PARAMETER`      | 参数值无效           | 参数超出范围、类型不匹配 |
| `MISSING_REQUIRED_FIELD` | 缺少必填字段         | 必填字段为空或未提供     |

### 401 Unauthorized

| 错误码                 | 描述         | 场景                      |
| ---------------------- | ------------ | ------------------------- |
| `AUTHENTICATION_ERROR` | 认证失败     | Token 无效或过期          |
| `MISSING_TOKEN`        | 缺少认证令牌 | 未提供 Authorization 头   |
| `INVALID_TOKEN`        | 令牌格式错误 | Token 格式不符合 JWT 标准 |
| `TOKEN_EXPIRED`        | 令牌已过期   | 需要重新登录获取新令牌    |

### 403 Forbidden

| 错误码                     | 描述           | 场景                 |
| -------------------------- | -------------- | -------------------- |
| `AUTHORIZATION_ERROR`      | 权限不足       | 用户无权限访问资源   |
| `INSUFFICIENT_PERMISSIONS` | 权限不足       | 需要更高权限级别     |
| `RESOURCE_ACCESS_DENIED`   | 资源访问被拒绝 | 用户无权访问特定资源 |

### 404 Not Found

| 错误码               | 描述           | 场景                   |
| -------------------- | -------------- | ---------------------- |
| `NOT_FOUND`          | 资源不存在     | 请求的资源未找到       |
| `FEED_NOT_FOUND`     | 价格喂送不存在 | 指定的价格喂送 ID 无效 |
| `PROTOCOL_NOT_FOUND` | 协议不存在     | 指定的协议名称无效     |
| `USER_NOT_FOUND`     | 用户不存在     | 指定的用户 ID 无效     |
| `CONFIG_NOT_FOUND`   | 配置不存在     | 指定的配置未找到       |

### 409 Conflict

| 错误码                    | 描述       | 场景                 |
| ------------------------- | ---------- | -------------------- |
| `CONFLICT`                | 资源冲突   | 资源已存在或状态冲突 |
| `DUPLICATE_RESOURCE`      | 资源重复   | 尝试创建已存在的资源 |
| `RESOURCE_ALREADY_EXISTS` | 资源已存在 | 唯一性约束冲突       |

### 429 Too Many Requests

| 错误码                | 描述         | 场景              |
| --------------------- | ------------ | ----------------- |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 | 超过 API 速率限制 |
| `QUOTA_EXCEEDED`      | 配额已用完   | 超出每日/每月配额 |

### 500 Internal Server Error

| 错误码           | 描述           | 场景               |
| ---------------- | -------------- | ------------------ |
| `INTERNAL_ERROR` | 内部服务器错误 | 未预期的服务器错误 |
| `DATABASE_ERROR` | 数据库错误     | 数据库操作失败     |
| `CACHE_ERROR`    | 缓存错误       | 缓存操作失败       |

### 502 Bad Gateway

| 错误码                   | 描述           | 场景                   |
| ------------------------ | -------------- | ---------------------- |
| `EXTERNAL_SERVICE_ERROR` | 外部服务错误   | 依赖的外部服务返回错误 |
| `ORACLE_ERROR`           | 预言机服务错误 | 预言机协议接口错误     |
| `BLOCKCHAIN_ERROR`       | 区块链连接错误 | 无法连接到区块链节点   |

### 503 Service Unavailable

| 错误码                | 描述       | 场景           |
| --------------------- | ---------- | -------------- |
| `SERVICE_UNAVAILABLE` | 服务不可用 | 服务暂时不可用 |
| `MAINTENANCE_MODE`    | 系统维护中 | 平台正在维护   |

### 504 Gateway Timeout

| 错误码               | 描述           | 场景               |
| -------------------- | -------------- | ------------------ |
| `TIMEOUT`            | 请求超时       | 操作超时未完成     |
| `BLOCKCHAIN_TIMEOUT` | 区块链查询超时 | 区块链节点响应超时 |

## 业务特定错误码

### 预言机相关 (Oracle)

| 错误码                        | HTTP 状态 | 描述               |
| ----------------------------- | --------- | ------------------ |
| `ORACLE_FEED_STALE`           | 400       | 价格喂送数据已过期 |
| `ORACLE_FEED_UNAVAILABLE`     | 503       | 价格喂送暂时不可用 |
| `ORACLE_PRICE_DEVIATION`      | 400       | 价格偏差超过阈值   |
| `ORACLE_UNSUPPORTED_CHAIN`    | 400       | 不支持的区块链网络 |
| `ORACLE_UNSUPPORTED_PROTOCOL` | 400       | 不支持的预言机协议 |
| `ORACLE_CONTRACT_ERROR`       | 502       | 智能合约调用失败   |

### 断言相关 (Assertion)

| 错误码                       | HTTP 状态 | 描述         |
| ---------------------------- | --------- | ------------ |
| `ASSERTION_NOT_FOUND`        | 404       | 断言不存在   |
| `ASSERTION_EXPIRED`          | 400       | 断言已过期   |
| `ASSERTION_ALREADY_DISPUTED` | 409       | 断言已被争议 |
| `ASSERTION_INVALID_STATE`    | 400       | 断言状态无效 |
| `BOND_INSUFFICIENT`          | 400       | 保证金不足   |

### 争议相关 (Dispute)

| 错误码                   | HTTP 状态 | 描述           |
| ------------------------ | --------- | -------------- |
| `DISPUTE_NOT_FOUND`      | 404       | 争议不存在     |
| `DISPUTE_WINDOW_CLOSED`  | 400       | 争议窗口已关闭 |
| `DISPUTE_ALREADY_EXISTS` | 409       | 争议已存在     |
| `DISPUTE_INVALID_VOTE`   | 400       | 投票无效       |

### 配置相关 (Config)

| 错误码                    | HTTP 状态 | 描述         |
| ------------------------- | --------- | ------------ |
| `CONFIG_VALIDATION_ERROR` | 400       | 配置验证失败 |
| `CONFIG_NOT_FOUND`        | 404       | 配置不存在   |
| `CONFIG_VERSION_CONFLICT` | 409       | 配置版本冲突 |
| `CONFIG_ROLLBACK_FAILED`  | 500       | 配置回滚失败 |

### 监控相关 (Monitoring)

| 错误码                       | HTTP 状态 | 描述         |
| ---------------------------- | --------- | ------------ |
| `ALERT_NOT_FOUND`            | 404       | 告警不存在   |
| `ALERT_ALREADY_ACKNOWLEDGED` | 409       | 告警已确认   |
| `MONITOR_CONFIG_INVALID`     | 400       | 监控配置无效 |
| `NOTIFICATION_FAILED`        | 502       | 通知发送失败 |

## 错误处理最佳实践

### 前端处理建议

```typescript
import { fetchApiData } from '@/lib/utils';
import { AppError } from '@/lib/errors/AppError';

async function handleApiCall() {
  try {
    const data = await fetchApiData('/api/oracle/feeds');
    return data;
  } catch (error) {
    if (error instanceof AppError) {
      switch (error.code) {
        case 'NOT_FOUND':
          // 显示"资源不存在"提示
          showNotification('error', '请求的资源不存在');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          // 显示"请求过于频繁"提示，建议稍后重试
          showNotification('warning', '请求过于频繁，请稍后再试');
          break;
        case 'AUTHENTICATION_ERROR':
          // 重定向到登录页面
          redirectToLogin();
          break;
        default:
          showNotification('error', error.message);
      }
    } else {
      // 处理未知错误
      showNotification('error', '发生未知错误，请稍后重试');
    }
  }
}
```

### 重试策略

对于可重试的错误，建议采用指数退避策略：

```typescript
async function fetchWithRetry<T>(url: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchApiData<T>(url, options);
    } catch (error) {
      lastError = error as Error;

      // 只有特定错误才重试
      if (error instanceof AppError) {
        const retryableCodes = [
          'TIMEOUT',
          'EXTERNAL_SERVICE_ERROR',
          'ORACLE_ERROR',
          'SERVICE_UNAVAILABLE',
        ];

        if (!retryableCodes.includes(error.code)) {
          throw error;
        }
      }

      // 指数退避延迟
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

## 错误日志记录

系统会自动记录所有错误，包含以下信息：

- 错误码和错误消息
- 错误分类和 HTTP 状态码
- 请求 ID (用于追踪)
- 时间戳
- 堆栈跟踪 (开发环境)
- 请求上下文 (URL、方法、参数)

## 获取帮助

如果遇到未记录的错误码或需要更多帮助：

1. 查看 [API 文档](./API.md)
2. 查看 [故障排除指南](./TROUBLESHOOTING.md)
3. 联系技术支持: api@oracle-monitor.foresight.build
