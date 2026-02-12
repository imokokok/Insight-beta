'use client';

/**
 * 钱包浏览器检测工具
 * 用于检测各种 Web3 钱包内置浏览器环境
 */

// 钱包浏览器类型
export type WalletBrowserType = 
  | 'metamask'
  | 'trust'
  | 'tokenpocket'
  | 'imtoken'
  | 'phantom'
  | 'brave'
  | 'coinbase'
  | 'rainbow'
  | 'zerion'
  | 'okx'
  | 'bitget'
  | 'wechat'
  | 'safari'
  | 'chrome'
  | 'unknown';

export interface WalletBrowserInfo {
  type: WalletBrowserType;
  name: string;
  isWalletBrowser: boolean;
  isInApp: boolean;
}

// 检测是否在移动端
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// 检测是否在 iOS 设备
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
}

// 检测是否在 Android 设备
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

// 检测是否在 Safari 浏览器
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua);
}

// 检测是否在微信内置浏览器
export function isWechat(): boolean {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

// 获取钱包浏览器信息
export function getWalletBrowserInfo(): WalletBrowserInfo {
  if (typeof window === 'undefined') {
    return {
      type: 'unknown',
      name: 'Unknown',
      isWalletBrowser: false,
      isInApp: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const ethereum = window.ethereum;

  // MetaMask 检测
  if (ethereum?.isMetaMask || /metamask/i.test(ua)) {
    return {
      type: 'metamask',
      name: 'MetaMask',
      isWalletBrowser: true,
      isInApp: isMobile(),
    };
  }

  // Trust Wallet 检测
  if (/trustwallet|trust wallet/i.test(ua)) {
    return {
      type: 'trust',
      name: 'Trust Wallet',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // TokenPocket 检测
  if (/tokenpocket/i.test(ua)) {
    return {
      type: 'tokenpocket',
      name: 'TokenPocket',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // imToken 检测
  if (/imtoken/i.test(ua) || /imtoken/i.test(navigator.userAgent)) {
    return {
      type: 'imtoken',
      name: 'imToken',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // Phantom 检测
  if (ethereum?.isPhantom || /phantom/i.test(ua)) {
    return {
      type: 'phantom',
      name: 'Phantom',
      isWalletBrowser: true,
      isInApp: isMobile(),
    };
  }

  // Brave 检测
  if (ethereum?.isBraveWallet || /brave/i.test(ua)) {
    return {
      type: 'brave',
      name: 'Brave Wallet',
      isWalletBrowser: true,
      isInApp: false,
    };
  }

  // Coinbase 检测
  if (ethereum?.isCoinbaseWallet || /coinbase/i.test(ua)) {
    return {
      type: 'coinbase',
      name: 'Coinbase Wallet',
      isWalletBrowser: true,
      isInApp: isMobile(),
    };
  }

  // Rainbow 检测
  if (/rainbow/i.test(ua)) {
    return {
      type: 'rainbow',
      name: 'Rainbow',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // Zerion 检测
  if (/zerion/i.test(ua)) {
    return {
      type: 'zerion',
      name: 'Zerion',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // OKX 检测
  if (/okex|okx/i.test(ua)) {
    return {
      type: 'okx',
      name: 'OKX Wallet',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // Bitget 检测
  if (/bitget/i.test(ua)) {
    return {
      type: 'bitget',
      name: 'Bitget Wallet',
      isWalletBrowser: true,
      isInApp: true,
    };
  }

  // 微信检测
  if (isWechat()) {
    return {
      type: 'wechat',
      name: 'WeChat',
      isWalletBrowser: false,
      isInApp: true,
    };
  }

  // Safari 检测
  if (isSafari()) {
    return {
      type: 'safari',
      name: 'Safari',
      isWalletBrowser: false,
      isInApp: false,
    };
  }

  // Chrome 检测
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    return {
      type: 'chrome',
      name: 'Chrome',
      isWalletBrowser: false,
      isInApp: false,
    };
  }

  return {
    type: 'unknown',
    name: 'Unknown Browser',
    isWalletBrowser: false,
    isInApp: false,
  };
}

// 检测是否在钱包内置浏览器中
export function isInWalletBrowser(): boolean {
  return getWalletBrowserInfo().isWalletBrowser;
}

// 检测是否需要深度链接
export function needsDeepLink(): boolean {
  const info = getWalletBrowserInfo();
  return isMobile() && !info.isWalletBrowser && !info.isInApp;
}

// 获取推荐的钱包连接方式
export function getRecommendedWalletMethod(): 'browser' | 'walletconnect' | 'deeplink' {
  const info = getWalletBrowserInfo();
  
  if (info.isWalletBrowser) {
    return 'browser';
  }
  
  if (isMobile()) {
    return 'deeplink';
  }
  
  return 'walletconnect';
}

// 生成 MetaMask 深度链接
export function getMetaMaskDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://metamask.app.link/dapp/${targetUrl.replace(/^https?:\/\//, '')}`;
}

// 生成 Trust Wallet 深度链接
export function getTrustWalletDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(targetUrl)}`;
}

// 生成 TokenPocket 深度链接
export function getTokenPocketDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://tokenpocket.github.io/tp-deep-link/?url=${encodeURIComponent(targetUrl)}`;
}

// 获取当前环境的深度链接
export function getCurrentDeepLink(walletType?: WalletBrowserType): string {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  
  switch (walletType) {
    case 'metamask':
      return getMetaMaskDeepLink(url);
    case 'trust':
      return getTrustWalletDeepLink(url);
    case 'tokenpocket':
      return getTokenPocketDeepLink(url);
    default:
      return getMetaMaskDeepLink(url);
  }
}

// 检测是否支持特定功能
export function supportsFeature(feature: 'eip1559' | 'wallet_switchEthereumChain' | 'wallet_addEthereumChain'): boolean {
  const info = getWalletBrowserInfo();
  
  switch (feature) {
    case 'eip1559':
      // 大多数现代钱包都支持 EIP-1559
      return info.isWalletBrowser || !isMobile();
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      // 某些钱包浏览器可能不支持链切换
      if (info.type === 'wechat') return false;
      return true;
    default:
      return true;
  }
}
