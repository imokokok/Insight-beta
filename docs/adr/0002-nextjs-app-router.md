# ADR 0002: 使用 Next.js App Router

## 状态

已接受

## 背景

在选择前端框架和路由方案时，我们需要考虑：

1. 服务端渲染 (SSR) 支持
2. 静态站点生成 (SSG) 支持
3. API 路由集成
4. 开发体验和性能
5. 团队熟悉度

## 决策

我们决定使用 Next.js 15 的 App Router 作为项目的路由方案。

## 理由

1. **统一的代码库**: 前端页面和后端 API 可以在同一个项目中管理
2. **现代 React 特性**: 支持 React Server Components、Suspense、Streaming
3. **性能优化**: 内置图片优化、字体优化、代码分割
4. **TypeScript 优先**: 原生支持 TypeScript，类型安全
5. **生态系统**: 丰富的中间件和插件生态

## 后果

### 正面

- 简化了项目结构，前后端代码统一管理
- 支持最新的 React 特性
- 更好的性能和 SEO
- 团队可以使用统一的开发模式

### 负面

- App Router 相对较新，部分第三方库兼容性需要验证
- 学习曲线较陡，需要理解 Server Components 的概念
- 迁移成本（如果从 Pages Router 迁移）

## 替代方案

### Next.js Pages Router

- 更成熟，文档更丰富
- 但缺少 React Server Components 支持
- 决定：不采用，因为 App Router 是未来的方向

### 分离的前后端

- 前端使用 Vite + React
- 后端使用 Express/Fastify
- 决定：不采用，增加了部署和协调的复杂性

## 参考

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [React Server Components](https://react.dev/blog/2023/03/22/react-server-components)
