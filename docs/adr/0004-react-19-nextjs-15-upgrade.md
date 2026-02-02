# ADR 0004: React 19 和 Next.js 15 升级

## 状态

已接受

## 背景

项目目前使用 React 19.0.0 和 Next.js 15.5.9，这些都是较新的版本。我们需要评估这个决策的风险和收益。

## 决策

我们决定继续使用 React 19 和 Next.js 15，并建立相应的兼容性监控机制。

## 理由

### 升级的收益

1. **性能提升**
   - React 19 改进了编译器和运行时性能
   - Next.js 15 优化了构建速度和运行时性能
   - 更好的 Server Components 支持

2. **新特性**
   - React Server Components 正式稳定
   - Actions 和表单处理简化
   - 改进的 Suspense 和错误处理
   - Next.js 15 的 Partial Prerendering (PPR)

3. **长期维护**
   - 使用最新版本可以获得更长时间的支持
   - 避免未来的大规模迁移
   - 可以利用最新的生态系统工具

### 风险评估

| 风险           | 可能性 | 影响 | 缓解措施                    |
| -------------- | ------ | ---- | --------------------------- |
| 第三方库不兼容 | 中     | 中   | 定期运行 `npm audit` 和测试 |
| 生产环境 Bug   | 低     | 高   | 完善的测试覆盖率和监控      |
| 开发体验问题   | 低     | 低   | 及时更新开发工具            |

## 兼容性监控

### 当前状态

- ✅ TypeScript 5.7.3 - 完全兼容
- ✅ TypeScript 严格模式 - 无类型错误
- ✅ ESLint 9.x - 正常工作
- ⚠️ 部分非空断言警告（已存在，非升级引入）

### 关键依赖兼容性检查

```bash
# 检查 React 19 兼容性
npm ls react react-dom

# 检查 Next.js 15 兼容性
npm ls next

# 检查类型定义
npm ls @types/react @types/react-dom
```

### 持续监控

1. **CI/CD 检查**
   - 每次提交运行类型检查
   - 运行完整测试套件
   - 构建测试

2. **依赖更新策略**
   - 使用 Dependabot 自动检查更新
   - 每月审查一次依赖更新
   - 关键安全更新立即应用

## 回滚计划

如果发生严重兼容性问题：

1. **React 回滚到 18.x**

   ```bash
   npm install react@18 react-dom@18
   npm install @types/react@18 @types/react-dom@18
   ```

2. **Next.js 回滚到 14.x**

   ```bash
   npm install next@14
   npm install eslint-config-next@14
   ```

3. **验证步骤**
   - 运行类型检查
   - 运行测试套件
   - 构建验证
   - 部署到预发布环境

## 最佳实践

### 开发建议

1. **使用严格类型检查**

   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

2. **避免非空断言**

   ```typescript
   // ❌ 避免
   const value = someObj.property!;

   // ✅ 推荐
   const value = someObj.property;
   if (!value) {
     throw new Error('Property is required');
   }
   ```

3. **使用 Server Components 默认**

   ```typescript
   // 默认是 Server Component
   export default function Page() {
     return <div>Server Rendered</div>;
   }

   // 明确标记 Client Component
   'use client';
   export default function ClientPage() {
     return <div>Client Rendered</div>;
   }
   ```

### 测试策略

1. **单元测试**
   - 使用 Vitest + React Testing Library
   - 测试 Server Components 和 Client Components

2. **E2E 测试**
   - 使用 Playwright
   - 覆盖关键用户流程

3. **视觉回归测试**
   - 监控 UI 变化
   - 确保升级不影响用户体验

## 后果

### 正面

- 获得最新的性能优化和特性
- 更好的开发者体验
- 长期维护成本降低
- 保持技术栈现代化

### 负面

- 需要持续关注兼容性问题
- 部分第三方库可能需要等待更新
- 团队成员需要学习新特性

## 参考

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
