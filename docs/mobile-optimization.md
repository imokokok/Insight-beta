# 移动端 Web3 优化指南

本文档介绍项目中移动端适配和 Web3 钱包相关的优化方案。

## 新增功能概览

### 1. 钱包浏览器检测 (`src/lib/mobile/walletBrowser.ts`)

检测用户当前使用的浏览器环境，支持检测以下钱包：
- MetaMask
- Trust Wallet
- TokenPocket
- imToken
- Phantom
- Brave Wallet
- Coinbase Wallet
- Rainbow
- Zerion
- OKX Wallet
- Bitget Wallet

**使用示例：**

```typescript
import { 
  getWalletBrowserInfo, 
  isMobile, 
  isInWalletBrowser,
  getRecommendedWalletMethod 
} from '@/lib/mobile';

// 获取浏览器信息
const browserInfo = getWalletBrowserInfo();
console.log(browserInfo.type); // 'metamask' | 'trust' | etc.
console.log(browserInfo.name); // 'MetaMask'
console.log(browserInfo.isWalletBrowser); // true

// 检测是否在移动端
if (isMobile()) {
  // 移动端特定逻辑
}

// 获取推荐的连接方式
const method = getRecommendedWalletMethod(); 
// 'browser' | 'walletconnect' | 'deeplink'
```

### 2. Viewport 管理 (`src/hooks/useViewport.ts`)

处理移动端键盘弹出、钱包弹窗等场景下的视口变化。

**使用示例：**

```typescript
import { useViewport, useKeyboardState, useSafeArea } from '@/hooks/useViewport';

function MyComponent() {
  // 基础视口管理
  const { 
    width, 
    height, 
    visualHeight, 
    isKeyboardOpen,
    isWalletPopupOpen 
  } = useViewport({
    onKeyboardOpen: () => console.log('键盘打开'),
    onKeyboardClose: () => console.log('键盘关闭'),
    onWalletPopupOpen: () => console.log('钱包弹窗打开'),
    onWalletPopupClose: () => console.log('钱包弹窗关闭'),
  });

  // 仅键盘状态
  const { isOpen: isKeyboardOpen, height: keyboardHeight } = useKeyboardState();

  // 安全区域
  const { top, bottom, left, right } = useSafeArea();

  return <div>...</div>;
}
```

### 3. 移动端钱包连接 (`src/components/features/wallet/MobileWalletConnect.tsx`)

专为移动端优化的钱包连接组件。

**使用示例：**

```tsx
import { MobileWalletConnect, MobileWalletButton } from '@/components/features/wallet/MobileWalletConnect';

// 完整版钱包选择器（推荐）
function ConnectPage() {
  return (
    <div>
      <MobileWalletConnect />
    </div>
  );
}

// 简化版按钮
function Header() {
  return (
    <header>
      <MobileWalletButton />
    </header>
  );
}
```

### 4. 移动端链切换 (`src/components/features/wallet/MobileChainSwitcher.tsx`)

专为移动端优化的链切换组件。

**使用示例：**

```tsx
import { MobileChainSwitcher, MobileChainBadge } from '@/components/features/wallet/MobileChainSwitcher';

function Header() {
  return (
    <header className="flex items-center gap-4">
      {/* 完整链切换器 */}
      <MobileChainSwitcher />
      
      {/* 简化版徽章 */}
      <MobileChainBadge />
    </header>
  );
}
```

### 5. 移动端布局 (`src/components/layout/MobileLayout.tsx`)

处理移动端布局、安全区域、钱包浏览器检测等。

**使用示例：**

```tsx
import { 
  MobileLayout, 
  SafeAreaContainer, 
  MobileFixedBottom,
  MobileContent 
} from '@/components/layout/MobileLayout';

function App() {
  return (
    <MobileLayout>
      <SafeAreaContainer>
        <MobileContent hasBottomNav={true}>
          {/* 页面内容 */}
        </MobileContent>
      </SafeAreaContainer>
      
      <MobileFixedBottom>
        {/* 底部固定内容 */}
      </MobileFixedBottom>
    </MobileLayout>
  );
}
```

## CSS 工具类

### 动态视口高度
```css
.h-screen-dynamic {
  height: calc(var(--vh, 1vh) * 100);
}

.min-h-screen-dynamic {
  min-height: calc(var(--vh, 1vh) * 100);
}
```

### 安全区域
```css
.pt-safe { padding-top: max(env(safe-area-inset-top), 8px); }
.pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 8px); }
.pl-safe { padding-left: max(env(safe-area-inset-left), 8px); }
.pr-safe { padding-right: max(env(safe-area-inset-right), 8px); }
```

### 底部导航栏补偿
```css
.pb-nav { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
```

## 深度链接

支持生成各大钱包的深度链接：

```typescript
import { 
  getMetaMaskDeepLink, 
  getTrustWalletDeepLink,
  getTokenPocketDeepLink,
  getCurrentDeepLink 
} from '@/lib/mobile';

// MetaMask
const metamaskLink = getMetaMaskDeepLink('https://your-app.com');

// Trust Wallet
const trustLink = getTrustWalletDeepLink('https://your-app.com');

// TokenPocket
const tpLink = getTokenPocketDeepLink('https://your-app.com');

// 自动根据当前环境选择
const deepLink = getCurrentDeepLink('metamask');
```

## 钱包浏览器检测

系统会自动在 `<body>` 标签上添加以下类名：

- `wallet-metamask` - MetaMask 浏览器
- `wallet-trust` - Trust Wallet 浏览器
- `wallet-tokenpocket` - TokenPocket 浏览器
- `wallet-imtoken` - imToken 浏览器
- `wallet-phantom` - Phantom 浏览器
- `wallet-brave` - Brave 浏览器
- `wallet-coinbase` - Coinbase Wallet 浏览器
- `wallet-rainbow` - Rainbow 浏览器
- `wallet-zerion` - Zerion 浏览器
- `wallet-okx` - OKX Wallet 浏览器
- `wallet-bitget` - Bitget Wallet 浏览器
- `wallet-browser` - 通用钱包浏览器标记
- `in-app-browser` - 任何应用内置浏览器

可以使用这些类名针对特定钱包浏览器写 CSS：

```css
/* 在 MetaMask 浏览器中隐藏某些元素 */
.wallet-metamask .hide-in-metamask {
  display: none;
}

/* 在钱包浏览器中调整布局 */
.wallet-browser .adjust-for-wallet {
  padding-bottom: 80px;
}
```

## 最佳实践

1. **始终使用动态视口高度**
   ```tsx
   <div className="min-h-screen-dynamic">
   ```

2. **处理键盘弹出**
   ```tsx
   const { isKeyboardOpen } = useViewport();
   
   <div className={isKeyboardOpen ? 'pb-keyboard' : ''}>
   ```

3. **适配安全区域**
   ```tsx
   <SafeAreaContainer top bottom>
     <Content />
   </SafeAreaContainer>
   ```

4. **检测钱包浏览器并调整 UI**
   ```tsx
   const browserInfo = getWalletBrowserInfo();
   
   if (browserInfo.isWalletBrowser) {
     // 显示简化版连接按钮
   } else if (isMobile()) {
     // 显示深度链接选项
   }
   ```

5. **处理链切换失败**
   ```tsx
   const supportsChainSwitch = supportsFeature('wallet_switchEthereumChain');
   
   if (!supportsChainSwitch) {
     // 提示用户手动切换
   }
   ```

## 注意事项

1. **iOS 输入框缩放**：在 iOS 上，输入框字体大小小于 16px 时会自动缩放。确保所有输入框字体大小至少为 16px。

2. **钱包弹窗检测**：钱包弹窗检测基于启发式算法，可能不是 100% 准确。建议结合业务场景调整。

3. **深度链接兼容性**：不同钱包的深度链接实现可能有所不同，建议在实际设备上测试。

4. **安全区域**：iPhone X 及以上机型有刘海屏和底部横条，使用 `env(safe-area-inset-*)` 确保安全区域。
