# Design System

Insight 的统一设计系统，确保整个应用的视觉和交互体验保持一致。

## 📁 目录结构

```
src/lib/design-system/
├── README.md              # 设计系统总览（本文件）
├── guidelines.md          # 使用指南
└── tokens/               # 设计令牌
    ├── index.ts          # 统一导出
    ├── colors.ts        # 颜色令牌
    ├── spacing.ts       # 间距令牌
    └── typography.ts    # 排版令牌
```

## 🎨 设计令牌

### 颜色令牌

统一的颜色定义，包括语义色、品牌色、组件色等。

**核心原则：**

- 统一使用 `amber` 替代 `orange`（避免颜色不一致）
- 使用语义化颜色名称
- 提供完整的颜色阶梯（50-900）
- 类型安全的颜色定义

**主要颜色类别：**

- **语义色**：success, warning, error, info
- **品牌色**：primary, secondary
- **组件色**：blue, green, amber, purple, red, cyan, pink
- **状态色**：active, stale, error, pending, settled, disputed, expired, inactive, resolved, unknown, online, offline, warning, success
- **协议色**：chainlink, pyth, band, api3, redstone, uma, dia, flux, switchboard, tellor, nest, uncl

**使用示例：**

```typescript
import { SEMANTIC_COLORS, getSemanticColor } from '@/lib/design-system/tokens';

// 直接使用颜色值
const successColor = SEMANTIC_COLORS.success[500]; // '#22c55e'

// 使用工具函数
const color = getSemanticColor('success', 500); // '#22c55e'
```

### 间距令牌

基于 4px 基准网格的统一间距系统。

**核心原则：**

- 使用 4px 基准单位
- 提供语义化间距名称
- 与 Tailwind CSS 的间距系统保持一致
- 类型安全的间距定义

**主要间距类别：**

- **基础间距**：0-128（对应 0px-512px）
- **语义间距**：none, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, full
- **组件间距**：button, card, input, badge, table, modal, dropdown, form, list, grid, section
- **响应式间距**：mobile, tablet, desktop

**使用示例：**

```typescript
import { SPACING_TOKENS, SEMANTIC_SPACING, COMPONENT_SPACING } from '@/lib/design-system/tokens';

// 基础间距
const padding = SPACING_TOKENS[4]; // '16px'

// 语义间距
const gap = SEMANTIC_SPACING.md; // '16px'

// 组件间距
const buttonPadding = COMPONENT_SPACING.button.padding.md; // '12px 24px'
```

### 排版令牌

统一的排版系统，确保文字样式的一致性。

**核心原则：**

- 使用语义化字体大小名称
- 提供一致的行高和字重
- 支持响应式排版
- 类型安全的排版定义

**主要排版类别：**

- **字体家族**：sans, mono, serif
- **字体大小**：xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl
- **字重**：light, normal, medium, semibold, bold, extrabold
- **文本样式**：h1, h2, h3, h4, h5, h6, body, body-sm, caption, label, code
- **组件排版**：button, card, badge, input, table, modal, alert, tooltip, dropdown, tabs, pagination
- **响应式排版**：mobile, tablet, desktop

**使用示例：**

```typescript
import { FONT_SIZE, TEXT_STYLES, COMPONENT_TYPOGRAPHY } from '@/lib/design-system/tokens';

// 字体大小
const fontSize = FONT_SIZE.base; // { value: '1rem', lineHeight: '1.5rem', letterSpacing: '0em' }

// 文本样式
const headingStyle = TEXT_STYLES.h1; // { fontSize: '6xl', fontWeight: 'bold', ... }

// 组件排版
const buttonTypography = COMPONENT_TYPOGRAPHY.button; // { fontSize: 'sm', fontWeight: 'medium' }
```

## 🔧 工具函数

### 颜色工具

```typescript
import {
  getSemanticColor,
  getBrandColor,
  getComponentColor,
  getStatusColor,
  getProtocolColor,
  getChartColor,
  getGradientColors,
} from '@/lib/design-system/tokens';

// 获取语义色
const color = getSemanticColor('success', 500);

// 获取品牌色
const primaryColor = getBrandColor('primary', 500);

// 获取组件颜色
const blueColor = getComponentColor('blue');

// 获取状态颜色
const statusColor = getStatusColor('active');

// 获取协议颜色
const chainlinkColor = getProtocolColor('chainlink');

// 获取图表颜色
const chartColor = getChartColor(0);

// 获取渐变色
const gradient = getGradientColors('blue'); // ['#3b82f6', '#06b6d4']
```

### 间距工具

```typescript
import { getSpacing, getSemanticSpacing, getComponentSpacing } from '@/lib/design-system/tokens';

// 获取基础间距
const spacing = getSpacing(4); // '16px'

// 获取语义间距
const gap = getSemanticSpacing('md'); // '16px'

// 获取组件间距
const padding = getComponentSpacing('button', 'padding.md'); // '12px 24px'
```

### 排版工具

```typescript
import {
  getFontSize,
  getFontWeight,
  getTextStyle,
  getFontFamily,
} from '@/lib/design-system/tokens';

// 获取字体大小
const fontSize = getFontSize('base');

// 获取字重
const weight = getFontWeight('medium'); // '500'

// 获取文本样式
const style = getTextStyle('h1');

// 获取字体家族
const fontFamily = getFontFamily('sans');
```

## 🎯 使用指南

详细的使用指南请参考 [guidelines.md](./guidelines.md)。

## 📚 相关文档

- [UI Guidelines](../../docs/UI_GUIDELINES.md)
- [Coding Standards](../../CODING_STANDARDS.md)
- [Theme Colors](../../src/lib/theme/colors.ts)

## 🔄 迁移指南

如果你正在从旧的颜色系统迁移到新的设计系统，请参考以下步骤：

1. 将 `orange` 替换为 `amber`
2. 使用 `@/lib/design-system/tokens` 中的令牌替代硬编码的颜色值
3. 使用工具函数获取颜色，而不是直接访问对象
4. 更新组件以使用新的颜色类型

## 🤝 贡献

添加新的设计令牌时，请遵循以下原则：

1. **类型安全**：确保所有令牌都有对应的 TypeScript 类型
2. **语义化**：使用有意义的名称，而不是数字或字母
3. **一致性**：遵循现有的命名约定
4. **文档**：为新令牌添加使用示例
5. **测试**：确保新令牌在所有支持的浏览器中正常工作

## 📝 版本历史

- **v1.0.0** (2024) - 初始版本，包含颜色、间距、排版令牌
