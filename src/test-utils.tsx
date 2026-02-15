/**
 * Test Utilities - 测试工具库
 *
 * 提供统一的测试 mock 配置和工具函数
 */

import type { ReactNode } from 'react';

import { vi } from 'vitest';

import type * as LucideReact from 'lucide-react';

// ============================================================================
// Next.js Navigation Mocks
// ============================================================================

export function mockNextNavigation(pathname: string = '/') {
  return {
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
    usePathname: () => pathname,
    useSearchParams: () => new URLSearchParams(''),
  };
}

export function mockNextLink() {
  return {
    default: ({ href, children }: { href: string; children: ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
}

export function mockNextDynamic() {
  return {
    default: () => () => null,
  };
}

// ============================================================================
// i18n Mocks
// ============================================================================

export function mockI18n() {
  return {
    useI18n: () => ({
      t: (key: string) => key,
      lang: 'en',
    }),
  };
}

export function mockTranslations() {
  return {
    getUiErrorMessage: () => '',
    langToLocale: { zh: 'zh-CN', en: 'en-US' },
  };
}

// ============================================================================
// Wallet Context Mock
// ============================================================================

export function mockWalletContext(address: string | null = null) {
  return {
    useWallet: () => ({
      address,
      isConnected: !!address,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
  };
}

// ============================================================================
// Common Component Mocks
// ============================================================================

export function mockPageHeader() {
  return {
    PageHeader: ({ title, children }: { title: string; children?: ReactNode }) => (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ),
  };
}

export function mockAssertionList() {
  return {
    AssertionList: () => <div>AssertionList</div>,
  };
}

// ============================================================================
// Lucide React Mock
// ============================================================================

export function mockLucideReact() {
  return async (importOriginal: () => Promise<typeof LucideReact>) => {
    const actual = await importOriginal();
    return {
      ...actual,
      ArrowUpRight: () => null,
      Search: () => null,
      Settings2: () => null,
      ChevronDown: () => null,
      LayoutGrid: () => null,
      List: () => null,
      LayoutDashboard: () => null,
      Trophy: () => null,
      Wrench: () => null,
      RotateCw: () => null,
      Megaphone: () => null,
    };
  };
}

// ============================================================================
// Setup Helpers
// ============================================================================

// Note: vi.mock cannot be used inside functions as it gets hoisted to the top of the file.
// Use the mock functions above directly in your test files at the module level.
// Example:
//   vi.mock('next/navigation', () => mockNextNavigation('/my-path'));
