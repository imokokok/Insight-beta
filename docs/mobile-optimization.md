# Mobile Web3 Optimization Guide

This document introduces mobile adaptation and Web3 wallet-related optimization solutions in the project.

## New Features Overview

### 1. Wallet Browser Detection (`src/lib/mobile/walletBrowser.ts`)

Detect the browser environment users are currently using, supporting detection of the following wallets:

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

**Usage Example:**

```typescript
import {
  getWalletBrowserInfo,
  isMobile,
  isInWalletBrowser,
  getRecommendedWalletMethod,
} from '@/lib/mobile';

// Get browser info
const browserInfo = getWalletBrowserInfo();
console.log(browserInfo.type); // 'metamask' | 'trust' | etc.
console.log(browserInfo.name); // 'MetaMask'
console.log(browserInfo.isWalletBrowser); // true

// Detect if on mobile
if (isMobile()) {
  // Mobile-specific logic
}

// Get recommended connection method
const method = getRecommendedWalletMethod();
// 'browser' | 'walletconnect' | 'deeplink'
```

### 2. Viewport Management (`src/hooks/useViewport.ts`)

Handle viewport changes in scenarios like mobile keyboard popping up, wallet popups, etc.

**Usage Example:**

```typescript
import { useViewport, useKeyboardState, useSafeArea } from '@/hooks/useViewport';

function MyComponent() {
  // Basic viewport management
  const {
    width,
    height,
    visualHeight,
    isKeyboardOpen,
    isWalletPopupOpen
  } = useViewport({
    onKeyboardOpen: () => console.log('Keyboard opened'),
    onKeyboardClose: () => console.log('Keyboard closed'),
    onWalletPopupOpen: () => console.log('Wallet popup opened'),
    onWalletPopupClose: () => console.log('Wallet popup closed'),
  });

  // Keyboard state only
  const { isOpen: isKeyboardOpen, height: keyboardHeight } = useKeyboardState();

  // Safe area
  const { top, bottom, left, right } = useSafeArea();

  return <div>...</div>;
}
```

### 3. Mobile Wallet Connection (`src/components/features/wallet/MobileWalletConnect.tsx`)

Wallet connection component optimized for mobile.

**Usage Example:**

```tsx
import {
  MobileWalletConnect,
  MobileWalletButton,
} from '@/components/features/wallet/MobileWalletConnect';

// Full version wallet selector (recommended)
function ConnectPage() {
  return (
    <div>
      <MobileWalletConnect />
    </div>
  );
}

// Simplified version button
function Header() {
  return (
    <header>
      <MobileWalletButton />
    </header>
  );
}
```

### 4. Mobile Chain Switching (`src/components/features/wallet/MobileChainSwitcher.tsx`)

Chain switching component optimized for mobile.

**Usage Example:**

```tsx
import {
  MobileChainSwitcher,
  MobileChainBadge,
} from '@/components/features/wallet/MobileChainSwitcher';

function Header() {
  return (
    <header className="flex items-center gap-4">
      {/* Full chain switcher */}
      <MobileChainSwitcher />

      {/* Simplified version badge */}
      <MobileChainBadge />
    </header>
  );
}
```

### 5. Mobile Layout (`src/components/layout/MobileLayout.tsx`)

Handle mobile layout, safe areas, wallet browser detection, etc.

**Usage Example:**

```tsx
import {
  MobileLayout,
  SafeAreaContainer,
  MobileFixedBottom,
  MobileContent,
} from '@/components/layout/MobileLayout';

function App() {
  return (
    <MobileLayout>
      <SafeAreaContainer>
        <MobileContent hasBottomNav={true}>{/* Page content */}</MobileContent>
      </SafeAreaContainer>

      <MobileFixedBottom>{/* Bottom fixed content */}</MobileFixedBottom>
    </MobileLayout>
  );
}
```

## CSS Utilities

### Dynamic Viewport Height

```css
.h-screen-dynamic {
  height: calc(var(--vh, 1vh) * 100);
}

.min-h-screen-dynamic {
  min-height: calc(var(--vh, 1vh) * 100);
}
```

### Safe Areas

```css
.pt-safe {
  padding-top: max(env(safe-area-inset-top), 8px);
}
.pb-safe {
  padding-bottom: max(env(safe-area-inset-bottom), 8px);
}
.pl-safe {
  padding-left: max(env(safe-area-inset-left), 8px);
}
.pr-safe {
  padding-right: max(env(safe-area-inset-right), 8px);
}
```

### Bottom Navigation Bar Compensation

```css
.pb-nav {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
```

## Deep Links

Support generating deep links for major wallets:

```typescript
import {
  getMetaMaskDeepLink,
  getTrustWalletDeepLink,
  getTokenPocketDeepLink,
  getCurrentDeepLink,
} from '@/lib/mobile';

// MetaMask
const metamaskLink = getMetaMaskDeepLink('https://your-app.com');

// Trust Wallet
const trustLink = getTrustWalletDeepLink('https://your-app.com');

// TokenPocket
const tpLink = getTokenPocketDeepLink('https://your-app.com');

// Auto-select based on current environment
const deepLink = getCurrentDeepLink('metamask');
```

## Wallet Browser Detection

The system automatically adds the following class names to the `<body>` tag:

- `wallet-metamask` - MetaMask browser
- `wallet-trust` - Trust Wallet browser
- `wallet-tokenpocket` - TokenPocket browser
- `wallet-imtoken` - imToken browser
- `wallet-phantom` - Phantom browser
- `wallet-brave` - Brave browser
- `wallet-coinbase` - Coinbase Wallet browser
- `wallet-rainbow` - Rainbow browser
- `wallet-zerion` - Zerion browser
- `wallet-okx` - OKX Wallet browser
- `wallet-bitget` - Bitget Wallet browser
- `wallet-browser` - Generic wallet browser marker
- `in-app-browser` - Any in-app browser

You can use these class names to write CSS for specific wallet browsers:

```css
/* Hide certain elements in MetaMask browser */
.wallet-metamask .hide-in-metamask {
  display: none;
}

/* Adjust layout in wallet browser */
.wallet-browser .adjust-for-wallet {
  padding-bottom: 80px;
}
```

## Best Practices

1. **Always Use Dynamic Viewport Height**

   ```tsx
   <div className="min-h-screen-dynamic">
   ```

2. **Handle Keyboard Pop-up**

   ```tsx
   const { isKeyboardOpen } = useViewport();

   <div className={isKeyboardOpen ? 'pb-keyboard' : ''}>
   ```

3. **Adapt to Safe Areas**

   ```tsx
   <SafeAreaContainer top bottom>
     <Content />
   </SafeAreaContainer>
   ```

4. **Detect Wallet Browser and Adjust UI**

   ```tsx
   const browserInfo = getWalletBrowserInfo();

   if (browserInfo.isWalletBrowser) {
     // Show simplified connection button
   } else if (isMobile()) {
     // Show deep link options
   }
   ```

5. **Handle Chain Switching Failure**

   ```tsx
   const supportsChainSwitch = supportsFeature('wallet_switchEthereumChain');

   if (!supportsChainSwitch) {
     // Prompt user to switch manually
   }
   ```

## Notes

1. **iOS Input Zoom**: On iOS, input fields auto-zoom when font size is less than 16px. Ensure all input fields have at least 16px font size.

2. **Wallet Popup Detection**: Wallet popup detection is based on heuristic algorithms and may not be 100% accurate. Adjust based on actual business scenarios.

3. **Deep Link Compatibility**: Deep link implementations vary across different wallets. Test on actual devices.

4. **Safe Areas**: iPhone X and above have notch screens and bottom bars. Use `env(safe-area-inset-*)` to ensure safe areas.
