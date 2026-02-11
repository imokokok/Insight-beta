# Design System Guidelines

设计系统使用指南，包含最佳实践和常见问题解决方案。

## 📋 目录

- [颜色使用指南](#颜色使用指南)
- [间距使用指南](#间距使用指南)
- [排版使用指南](#排版使用指南)
- [组件开发指南](#组件开发指南)
- [常见问题](#常见问题)
- [迁移指南](#迁移指南)

---

## 🎨 颜色使用指南

### 核心原则

1. **统一使用 amber 替代 orange**
   - ❌ 错误：`color="orange"`
   - ✅ 正确：`color="amber"`

2. **使用语义化颜色**
   - ❌ 错误：`bg-red-500`（硬编码）
   - ✅ 正确：`bg-[${SEMANTIC_COLORS.error[500]}]`（使用令牌）

3. **优先使用工具函数**
   - ❌ 错误：`STATUS_COLORS.active.bg`
   - ✅ 正确：`getStatusColor('active').bg`

### 颜色使用场景

#### 1. 状态指示

```typescript
import { getStatusColor } from '@/lib/design-system/tokens';

// 根据状态获取颜色
const statusColor = getStatusColor('active');

// 在组件中使用
<div className={statusColor.bg}>
  <span className={statusColor.dot} />
  <span className={statusColor.text}>{statusColor.label}</span>
</div>
```

#### 2. 协议标识

```typescript
import { getProtocolColor } from '@/lib/design-system/tokens';

// 获取协议颜色
const protocolColor = getProtocolColor('chainlink'); // '#375bd2'

// 在组件中使用
<div style={{ backgroundColor: protocolColor }}>
  Chainlink
</div>
```

#### 3. 语义化反馈

```typescript
import { SEMANTIC_COLORS } from '@/lib/design-system/tokens';

// 成功状态
const successBg = SEMANTIC_COLORS.success[50];
const successText = SEMANTIC_COLORS.success[600];

// 警告状态
const warningBg = SEMANTIC_COLORS.warning[50];
const warningText = SEMANTIC_COLORS.warning[600];

// 错误状态
const errorBg = SEMANTIC_COLORS.error[50];
const errorText = SEMANTIC_COLORS.error[600];
```

#### 4. 组件颜色

```typescript
import { getComponentColor } from '@/lib/design-system/tokens';

// 获取组件颜色配置
const cardColor = getComponentColor('blue');

// 在组件中使用
<div className={cardColor.bg}>
  <div className={cardColor.text}>Title</div>
  <div className={cardColor.iconBg}>
    <Icon className={cardColor.icon} />
  </div>
</div>
```

### 颜色选择指南

| 场景 | 推荐颜色 | 说明 |
|------|----------|------|
| 成功/健康 | `emerald` | 表示积极状态 |
| 警告/注意 | `amber` | 表示需要注意的状态（不要用 orange） |
| 错误/失败 | `red` | 表示负面状态 |
| 信息/提示 | `blue` | 表示中性信息 |
| 主要操作 | `blue` | 主要按钮、链接 |
| 次要操作 | `purple` | 次要按钮、链接 |

---

## 📏 间距使用指南

### 核心原则

1. **使用 4px 基准单位**
   - 所有间距应该是 4px 的倍数
   - 使用语义化名称而不是具体像素值

2. **优先使用语义化间距**
   - ❌ 错误：`padding: 16px`
   - ✅ 正确：`padding: ${SEMANTIC_SPACING.md}`

3. **使用组件间距配置**
   - ❌ 错误：每个组件自己定义间距
   - ✅ 正确：使用 `COMPONENT_SPACING` 中的预定义配置

### 间距使用场景

#### 1. 基础间距

```typescript
import { SPACING_TOKENS } from '@/lib/design-system/tokens';

// 使用基础间距
const style = {
  padding: SPACING_TOKENS[4],    // 16px
  margin: SPACING_TOKENS[6],      // 24px
  gap: SPACING_TOKENS[2],         // 8px
};
```

#### 2. 语义化间距

```typescript
import { SEMANTIC_SPACING } from '@/lib/design-system/tokens';

// 使用语义化间距
const style = {
  padding: SEMANTIC_SPACING.md,     // 16px
  margin: SEMANTIC_SPACING.lg,      // 24px
  gap: SEMANTIC_SPACING.sm,         // 8px
};
```

#### 3. 组件间距

```typescript
import { COMPONENT_SPACING } from '@/lib/design-system/tokens';

// 使用组件间距配置
const buttonStyle = {
  padding: COMPONENT_SPACING.button.padding.md,  // '12px 24px'
  gap: COMPONENT_SPACING.button.gap,            // '8px'
};

const cardStyle = {
  padding: COMPONENT_SPACING.card.padding.md,    // '24px'
  gap: COMPONENT_SPACING.card.gap,              // '16px'
};
```

#### 4. 响应式间距

```typescript
import { RESPONSIVE_SPACING } from '@/lib/design-system/tokens';

// 使用响应式间距
const style = {
  padding: RESPONSIVE_SPACING.mobile.padding,    // '16px'
  gap: RESPONSIVE_SPACING.mobile.gap,            // '12px'
};

// 在 Tailwind 中使用
<div className="p-4 md:p-6 lg:p-8">
  Content
</div>
```

### 间距选择指南

| 场景 | 推荐间距 | 说明 |
|------|----------|------|
| 按钮内边距 | `sm: 8px 16px`, `md: 12px 24px` | 根据按钮大小选择 |
| 卡片内边距 | `sm: 16px`, `md: 24px`, `lg: 32px` | 根据卡片大小选择 |
| 表单元素间距 | `16px` | 表单字段之间的间距 |
| 列表项间距 | `sm: 8px`, `md: 16px`, `lg: 24px` | 根据列表密度选择 |
| 网格间距 | `sm: 16px`, `md: 24px`, `lg: 32px` | 根据网格大小选择 |
| 章节间距 | `32px - 64px` | 主要内容块之间的间距 |

---

## ✍️ 排版使用指南

### 核心原则

1. **使用语义化字体大小**
   - ❌ 错误：`fontSize: 16px`
   - ✅ 正确：`fontSize: FONT_SIZE.base.value`

2. **使用预定义的文本样式**
   - ❌ 错误：每个组件自己定义样式
   - ✅ 正确：使用 `TEXT_STYLES` 或 `COMPONENT_TYPOGRAPHY`

3. **保持一致的行高**
   - 使用令牌中定义的行高，确保可读性

### 排版使用场景

#### 1. 字体大小

```typescript
import { FONT_SIZE } from '@/lib/design-system/tokens';

// 使用字体大小
const style = {
  fontSize: FONT_SIZE.base.value,      // '1rem'
  lineHeight: FONT_SIZE.base.lineHeight, // '1.5rem'
  letterSpacing: FONT_SIZE.base.letterSpacing, // '0em'
};
```

#### 2. 文本样式

```typescript
import { TEXT_STYLES } from '@/lib/design-system/tokens';

// 使用预定义的文本样式
const headingStyle = TEXT_STYLES.h1;
// { fontSize: '6xl', fontWeight: 'bold', lineHeight: 'tight', letterSpacing: 'tight' }

const bodyStyle = TEXT_STYLES.body;
// { fontSize: 'base', fontWeight: 'normal', lineHeight: 'relaxed' }
```

#### 3. 组件排版

```typescript
import { COMPONENT_TYPOGRAPHY } from '@/lib/design-system/tokens';

// 使用组件排版配置
const buttonTypography = COMPONENT_TYPOGRAPHY.button;
// { fontSize: 'sm', fontWeight: 'medium' }

const cardTitle = COMPONENT_TYPOGRAPHY.card.title;
// { fontSize: 'lg', fontWeight: 'semibold' }
```

#### 4. 响应式排版

```typescript
import { RESPONSIVE_TYPOGRAPHY } from '@/lib/design-system/tokens';

// 使用响应式排版
const h1Size = RESPONSIVE_TYPOGRAPHY.mobile.h1;  // '3xl'
const h1SizeDesktop = RESPONSIVE_TYPOGRAPHY.desktop.h1;  // '6xl'

// 在 Tailwind 中使用
<h1 className="text-3xl md:text-4xl lg:text-6xl">
  Heading
</h1>
```

### 排版选择指南

| 场景 | 推荐排版 | 说明 |
|------|----------|------|
| 页面标题 | `h1` (mobile: 3xl, desktop: 6xl) | 页面主标题 |
| 章节标题 | `h2` (mobile: 2xl, desktop: 4xl) | 主要章节标题 |
| 子标题 | `h3` (mobile: xl, desktop: 3xl) | 次要章节标题 |
| 正文 | `body` (base) | 主要文本内容 |
| 辅助文本 | `body-sm` (sm) | 次要文本、说明 |
| 标签 | `label` (sm, medium) | 表单标签、按钮文本 |
| 说明文字 | `caption` (xs) | 辅助说明、时间戳 |
| 代码 | `code` (sm, mono) | 代码片段、技术文本 |

---

## 🧩 组件开发指南

### 开发新组件时

1. **使用设计令牌**
   ```typescript
   import { COMPONENT_SPACING, COMPONENT_TYPOGRAPHY } from '@/lib/design-system/tokens';
   
   export function MyCard({ children }: { children: React.ReactNode }) {
     return (
       <div 
         style={{ 
           padding: COMPONENT_SPACING.card.padding.md,
           gap: COMPONENT_SPACING.card.gap,
         }}
       >
         {children}
       </div>
     );
   }
   ```

2. **支持颜色变体**
   ```typescript
   import { ComponentColor, getComponentColor } from '@/lib/design-system/tokens';
   
   interface CardProps {
     color?: ComponentColor;
     children: React.ReactNode;
   }
   
   export function Card({ color = 'blue', children }: CardProps) {
     const colorConfig = getComponentColor(color);
     
     return (
       <div className={colorConfig.bg}>
         {children}
       </div>
     );
   }
   ```

3. **支持响应式**
   ```typescript
   export function ResponsiveCard({ children }: { children: React.ReactNode }) {
     return (
       <div className="p-4 md:p-6 lg:p-8">
         {children}
       </div>
     );
   }
   ```

### 更新现有组件时

1. **替换硬编码的颜色值**
   ```typescript
   // ❌ 之前
   <div className="bg-orange-500 text-white">
   
   // ✅ 之后
   import { getStatusColor } from '@/lib/design-system/tokens';
   const color = getStatusColor('warning');
   <div className={color.bg + ' ' + color.text}>
   ```

2. **替换硬编码的间距值**
   ```typescript
   // ❌ 之前
   <div style={{ padding: '16px', gap: '8px' }}>
   
   // ✅ 之后
   import { COMPONENT_SPACING } from '@/lib/design-system/tokens';
   <div style={{ padding: COMPONENT_SPACING.card.padding.md, gap: COMPONENT_SPACING.card.gap }}>
   ```

3. **替换硬编码的排版值**
   ```typescript
   // ❌ 之前
   <h1 style={{ fontSize: '2.25rem', fontWeight: '700' }}>
   
   // ✅ 之后
   import { TEXT_STYLES } from '@/lib/design-system/tokens';
   <h1 style={TEXT_STYLES.h3}>
   ```

---

## ❓ 常见问题

### Q: 为什么要用 amber 替代 orange？

A: `amber` 是 Tailwind CSS 的标准颜色名称，而 `orange` 不是。使用 `amber` 可以：
- 与 Tailwind 的颜色系统保持一致
- 避免类型错误
- 确保颜色的一致性

### Q: 如何添加新的颜色？

A: 在 `src/lib/design-system/tokens/colors.ts` 中添加：

```typescript
export const MY_CUSTOM_COLORS = {
  custom: {
    50: '#f0f9ff',
    // ... 其他色阶
    500: '#0ea5e9',
    // ... 其他色阶
    900: '#0c4a6e',
  },
} as const;
```

### Q: 如何添加新的间距？

A: 在 `src/lib/design-system/tokens/spacing.ts` 中添加：

```typescript
export const MY_CUSTOM_SPACING = {
  custom: '12px',
} as const;
```

### Q: 如何添加新的文本样式？

A: 在 `src/lib/design-system/tokens/typography.ts` 中添加：

```typescript
export const MY_TEXT_STYLES = {
  custom: {
    fontSize: 'lg',
    fontWeight: 'medium',
    lineHeight: 'relaxed',
  },
} as const;
```

### Q: 如何在 Tailwind 中使用设计令牌？

A: 使用 Tailwind 的任意值语法：

```typescript
import { SEMANTIC_COLORS } from '@/lib/design-system/tokens';

<div className={`bg-[${SEMANTIC_COLORS.success[500]}]`}>
  Success
</div>
```

或者使用 Tailwind 的标准颜色类：

```typescript
<div className="bg-emerald-500">
  Success
</div>
```

---

## 🔄 迁移指南

### 从旧的颜色系统迁移

#### 步骤 1：替换 orange 为 amber

```bash
# 全局搜索替换
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's/orange/amber/g'
```

#### 步骤 2：更新类型定义

```typescript
// ❌ 之前
type CardColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'cyan' | 'pink';

// ✅ 之后
import { ComponentColor } from '@/lib/design-system/tokens';
type CardColor = ComponentColor;
```

#### 步骤 3：使用设计令牌

```typescript
// ❌ 之前
const colorConfig = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  // ...
};

// ✅ 之后
import { getComponentColor } from '@/lib/design-system/tokens';
const colorConfig = getComponentColor('blue');
```

### 从硬编码值迁移

#### 步骤 1：识别硬编码值

```bash
# 搜索硬编码的颜色值
grep -r "bg-\(red\|blue\|green\|amber\|purple\|cyan\|pink\)-" src/

# 搜索硬编码的间距值
grep -r "padding:\|margin:\|gap:" src/

# 搜索硬编码的排版值
grep -r "fontSize:\|fontWeight:\|lineHeight:" src/
```

#### 步骤 2：替换为设计令牌

```typescript
// 颜色
// ❌ 之前
<div className="bg-blue-500 text-white">

// ✅ 之后
import { getComponentColor } from '@/lib/design-system/tokens';
const color = getComponentColor('blue');
<div className={color.bg + ' ' + color.text}>

// 间距
// ❌ 之前
<div style={{ padding: '16px' }}>

// ✅ 之后
import { SEMANTIC_SPACING } from '@/lib/design-system/tokens';
<div style={{ padding: SEMANTIC_SPACING.md }}>

// 排版
// ❌ 之前
<h1 style={{ fontSize: '2.25rem', fontWeight: '700' }}>

// ✅ 之后
import { TEXT_STYLES } from '@/lib/design-system/tokens';
<h1 style={TEXT_STYLES.h3}>
```

---

## 📚 相关资源

- [Design System README](./README.md)
- [UI Guidelines](../../docs/UI_GUIDELINES.md)
- [Coding Standards](../../CODING_STANDARDS.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
