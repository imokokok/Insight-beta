# ADR 0003: API 目录结构扁平化

## 状态

已接受

## 背景

随着项目的发展，`src/app/api/oracle/` 目录下的 API 路由越来越多，部分路由嵌套层级较深，例如：

- `src/app/api/oracle/uma/users/[address]/stats/route.ts`
- `src/app/api/oracle/config/history/[id]/route.ts`
- `src/app/api/oracle/assertions/[id]/timeline/route.ts`

深层嵌套带来了以下问题：

1. 文件路径过长，影响可读性
2. 导入路径复杂
3. 文件查找困难
4. 某些深层目录只有一个文件

## 决策

我们将对 API 目录结构进行扁平化重构，遵循以下原则：

1. **RESTful 资源路径**: 使用 `/api/{resource}/{action}` 或 `/api/{resource}/{id}/{sub-resource}` 模式
2. **最大层级限制**: API 路由的最大嵌套层级不超过 3 层
3. **扁平化深层路径**: 将深层嵌套的路径重构为更扁平的结构

## 具体变更

### 变更前

```
src/app/api/oracle/
├── uma/
│   └── users/
│       └── [address]/
│           ├── assertions/route.ts
│           └── stats/route.ts
├── config/
│   └── history/
│       ├── [id]/
│       │   └── route.ts
│       └── stats/route.ts
└── assertions/
    └── [id]/
        ├── evidence/route.ts
        └── timeline/route.ts
```

### 变更后

```
src/app/api/
├── oracle/
│   ├── uma-users/
│   │   ├── [address]/assertions/route.ts
│   │   └── [address]/stats/route.ts
│   ├── config-history/
│   │   ├── [id]/route.ts
│   │   └── stats/route.ts
│   └── assertions-detail/
│       ├── [id]/evidence/route.ts
│       └── [id]/timeline/route.ts
```

## 理由

1. **减少嵌套层级**: 从 5-6 层减少到 3-4 层
2. **提高可读性**: 更短的路径更容易理解
3. **简化导入**: 相对路径更简单
4. **便于维护**: 文件查找和导航更高效

## 后果

### 正面

- 文件路径更短，可读性更好
- 目录结构更清晰
- 减少了深层目录的维护成本

### 负面

- 需要进行一次性重构
- 需要更新相关的导入路径
- 可能需要更新文档

## 实施计划

1. 创建新的扁平化目录结构
2. 逐步迁移 API 路由文件
3. 更新相关的导入路径
4. 更新测试文件
5. 更新文档
6. 验证所有 API 端点正常工作

## 参考

- [Next.js Route Groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [RESTful API Design Best Practices](https://restfulapi.net/resource-naming/)
