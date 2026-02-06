# 代码规范

## 基础规范

- **格式**: Prettier + ESLint
- **缩进**: 2 个空格
- **引号**: 单引号
- **分号**: 必须
- **行宽**: 100 字符

## TypeScript

- 启用严格模式
- 避免使用 `any`，使用 `unknown`
- 优先类型推断，公共 API 显式声明类型

## React / Next.js

- 服务端组件默认使用
- 客户端组件使用 `"use client"` 声明
- 组件文件使用 PascalCase 命名

## 命名规范

| 类型      | 规范                 | 示例              |
| --------- | -------------------- | ----------------- |
| 文件      | PascalCase           | `OracleCard.tsx`  |
| 变量/函数 | camelCase            | `oracleData`      |
| 常量      | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 接口/类型 | PascalCase           | `UserRepository`  |

## Git 提交

使用 Conventional Commits 格式：

```
feat(oracle): add sync status indicator
fix(api): resolve rate limit issue
docs(readme): update installation guide
```

## 安全规范

- 所有用户输入使用 Zod 验证
- 敏感信息存储在环境变量
- 定期运行 `npm audit`

## 常用命令

```bash
npm run dev          # 开发
npm run build        # 构建
npm run lint         # 代码检查
npm run typecheck    # 类型检查
npm run format:write # 格式化
```
