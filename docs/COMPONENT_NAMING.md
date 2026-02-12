# 组件命名规范

> 统一项目中的组件命名风格，确保代码库的一致性和可维护性

## 1. 命名原则

### 1.1 基本规则

| 规则           | 说明                     | 示例                        |
| -------------- | ------------------------ | --------------------------- |
| **PascalCase** | 组件名使用帕斯卡命名     | `StatCard`, `PriceChart`    |
| **清晰明确**   | 名称应表达组件用途       | `PriceFeedList` 而非 `List` |
| **功能前缀**   | 特定功能组件使用功能前缀 | `Alert*`, `Oracle*`, `Gas*` |
| **避免冗余**   | 不重复描述通用特性       | `Card` 而非 `CardComponent` |

### 1.2 禁用词汇

```
❌ 避免使用:
- Component (冗余)
- Wrapper (除非是纯粹的包装器)
- Handler (除非是事件处理器)
- Container (除非是容器组件)
- UI / Widget (无意义后缀)
```

---

## 2. 组件类型命名

### 2.1 基础 UI 组件

使用通用名称，不带功能前缀：

```
✅ 正确:
Button, Card, Input, Table, Badge, Tabs, Modal, Dropdown

❌ 错误:
UICard, WidgetButton, InputField, TableComponent
```

### 2.2 业务组件

使用功能领域前缀：

```
✅ 正确:
AlertPanel, OracleHealthGrid, PriceFeedCard, GasPriceChart
ProtocolBadge, DisputeList, WalletConnect

❌ 错误:
Panel, Grid, Card, List (无功能前缀)
```

### 2.3 页面级组件

与路由对应，Page 作为后缀：

```
✅ 正确:
DashboardPage, AlertsPage, OracleDetailPage

❌ 错误:
Dashboard, Alerts, OracleDetail
```

---

## 3. 变体组件命名

### 3.1 变体标记

使用 `Variant` 后缀标记样式变体：

```
✅ 正确:
StatCardVariant = 'simple' | 'enhanced' | 'animated'
ButtonVariant = 'default' | 'outline' | 'ghost'

❌ 错误:
StatCardSimple, StatCardEnhanced (重复组件)
```

### 3.2 尺寸标记

使用 Size 后缀或直接属性：

```
✅ 正确:
ButtonSize = 'sm' | 'md' | 'lg'
Card size="sm" | "md" | "lg"

❌ 错误:
SmallCard, MediumCard, LargeCard
```

### 3.3 状态组件

使用状态作为属性，而非单独组件：

```
✅ 正确:
<Badge status="active" />
<Alert variant="error" />

❌ 错误:
ActiveBadge, ErrorAlert
```

---

## 4. 组件变体处理

### 4.1 多版本共存

当存在多个版本组件时，使用 **版本号** 或 **功能描述** 区分：

```
✅ 推荐方式:
// 使用 props 区分变体
<StatCard variant="enhanced" />
<StatCard variant="simple" />

// 或使用功能描述
<PriceChart type="area" />
<PriceChart type="bar" />
```

### 4.2 确实需要分离

如果组件功能差异大，可使用描述性名称：

```
✅ 可接受:
StatCard (基础版)
StatCardWithSparkline (带迷你图版)

❌ 不推荐:
StatCard (基础版)
EnhancedStatCard (增强版)
```

---

## 5. 组件导出规范

### 5.1 统一入口

所有组件通过 index 统一导出：

```typescript
// components/StatCard/index.tsx
export { StatCard } from './StatCard';
export type { StatCardProps, StatCardVariant } from './StatCard';
```

### 5.2 重命名导出

避免重命名导出，保持一致性：

```typescript
// ❌ 错误 - 造成混淆
export { StatCard as Card };

// ✅ 正确 - 保持原名
export { StatCard } from './StatCard';
```

---

## 6. 目录结构

### 6.1 组件目录

```
src/components/
├── ui/                    # 基础 UI 组件 (Button, Card, Input...)
├── common/                # 通用业务组件 (StatCard, ChartCard...)
├── features/              # 特性组件 (按功能域划分)
│   ├── alert/
│   ├── oracle/
│   ├── wallet/
│   └── ...
└── layout/                # 布局组件
```

### 6.2 组件文件

单个组件：

```
StatCard/
├── StatCard.tsx          # 组件实现
└── index.ts              # 统一导出
```

多组件：

```
Button/
├── Button.tsx            # 主要组件
├── ButtonIcon.tsx        # 图标按钮
├── ButtonGroup.tsx      # 按钮组
└── index.ts              # 统一导出
```

---

## 7. 迁移指南

### 7.1 Enhanced 前缀

现有 `Enhanced*` 组件需要逐步统一：

| 当前名称             | 目标名称     | 处理方式                            |
| -------------------- | ------------ | ----------------------------------- |
| `EnhancedStatCard`   | `StatCard`   | 合并到 `StatCard` 使用 variant 区分 |
| `EnhancedSidebar`    | `Sidebar`    | 直接重命名                          |
| `EnhancedSkeleton`   | `Skeleton`   | 直接重命名                          |
| `EnhancedEmptyState` | `EmptyState` | 直接重命名                          |
| `EnhancedInput`      | `Input`      | 直接重命名                          |
| `EnhancedChart`      | `Chart`      | 按图表类型分离                      |

### 7.2 迁移步骤

1. **识别使用点**: 搜索所有使用 `Enhanced*` 的文件
2. **更新导入**: 将 `EnhancedStatCard` 改为 `StatCard`
3. **更新属性**: 如果需要，使用 `variant` 属性切换
4. **删除旧文件**: 确认无使用后删除旧组件文件

---

## 8. 检查清单

创建新组件时检查：

- [ ] 名称是否清晰表达功能？
- [ ] 是否使用了禁用词汇？
- [ ] 是否遵循 PascalCase？
- [ ] 是否有对应的 index.ts 导出？
- [ ] 是否需要导出类型定义？
- [ ] 是否已在父级 index 中导出？
