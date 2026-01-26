import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/my-assertions',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/i18n/translations', () => ({
  getUiErrorMessage: (code: string) => `Error: ${code}`,
  langToLocale: { en: 'en-US' },
}));

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: null,
  }),
}));

vi.mock('@/hooks/oracle/useOracleData', () => ({
  useOracleData: () => ({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  }),
}));

vi.mock('@/hooks/user/useUserStats', () => ({
  useUserStats: () => ({
    stats: null,
    loading: false,
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ConnectWallet', () => ({
  ConnectWallet: () => <div data-testid="connect-wallet">ConnectWallet</div>,
}));

vi.mock('@/components/UserStatsCard', () => ({
  UserStatsCard: () => <div data-testid="user-stats">UserStatsCard</div>,
}));

vi.mock('@/lib/utils', async () => {
  const actual = await import('@/lib/utils');
  return {
    ...actual,
    fetchApiData: vi.fn().mockResolvedValue({ instances: [] }),
  };
});

vi.mock('@/components/features/assertion/AssertionList', () => ({
  AssertionList: () => <div data-testid="assertion-list">AssertionList</div>,
}));

import MyAssertionsPage from './page';

describe('MyAssertionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders connect wallet prompt when wallet is disconnected', () => {
    render(<MyAssertionsPage />);
    expect(screen.getByText('oracle.myAssertions.connectWalletTitle')).toBeInTheDocument();
  });
});
