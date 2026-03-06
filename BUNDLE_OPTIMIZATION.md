# Bundle 大小优化报告

## 📊 当前配置分析

### ✅ 已实现的优化

#### 1. Tree Shaking 配置
- **optimizePackageImports**: 已配置优化以下库的导入：
  - `lucide-react` - 图标库按需加载
  - `recharts` - 图表库按需加载
  - `viem` - Web3 库优化
  - `date-fns` - 日期库按需加载
  - `@radix-ui/*` - UI 组件按需加载
  - `framer-motion` - 动画库优化

- **Webpack 优化**:
  - ✅ `usedExports: true` - 启用导出使用检测
  - ✅ `sideEffects: true` - 保留 package.json 声明的副作用
  - ✅ `mergeDuplicateChunks: true` - 合并重复代码块
  - ✅ `removeAvailableModules: true` - 移除可用模块
  - ✅ `removeEmptyChunks: true` - 移除空代码块

#### 2. 代码分割 (Code Splitting)

**已实现:**
- ✅ 路由级别自动代码分割（Next.js App Router）
- ✅ 使用 `React.lazy` 和 `Suspense` 懒加载组件
  ```tsx
  // 示例：src/app/overview/page.tsx
  const AnomalyList = lazy(() =>
    import('@/features/oracle/analytics/deviation/components/AnomalyList')
  );
  ```

- ✅ 大型第三方库异步加载配置：
  ```javascript
  // recharts, viem 配置为 async chunks
  recharts: {
    test: /[\\/]node_modules[\\/]recharts[\\/]/,
    name: 'recharts',
    chunks: 'async',  // 异步加载
  },
  viem: {
    test: /[\\/]node_modules[\\/]viem[\\/]/,
    name: 'viem',
    chunks: 'async',  // 异步加载
  }
  ```

#### 3. SplitChunks 配置

**Vendor 分块策略:**
- `framework` - React, Next.js 核心库 (priority: 40)
- `radix-ui` - Radix UI 组件库 (priority: 35)
- `recharts` - 图表库 (async, priority: 30)
- `viem` - Web3 库 (async, priority: 30)
- `utils` - 工具库 (date-fns, ramda) (priority: 25)
- `icons` - lucide-react 图标库 (priority: 25)
- `vendors` - 其他 node_modules (priority: 20)
- `commons` - 公共代码 (priority: 10)

### 🔧 优化建议

#### 建议 1: 使用动态导入优化大型组件

**问题**: 部分页面一次性加载过多组件

**解决方案**: 对大型图表组件使用动态导入

```tsx
// 示例：在页面组件中
import dynamic from 'next/dynamic';

// 服务端渲染 + 客户端交互
const ExpensiveChart = dynamic(
  () => import('@/features/charts/ExpensiveChart'),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: true,  // 保持 SSR
  }
);

// 纯客户端组件（禁用 SSR）
const InteractiveChart = dynamic(
  () => import('@/features/charts/InteractiveChart'),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,  // 仅客户端渲染
  }
);
```

#### 建议 2: 优化 Recharts 导入

**当前问题**: Recharts 按需导入但可以进一步优化

**优化前:**
```tsx
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
```

**优化后:**
```tsx
// 使用专门的子模块导入（更小 bundle）
import { LineChart } from 'recharts/chart';
import { Line } from 'recharts/shape';
import { XAxis, YAxis } from 'recharts/cartesian';
import { Tooltip } from 'recharts/component';
import { ResponsiveContainer } from 'recharts/container';
```

#### 建议 3: 优化 Viem 导入

**当前问题**: Viem 库较大，需要更精细的按需导入

**优化前:**
```tsx
import { createPublicClient, http, parseEther } from 'viem';
import { mainnet } from 'viem/chains';
```

**优化后:**
```tsx
// 使用子模块导入
import { createPublicClient } from 'viem/createPublicClient';
import { http } from 'viem/transport/http';
import { parseEther } from 'viem/utils';
import { mainnet } from 'viem/chains';
```

#### 建议 4: 优化 Lucide React 图标导入

**当前已优化**: 项目已正确按需导入图标

```tsx
// ✅ 正确的按需导入
import { Activity, TrendingUp } from 'lucide-react';

// ❌ 避免全量导入
// import * as Icons from 'lucide-react';
```

#### 建议 5: 图片资源优化

**配置已优化:**
```typescript
images: {
  formats: ['image/avif', 'image/webp'],  // 现代格式
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  minimumCacheTTL: 31536000,  // 1 年缓存
}
```

**建议:**
- 使用 `next/image` 组件自动优化图片
- 为图标使用 SVG sprites 或 icon fonts

#### 建议 6: 移除未使用依赖

**检查命令:**
```bash
# 安装 depcheck
npm install -g depcheck

# 运行检查
depcheck --ignores='@types/*,eslint,*vitest*,*playwright*'
```

**可能可移除的依赖:**
- `next-swagger-doc` - 如果未使用 API 文档
- `critters` - Next.js 已内置关键 CSS 提取
- `@solana/web3.js` - 如果未使用 Solana 链（已在 webpack 中排除）

#### 建议 7: 启用 Next.js 实验性功能

```typescript
experimental: {
  // 已启用
  optimizeCss: true,
  serverMinification: true,
  webpackBuildWorker: true,
  
  // 建议添加
  optimizeServerReact: true,     // 优化服务器端 React
  typedEnv: true,                // 类型化环境变量
  // 减少客户端 bundle
  reduceEmptyExports: true,
}
```

#### 建议 8: 使用 SWC 替代 Babel

**检查 `.babelrc` 是否存在**:
如果存在，考虑迁移到 Next.js 内置的 SWC 编译器（更快）

```json
// .swcrc (如果需要使用 SWC 自定义配置)
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    }
  }
}
```

### 📈 性能监控

#### 1. Bundle 分析

```bash
# 运行构建并分析
npm run build
npm run analyze:bundle

# 或使用 Bundle Analyzer
ANALYZE=true npm run build
```

#### 2. 关键指标目标

- **首屏加载 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **JavaScript 总大小**: < 500KB (gzip 后)
- **单个 chunk 大小**: < 250KB (gzip 后)

#### 3. Webpack Bundle Analyzer 配置

已在 `next.config.ts` 中配置：
```typescript
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});
```

### 🎯 实施清单

- [x] 1. 修正 Tree Shaking 配置（sideEffects）
- [x] 2. 添加 framer-motion 到优化导入
- [x] 3. 配置 viem 子模块别名
- [ ] 4. 对大型图表组件使用 dynamic imports
- [ ] 5. 优化 recharts 导入使用子模块
- [ ] 6. 优化 viem 导入使用子模块
- [ ] 7. 运行 depcheck 识别未使用依赖
- [ ] 8. 考虑启用更多 Next.js 实验性功能
- [ ] 9. 监控 bundle 大小变化

### 📝 测试命令

```bash
# 类型检查
npm run typecheck

# 构建测试
npm run build

# Bundle 分析
npm run analyze:bundle

# 性能测试
npm run test:e2e
```

### ⚠️ 注意事项

1. **Tree Shaking 风险**: 修改 sideEffects 配置后需要充分测试
2. **异步加载**: 大型组件异步加载可能影响首次渲染，需要 loading 状态
3. **缓存策略**: 修改 chunk 命名策略可能影响 CDN 缓存
4. **SSR 兼容性**: dynamic import 时注意 ssr: false 可能影响 SEO

### 📚 参考资料

- [Next.js Code Splitting](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)
- [Recharts Custom Bundle](https://recharts.org/en-US/guide/customization)
- [Viem Tree Shaking](https://viem.sh/docs/getting-started/installation#tree-shaking)
