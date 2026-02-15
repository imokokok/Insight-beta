# 项目架构优化指南

## 📋 优化总结

已完成的优化：
- ✅ `src/app/oracle/dashboard/page.tsx` (672 行 → 114 行)
- ✅ `src/app/gas/page.tsx` (353 行 → 101 行)

待优化的大文件（按优先级）：
- 🔴 `src/app/oracle/analytics/deviation/page.tsx` (985 行)
- 🔴 `src/app/oracle/analytics/anomalies/page.tsx` (952 行)
- 🔴 `src/app/oracle/monitoring/page.tsx` (903 行)
- 🟡 `src/app/security/manipulation-config/page.tsx` (599 行)
- 🟡 `src/app/security/dashboard/page.tsx` (581 行)

---

## 🎯 优化原则

### 1. 单一职责原则
每个文件应该只做一件事，并且做好这件事。

### 2. 文件大小建议
- 页面组件：< 150 行（仅负责组装）
- 自定义 Hook：< 300 行（处理状态和业务逻辑）
- 子组件：< 200 行（负责特定 UI）
- 类型定义：独立文件
- 工具函数：独立文件

### 3. 目录结构标准
```
src/features/[feature-name]/[page-name]/
├── components/          # 页面专用子组件
│   ├── SomeComponent.tsx
│   └── index.ts
├── hooks/              # 页面专用 hooks
│   ├── use[PageName].ts
│   └── index.ts
├── types/              # 页面类型定义
│   └── [page-name].ts
├── utils/              # 页面工具函数
│   └── [page-name].ts
└── index.ts            # 统一导出
```

---

## 🚀 快速优化步骤

### 步骤 1：分析现有文件
```bash
# 查看文件大小排行
wc -l src/app/**/page.tsx | sort -rn
```

### 步骤 2：创建目录结构
```bash
# 对于每个大文件，创建对应的 feature 目录结构
mkdir -p src/features/[feature]/[page]/{components,hooks,types,utils}
```

### 步骤 3：提取类型定义
从原文件中提取所有 `interface` 和 `type` 到 `types/[page].ts`

### 步骤 4：提取子组件
将文件中的内部组件（如 `function Xxx() {}`）提取到 `components/` 目录

### 步骤 5：提取业务逻辑到 Hook
将所有 state、useEffect、useCallback 等逻辑提取到 `hooks/use[Page].ts`

### 步骤 6：重写页面文件
页面文件只负责：
- 导入需要的组件和 hooks
- 调用 hook 获取数据和状态
- 组装 JSX

---

## 📝 模板代码

### Hook 模板 (`hooks/use[Page].ts`)
```typescript
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSomeHook } from '@/hooks';
import { fetchApiData } from '@/shared/utils';
import type { PageData, PageState } from '../types/[page]';

export function use[Page]() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApiData<PageData>('/api/xxx');
      setData(response);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computedValue = useMemo(() => {
    return data ? process(data) : null;
  }, [data]);

  return {
    data,
    loading,
    error,
    computedValue,
    fetchData,
  };
}
```

### 页面文件模板 (`page.tsx`)
```typescript
'use client';

import { Layout } from '@/components/common';
import {
  Component1,
  Component2,
  use[Page],
} from '@/features/[feature]/[page]';

export default function [Page]Page() {
  const { data, loading, error, fetchData } = use[Page]();

  if (error) {
    return <ErrorState onRetry={fetchData} />;
  }

  return (
    <Layout>
      {loading && <LoadingState />}
      {data && (
        <>
          <Component1 data={data} />
          <Component2 data={data} />
        </>
      )}
    </Layout>
  );
}
```

---

## 🎨 子组件划分建议

### 好的子组件示例
```
components/
├── HeaderSection.tsx        # 页面头部
├── StatsCards.tsx           # 统计卡片
├── ChartSection.tsx         # 图表区域
├── DataTable.tsx            # 数据表格
└── FilterControls.tsx       # 筛选控件
```

### 避免的问题
- ❌ 不要创建过于细碎的组件（如仅返回单个 div）
- ❌ 不要让一个组件承担太多职责
- ✅ 每个组件应该有清晰的输入输出接口

---

## 📊 优化效果评估

### 成功优化的指标
1. 页面组件行数 < 150 行
2. 业务逻辑完全封装在 Hook 中
3. 子组件可独立复用和测试
4. 类型定义集中管理
5. 导入路径清晰统一

### 代码质量检查清单
- [ ] 没有超过 300 行的文件
- [ ] 每个文件有单一明确的职责
- [ ] 类型安全，没有 any 类型
- [ ] 适当的注释（只解释为什么，不是是什么）
- [ ] 统一的命名规范

---

## 🔧 工具和脚本

### 快速创建 feature 目录结构
可以创建一个脚本自动化创建目录结构：

```bash
# scripts/create-feature.sh
#!/bin/bash
FEATURE=$1
PAGE=$2

mkdir -p src/features/$FEATURE/$PAGE/{components,hooks,types,utils}
touch src/features/$FEATURE/$PAGE/index.ts
touch src/features/$FEATURE/$PAGE/components/index.ts
touch src/features/$FEATURE/$PAGE/hooks/index.ts
```

---

## 📚 参考资源

- [Feature-Sliced Design](https://feature-sliced.design/)
- [React 架构模式](https://kentcdodds.com/blog/application-state-management-with-react)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
