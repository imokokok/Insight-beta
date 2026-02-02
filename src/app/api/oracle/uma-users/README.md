# UMA Users API

扁平化后的 UMA 用户相关 API 路由。

## 目录结构

```
uma-users/
└── [address]/
    ├── assertions/     # 获取用户的断言列表
    │   └── route.ts
    └── stats/          # 获取用户统计信息
        └── route.ts
```

## API 端点

### GET `/api/oracle/uma-users/{address}/assertions`

获取指定地址用户的断言列表。

**参数:**

- `address` (路径参数): 用户以太坊地址
- `instanceId` (查询参数): 实例 ID（可选）
- `status` (查询参数): 断言状态过滤（可选）
- `limit` (查询参数): 返回数量限制（可选，默认 100）
- `offset` (查询参数): 分页偏移量（可选）

### GET `/api/oracle/uma-users/{address}/stats`

获取指定地址用户的统计信息。

**参数:**

- `address` (路径参数): 用户以太坊地址
- `instanceId` (查询参数): 实例 ID（可选）

## 迁移说明

这些端点是从 `uma/users/[address]/*` 迁移过来的，目的是减少目录嵌套层级，提高代码可维护性。

旧路径:

- `/api/oracle/uma/users/{address}/assertions`
- `/api/oracle/uma/users/{address}/stats`

新路径:

- `/api/oracle/uma-users/{address}/assertions`
- `/api/oracle/uma-users/{address}/stats`
