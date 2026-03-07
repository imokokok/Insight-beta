/**
 * Shadow System - 阴影层次系统
 *
 * 设计原则：
 * 1. 根据 Z 轴深度使用不同阴影级别
 * 2. 悬停状态使用更高一级阴影
 * 3. 模态框和弹窗使用最高级阴影
 * 4. 保持视觉一致性和层次感
 */

export const SHADOWS = {
  // 无阴影
  none: 'shadow-none',

  // 极小阴影 - 用于微妙的边界提升
  xs: 'shadow-xs',

  // 小阴影 - 用于卡片、按钮的默认状态
  sm: 'shadow-sm',

  // 中等阴影 - 用于卡片、按钮的悬停状态
  md: 'shadow-md',

  // 大阴影 - 用于下拉菜单、弹窗
  lg: 'shadow-lg',

  // 超大阴影 - 用于模态框、重要提示
  xl: 'shadow-xl',

  // 2xl 阴影 - 用于全屏覆盖、重要强调
  '2xl': 'shadow-2xl',

  // 内阴影 - 用于凹陷效果
  inner: 'shadow-inner',
} as const;

export type ShadowSize = keyof typeof SHADOWS;

/**
 * 使用场景指南
 */
export const SHADOW_USAGE = {
  // 卡片组件
  cards: {
    default: SHADOWS.sm, // 默认状态
    hover: SHADOWS.md, // 悬停状态
    elevated: SHADOWS.lg, // 提升状态（如选中）
  },

  // 按钮组件
  buttons: {
    default: SHADOWS.sm, // 默认状态
    hover: SHADOWS.md, // 悬停状态
    active: SHADOWS.inner, // 激活状态（按下）
  },

  // 下拉菜单
  dropdowns: {
    default: SHADOWS.lg,
  },

  // 模态框/弹窗
  modals: {
    default: SHADOWS['2xl'],
  },

  // 工具提示
  tooltips: {
    default: SHADOWS.md,
  },

  // 通知/Toast
  toasts: {
    default: SHADOWS.lg,
  },

  // 输入框
  inputs: {
    default: SHADOWS.sm, // 默认状态
    focus: SHADOWS.md, // 聚焦状态
  },

  // 表格
  tables: {
    default: SHADOWS.sm,
    hover: SHADOWS.md, // 行悬停
  },

  // 导航栏
  navigation: {
    default: SHADOWS.md, // 固定导航栏
    scrolled: SHADOWS.lg, // 滚动后
  },

  // 悬浮操作按钮 (FAB)
  fab: {
    default: SHADOWS.lg,
    hover: SHADOWS.xl,
  },

  // 数据卡片/KPI
  dataCards: {
    default: SHADOWS.sm,
    hover: SHADOWS.md,
    highlighted: SHADOWS.lg, // 高亮/选中
  },

  // 图表容器
  charts: {
    default: SHADOWS.sm,
    fullscreen: SHADOWS['2xl'], // 全屏模式
  },
} as const;

/**
 * 阴影过渡动画配置
 */
export const SHADOW_TRANSITIONS = {
  // 快速过渡 - 用于按钮
  fast: 'transition-shadow duration-150 ease-in-out',

  // 标准过渡 - 用于卡片
  normal: 'transition-shadow duration-200 ease-in-out',

  // 慢速过渡 - 用于大型元素
  slow: 'transition-shadow duration-300 ease-in-out',
} as const;

/**
 * 获取适当的阴影类名
 *
 * @param context 使用场景（如 'card', 'button', 'modal'）
 * @param state 状态（如 'default', 'hover', 'active'）
 * @returns 阴影类名
 */
export function getShadow(context: keyof typeof SHADOW_USAGE, state: string = 'default'): string {
  const usage = SHADOW_USAGE[context];
  if (!usage) {
    return SHADOWS.sm;
  }

  const shadowValue = (usage as Record<string, string>)[state];
  return shadowValue || SHADOWS.sm;
}

/**
 * 生成带有阴影过渡的类名字符串
 *
 * @param shadowSize 阴影大小
 * @param transitionSpeed 过渡速度
 * @returns 完整的类名字符串
 */
export function shadowWithTransition(
  shadowSize: ShadowSize = 'md',
  transitionSpeed: keyof typeof SHADOW_TRANSITIONS = 'normal',
): string {
  return `${SHADOWS[shadowSize]} ${SHADOW_TRANSITIONS[transitionSpeed]}`;
}
