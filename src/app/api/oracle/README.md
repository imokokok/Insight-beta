# Oracle API Routes 结构说明

本目录包含所有与预言机相关的 API 路由，按功能域和版本进行组织。

## 目录结构

```
app/api/oracle/
├── v1/                    # API v1 版本（预留）
│   └── ...
├── assertions/            # 断言管理
│   ├── route.ts          # 断言列表
│   └── [id]/             # 单个断言
│       ├── route.ts      # 断言详情
│       ├── evidence/     # 断言证据
│       └── timeline/     # 断言时间线
├── disputes/             # 争议管理
│   ├── route.ts          # 争议列表
│   └── [id]/             # 单个争议
├── alerts/               # 告警管理
│   ├── route.ts          # 告警列表
│   ├── [id]/             # 单个告警
│   └── rules/            # 告警规则
├── config/               # 配置管理
│   ├── route.ts          # 配置列表
│   ├── batch/            # 批量操作
│   ├── clone/            # 克隆配置
│   ├── diff/             # 配置对比
│   ├── export/           # 导出配置
│   ├── history/          # 配置历史
│   ├── search/           # 搜索配置
│   ├── templates/        # 配置模板
│   ├── validate/         # 验证配置
│   ├── versions/         # 配置版本
│   └── webhooks/         # Webhook 配置
├── instances/            # 实例管理
│   └── route.ts
├── stats/                # 统计数据
│   ├── route.ts          # 全局统计
│   └── user/             # 用户统计
├── sync/                 # 同步管理
│   └── route.ts
├── uma/                  # UMA 协议特定
│   ├── assertions/
│   ├── disputes/
│   ├── governance/
│   ├── rewards/
│   ├── staking/
│   └── ...
├── chainlink/            # Chainlink 协议特定
│   └── route.ts
├── unified/              # 统一接口
│   └── route.ts
└── README.md             # 本文件
```

## 路由命名规范

1. **使用小写和连字符**：`alert-rules`, `sync-metrics`
2. **动态路由使用方括号**：`[id]`, `[address]`
3. **嵌套资源使用子目录**：`assertions/[id]/timeline`
4. **版本控制**：使用 `v1/`, `v2/` 目录

## API 响应格式

所有 API 路由遵循统一的响应格式：

```typescript
// 成功响应
{
  "success": true,
  "data": { ... },
  "meta": { ... }  // 可选
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { ... }  // 可选
  }
}
```

## 测试文件

每个路由文件应配套一个测试文件：

- `route.ts` → `route.test.ts`
- 测试覆盖：正常请求、错误处理、边界情况

## 待优化事项

1. **版本化**：将现有路由迁移到 `v1/` 目录
2. **模块化**：将大型路由拆分为更小的处理器函数
3. **文档化**：为每个路由添加 OpenAPI 注释
