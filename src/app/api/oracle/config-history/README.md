# Config History API

扁平化后的配置历史相关 API 路由。

## 目录结构

```
config-history/
├── [id]/
│   └── route.ts      # 获取/回滚指定历史记录
└── stats/
    └── route.ts      # 获取配置历史统计信息
```

## API 端点

### GET `/api/oracle/config-history/{id}`

获取指定 ID 的配置历史记录详情。

**参数:**

- `id` (路径参数): 历史记录 ID

### POST `/api/oracle/config-history/{id}`

回滚到指定的配置版本。

**请求体:**

```json
{
  "changeReason": "Rollback to previous version",
  "changedBy": "admin"
}
```

### GET `/api/oracle/config-history/stats`

获取配置历史统计信息。

**参数:**

- `instanceId` (查询参数): 实例 ID（可选）

## 迁移说明

这些端点是从 `config/history/*` 迁移过来的，目的是减少目录嵌套层级。

旧路径:

- `/api/oracle/config/history/{id}`
- `/api/oracle/config/history/stats`

新路径:

- `/api/oracle/config-history/{id}`
- `/api/oracle/config-history/stats`
