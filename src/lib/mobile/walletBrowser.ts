'use client';

/**
 * 钱包浏览器检测工具
 * 用于检测各种 Web3 钱包内置浏览器环境
 */

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
  | 'rabby'
  | 'frame'
  | 'safe'
  | 'ronin'
  | 'exodus'
  | 'frontier'
  | 'walletconnect'
  | 'wechat'
  | 'safari'
  | 'chrome'
  | 'firefox'
  | 'edge'
  | 'unknown';

export interface WalletBrowserInfo {
  type: WalletBrowserType;
  name: string;
  isWalletBrowser: boolean;
  isInApp: boolean;
  isMobile: boolean;
  deepLinkSupported: boolean;
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
}

export function isWechat(): boolean {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function getWalletBrowserInfo(): WalletBrowserInfo {
  if (typeof window === 'undefined') {
    return {
      type: 'unknown',
      name: 'Unknown',
      isWalletBrowser: false,
      isInApp: false,
      isMobile: false,
      deepLinkSupported: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const ethereum = (window as { ethereum?: Record<string, unknown> }).ethereum;
  const mobile = isMobile();

  if (ethereum?.isMetaMask || /metamask/i.test(ua)) {
    return {
      type: 'metamask',
      name: 'MetaMask',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (ethereum?.isRabby || /rabby/i.test(ua)) {
    return {
      type: 'rabby',
      name: 'Rabby',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: false,
    };
  }

  if (ethereum?.isFrame || /frame/i.test(ua)) {
    return {
      type: 'frame',
      name: 'Frame',
      isWalletBrowser: true,
      isInApp: false,
      isMobile: false,
      deepLinkSupported: false,
    };
  }

  if (ethereum?.isSafe || /safe/i.test(ua)) {
    return {
      type: 'safe',
      name: 'Safe',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (/trustwallet|trust wallet/i.test(ua)) {
    return {
      type: 'trust',
      name: 'Trust Wallet',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/tokenpocket/i.test(ua)) {
    return {
      type: 'tokenpocket',
      name: 'TokenPocket',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/imtoken/i.test(ua) || /imtoken/i.test(navigator.userAgent)) {
    return {
      type: 'imtoken',
      name: 'imToken',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (ethereum?.isPhantom || /phantom/i.test(ua)) {
    return {
      type: 'phantom',
      name: 'Phantom',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (ethereum?.isBraveWallet || /brave/i.test(ua)) {
    return {
      type: 'brave',
      name: 'Brave Wallet',
      isWalletBrowser: true,
      isInApp: false,
      isMobile: false,
      deepLinkSupported: false,
    };
  }

  if (ethereum?.isCoinbaseWallet || /coinbase/i.test(ua)) {
    return {
      type: 'coinbase',
      name: 'Coinbase Wallet',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (/rainbow/i.test(ua)) {
    return {
      type: 'rainbow',
      name: 'Rainbow',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/zerion/i.test(ua)) {
    return {
      type: 'zerion',
      name: 'Zerion',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/okex|okx/i.test(ua)) {
    return {
      type: 'okx',
      name: 'OKX Wallet',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/bitget/i.test(ua)) {
    return {
      type: 'bitget',
      name: 'Bitget Wallet',
      isWalletBrowser: true,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: true,
    };
  }

  if (/ronin/i.test(ua)) {
    return {
      type: 'ronin',
      name: 'Ronin Wallet',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (/exodus/i.test(ua)) {
    return {
      type: 'exodus',
      name: 'Exodus',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (/frontier/i.test(ua)) {
    return {
      type: 'frontier',
      name: 'Frontier',
      isWalletBrowser: true,
      isInApp: mobile,
      isMobile: mobile,
      deepLinkSupported: mobile,
    };
  }

  if (isWechat()) {
    return {
      type: 'wechat',
      name: 'WeChat',
      isWalletBrowser: false,
      isInApp: true,
      isMobile: true,
      deepLinkSupported: false,
    };
  }

  if (isSafari()) {
    return {
      type: 'safari',
      name: 'Safari',
      isWalletBrowser: false,
      isInApp: false,
      isMobile: mobile,
      deepLinkSupported: false,
    };
  }

  if (/firefox/i.test(ua)) {
    return {
      type: 'firefox',
      name: 'Firefox',
      isWalletBrowser: false,
      isInApp: false,
      isMobile: mobile,
      deepLinkSupported: false,
    };
  }

  if (/edg/i.test(ua)) {
    return {
      type: 'edge',
      name: 'Edge',
      isWalletBrowser: false,
      isInApp: false,
      isMobile: mobile,
      deepLinkSupported: false,
    };
  }

  if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
    return {
      type: 'chrome',
      name: 'Chrome',
      isWalletBrowser: false,
      isInApp: false,
      isMobile: mobile,
      deepLinkSupported: false,
    };
  }

  return {
    type: 'unknown',
    name: 'Unknown Browser',
    isWalletBrowser: false,
    isInApp: false,
    isMobile: mobile,
    deepLinkSupported: false,
  };
}

export function isInWalletBrowser(): boolean {
  return getWalletBrowserInfo().isWalletBrowser;
}

export function needsDeepLink(): boolean {
  const info = getWalletBrowserInfo();
  return info.isMobile && !info.isWalletBrowser && !info.isInApp;
}

export function getRecommendedWalletMethod(): 'browser' | 'walletconnect' | 'deeplink' {
  const info = getWalletBrowserInfo();
  
  if (info.isWalletBrowser) {
    return 'browser';
  }
  
  if (info.isMobile) {
    return 'deeplink';
  }
  
  return 'walletconnect';
}

export function getMetaMaskDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://metamask.app.link/dapp/${targetUrl.replace(/^https?:\/\//, '')}`;
}

export function getTrustWalletDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(targetUrl)}`;
}

export function getTokenPocketDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://tokenpocket.github.io/tp-deep-link/?url=${encodeURIComponent(targetUrl)}`;
}

export function getRainbowDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://rainbow.me/links?url=${encodeURIComponent(targetUrl)}`;
}

export function getCoinbaseDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(targetUrl)}`;
}

export function getOKXDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `okex://web3?url=${encodeURIComponent(targetUrl)}`;
}

export function getBitgetDeepLink(url?: string): string {
  const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  return `bitkeep://dapp?url=${encodeURIComponent(targetUrl)}`;
}

export function getCurrentDeepLink(walletType?: WalletBrowserType): string {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  
  switch (walletType) {
    case 'metamask':
      return getMetaMaskDeepLink(url);
    case 'trust':
      return getTrustWalletDeepLink(url);
    case 'tokenpocket':
      return getTokenPocketDeepLink(url);
    case 'rainbow':
      return getRainbowDeepLink(url);
    case 'coinbase':
      return getCoinbaseDeepLink(url);
    case 'okx':
      return getOKXDeepLink(url);
    case 'bitget':
      return getBitgetDeepLink(url);
    default:
      return getMetaMaskDeepLink(url);
  }
}

export function supportsFeature(feature: 'eip1559' | 'wallet_switchEthereumChain' | 'wallet_addEthereumChain'): boolean {
  const info = getWalletBrowserInfo();
  
  switch (feature) {
    case 'eip1559':
      return info.isWalletBrowser || !info.isMobile;
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      if (info.type === 'wechat') return false;
      return true;
    default:
      return true;
  }
}
