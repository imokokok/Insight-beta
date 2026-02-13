# Onboarding 组件

完整的新手引导解决方案，包含角色选择、步骤引导、交互式 Tour 等功能。

## 功能特性

- ✨ **角色化引导** - 根据用户角色（开发者、项目方、普通用户）提供差异化内容
- 🔄 **返回功能** - 支持步骤间返回和返回角色选择
- ⌨️ **键盘导航** - 支持方向键、Escape 键操作
- ♿ **可访问性** - 完整的 ARIA 属性和屏幕阅读器支持
- 🎯 **交互式 Tour** - Spotlight 高亮实际界面元素
- 🌐 **国际化** - 支持多语言
- 💾 **状态持久化** - 记住用户选择和完成状态
- 🔄 **重新查看** - 支持随时重新查看引导
- 📱 **移动端适配** - 完整的响应式设计
- 🎨 **流畅动画** - 使用 Framer Motion 实现优雅的过渡动画
- 🛡️ **错误处理** - 目标元素找不到时优雅降级

## 基础用法

```tsx
import { Onboarding } from '@/components/features/onboarding';

function App() {
  return (
    <>
      <Onboarding
        onComplete={() => console.log('Onboarding completed')}
        onSkip={() => console.log('Onboarding skipped')}
      />
      {/* Your app content */}
    </>
  );
}
```

## 强制显示引导

```tsx
<Onboarding forceOpen />
```

## 重新查看引导

```tsx
import { OnboardingReset } from '@/components/features/onboarding';

function Settings() {
  return (
    <div>
      <h2>设置</h2>
      <OnboardingReset variant="button" />
    </div>
  );
}
```

## 交互式 Tour 引导

```tsx
import { TourGuide, type TourStep } from '@/components/features/onboarding';

const tourSteps: TourStep[] = [
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: '仪表板概览',
    description: '在这里您可以查看所有关键指标',
    placement: 'bottom',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: '搜索功能',
    description: '快速找到您需要的预言机',
    placement: 'bottom',
  },
];

function App() {
  const [showTour, setShowTour] = useState(false);

  return (
    <>
      <TourGuide
        steps={tourSteps}
        isOpen={showTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
      />

      <div data-tour="dashboard">{/* Dashboard content */}</div>
      <div data-tour="search">{/* Search component */}</div>
    </>
  );
}
```

## TourGuide 高级特性

### 智能边界检测

TourGuide 会自动检测 tooltip 是否超出视口边界，并智能调整位置：

- 水平方向：如果左侧超出，尝试右侧；如果右侧超出，尝试左侧
- 垂直方向：如果顶部超出，尝试底部；如果底部超出，尝试顶部
- 确保最小可见区域（200x100px）

### 目标元素错误处理

当 `data-tour` 标记的元素不存在时：

- 显示警告提示而非崩溃
- Tooltip 居中显示
- 控制台输出警告信息便于调试

```tsx
// 目标元素不存在时的处理
<TourGuide
  steps={[
    {
      id: 'missing',
      target: '[data-tour="non-existent"]', // 元素不存在
      title: '提示',
      description: '目标元素未找到',
    },
  ]}
  isOpen={showTour}
  onComplete={handleComplete}
  onSkip={handleSkip}
/>
```

## 用户角色

系统支持 3 种用户角色，每种角色有专属的引导内容：

| 角色         | 标识        | 引导内容                       |
| ------------ | ----------- | ------------------------------ |
| **开发者**   | `developer` | API 集成、快速集成、实时监控   |
| **项目方**   | `protocol`  | 预言机监控、争议管理、智能警报 |
| **普通用户** | `general`   | 数据探索、协议比较、价格警报   |

## 键盘快捷键

| 按键  | 功能                |
| ----- | ------------------- |
| `→`   | 下一步              |
| `←`   | 上一步/返回角色选择 |
| `Esc` | 跳过/关闭引导       |

## 组件导出

```tsx
export { Onboarding, STORAGE_KEY, ROLE_STORAGE_KEY } from './Onboarding';
export type { UserRole } from './Onboarding';
export { OnboardingSteps } from './Onboarding/OnboardingSteps';
export { RoleSelection } from './Onboarding/RoleSelection';
export { TourGuide, type TourStep } from './Onboarding/TourGuide';
export { OnboardingReset } from './Onboarding/OnboardingReset';
```

## LocalStorage Keys

- `oracle-monitor-onboarding-completed` - 引导完成状态
- `oracle-monitor-user-role` - 用户选择的角色
- `oracle-monitor-onboarding-progress` - 进度状态（7天有效期）
- `oracle-monitor-tour-progress` - Tour 引导进度

## 响应式断点

组件已针对以下屏幕尺寸优化：

- **移动端** (< 640px): 全宽布局，垂直按钮排列
- **平板** (640px - 768px): 适中宽度，水平按钮排列
- **桌面** (> 768px): 固定宽度，完整布局

## 动画效果

所有组件使用 Framer Motion 实现流畅动画：

- **进入动画**: 淡入 + 缩放 + 位移
- **步骤切换**: 水平滑动过渡
- **进度条**: 平滑宽度变化
- **按钮交互**: 悬停缩放 + 点击反馈
- **角色卡片**: 交错进入动画

## 测试

```bash
npm run test -- --run src/components/features/onboarding
```

测试覆盖：

- 角色选择和步骤导航
- 键盘操作
- 状态持久化和恢复
- 7天过期机制
- 可访问性属性
