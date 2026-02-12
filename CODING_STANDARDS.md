# Coding Standards

## Base Standards

- **Formatting**: Prettier + ESLint
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Line width**: 100 characters

## TypeScript

- Enable strict mode
- Avoid `any`, use `unknown`
- Prefer type inference, explicit types for public APIs

## React / Next.js

- Use server components by default
- Use `"use client"` for client components
- Component files use PascalCase

## Naming Conventions

| Type                | Standard             | Example           |
| ------------------- | -------------------- | ----------------- |
| Files               | PascalCase           | `OracleCard.tsx`  |
| Variables/Functions | camelCase            | `oracleData`      |
| Constants           | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interfaces/Types    | PascalCase           | `UserRepository`  |

## Git Commit

Use Conventional Commits format:

```
feat(oracle): add sync status indicator
fix(api): resolve rate limit issue
docs(readme): update installation guide
```

## Security Standards

- Validate all user input with Zod
- Store sensitive information in environment variables
- Run `npm audit` regularly

## Common Commands

```bash
npm run dev          # Development
npm run build        # Build
npm run lint         # Lint
npm run typecheck   # Type check
npm run format:write # Format
```

---

# Component Standards

## Component Architecture

### Directory Structure

```
src/components/
├── ui/                    # 基础 UI 组件 (Button, Card, Badge, etc.)
├── common/                # 通用业务组件 (EmptyState, StatCard, etc.)
├── features/              # 功能模块组件
│   ├── dashboard/
│   ├── oracle/
│   ├── dispute/
│   └── ...
└── charts/                # 图表组件
```

### Component Categories

| Category           | Location               | Description                             |
| ------------------ | ---------------------- | --------------------------------------- |
| UI Components      | `components/ui/`       | 基础原子组件 (Button, Input, Modal)     |
| Common Components  | `components/common/`   | 可复用的业务组件 (StatCard, EmptyState) |
| Feature Components | `components/features/` | 特定功能的组件组合                      |
| Page Components    | `app/`                 | 页面级组件 (Next.js App Router)         |

---

## Import Guidelines

### 1. UI Components

```typescript
// ✅ 正确: 从 @/components/ui 导入
import { Button, Card, Badge } from '@/components/ui';

// ❌ 错误: 直接从组件文件导入
import { Button } from '@/components/ui/button';
```

### 2. Common Components

```typescript
// ✅ 正确: 从 @/components/common 导入
import { StatCard, EmptyState, PageHeader } from '@/components/common';

// ✅ 正确: 使用命名导出
import { StatCard, StatCardGroup } from '@/components/common';
```

### 3. Design System

```typescript
// ✅ 正确: 使用统一的设计系统
import { statusColors, StatusType, BREAKPOINTS } from '@/lib/design-system';

// ✅ 正确: 使用 CSS 变量工具
import { colors } from '@/lib/utils/colors';
const primaryColor = colors.primary.dark;
```

---

## Component Usage Patterns

### 1. StatCard (数据卡片)

```typescript
import { StatCard } from '@/components/common';

// 基本用法
<StatCard
  title="Total Value"
  value="$1,234,567"
  trend={{ direction: 'up', percentage: 12.5 }}
  icon={DollarSign}
/>

// 分组用法
<StatCardGroup>
  <StatCard title="Active" value="123" />
  <StatCard title="Pending" value="45" />
  <StatCard title="Settled" value="678" />
</StatCardGroup>
```

### 2. EmptyState (空状态)

```typescript
import { EmptyState } from '@/components/common';

// 搜索无结果
<EmptyState
  title="No results found"
  description="Try adjusting your search terms"
  icon={Search}
/>

// 自定义操作
<EmptyState
  title="No data"
  action={{
    label: 'Create New',
    onClick: handleCreate,
  }}
/>
```

### 3. Badge (状态徽章)

```typescript
import { Badge, StatusBadge } from '@/components/ui';

// 基础用法
<Badge variant="success">Active</Badge>

// 状态徽章 (自动配色)
<StatusBadge status="healthy" />
<StatusBadge status="warning" />
<StatusBadge status="error" />
```

### 4. Responsive (响应式)

```typescript
import { ResponsiveContainer, Show, Hide, DesktopOnly } from '@/components/common';

// 条件显示
<Show when={isMobile}>
  <MobileNav />
</Show>

// 桌面端专属
<DesktopOnly>
  <Sidebar />
</DesktopOnly>

// 响应式容器
<ResponsiveContainer>
  <Content />
</ResponsiveContainer>
```

---

## Color System Usage

### CSS Variables (Recommended)

```typescript
import { colors } from '@/lib/utils/colors';

// 使用 CSS 变量
<div className={colors.primary}>
  Primary Color
</div>

<div className="bg-primary/10">
  Primary with opacity
</div>
```

### Status Colors

```typescript
import { statusColors, STATUS_THEME_COLORS, StatusType } from '@/lib/design-system';

// 状态颜色映射
const getStatusStyle = (status: StatusType) => {
  const { textColor, bgColor } = STATUS_THEME_COLORS[status];
  return `${bgColor} ${textColor}`;
};
```

### Trend Colors

```typescript
import { trendColors } from '@/lib/design-system';

<span className={trendColors.positive.text}>+12%</span>
<span className={trendColors.negative.text}>-5%</span>
```

---

## Component Props Patterns

### 1. Variant Pattern

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}
```

### 2. Status Pattern

```typescript
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error';
  showDot?: boolean;
  size?: 'sm' | 'md';
}
```

### 3. Event Handler Pattern

```typescript
interface CardProps {
  onClick?: () => void;
  onHover?: () => void;
  onSelect?: (id: string) => void;
}
```

---

## Component Composition

### Layout Composition

```typescript
// 使用现有的布局组件组合
import { PageHeader, StatCardGroup, EmptyState } from '@/components/common';

function MyPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview" />

      <StatCardGroup columns={3}>
        <StatCard title="Total" value="100" />
        <StatCard title="Active" value="80" />
        <StatCard title="Pending" value="20" />
      </StatCardGroup>

      {data.length === 0 ? (
        <EmptyState title="No data" />
      ) : (
        <DataList data={data} />
      )}
    </>
  );
}
```

---

## Best Practices

### 1. Use Server Components by Default

```typescript
// ✅ 推荐: Server Component
export default function DashboardPage() {
  const data = await fetchData();
  return <StatCard value={data.total} />;
}

// 仅在需要交互时使用 Client Component
'use client';
export function InteractiveChart() {
  const [range, setRange] = useState('7d');
  return <Chart data={data} range={range} />;
}
```

### 2. Extract Reusable Logic

```typescript
// ✅ 推荐: 将重复逻辑提取到 Hook
function useOracleData(protocolId: string) {
  const [data, setData] = useState<OracleData | null>(null);

  useEffect(() => {
    fetchOracleData(protocolId).then(setData);
  }, [protocolId]);

  return { data, isLoading: !data };
}
```

### 3. Use Type-Safe Components

```typescript
// ✅ 推荐: 明确的类型定义
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage?: number;
  };
  icon?: LucideIcon;
}
```

---

## Migration Guide

### Old Import Pattern → New Import Pattern

| Category | Old                                                                | New                                                  |
| -------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| Colors   | `import { statusColors } from '@/lib/constants/colors'`            | `import { statusColors } from '@/lib/design-system'` |
| UI       | `import { Button } from '@/components/ui/button'`                  | `import { Button } from '@/components/ui'`           |
| Common   | `import { StatCard } from '@/components/common/StatCard/StatCard'` | `import { StatCard } from '@/components/common'`     |
| CSS Vars | Hardcoded colors                                                   | `import { colors } from '@/lib/utils/colors'`        |

---

## Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/common';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total" value="100" />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
```
