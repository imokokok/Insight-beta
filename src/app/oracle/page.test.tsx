// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/oracle',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
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
});

vi.mock('@/hooks/oracle/useOracleData', () => ({
  useOracleData: () => ({
    items: [],
    stats: null,
    loading: false,
    loadingMore: false,
    error: null,
    loadMore: vi.fn(),
    hasMore: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

vi.mock('@/i18n/translations', () => ({
  getUiErrorMessage: () => '',
  langToLocale: { zh: 'zh-CN', en: 'en-US', es: 'es-ES' },
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/components/OracleStatsBanner', () => ({
  OracleStatsBanner: () => <div>stats</div>,
}));

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: null,
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/components/ConnectWallet', () => ({
  ConnectWallet: () => <div>wallet</div>,
}));

vi.mock('@/components/Leaderboard', () => ({
  Leaderboard: () => <div>leaderboard</div>,
}));

vi.mock('@/components/PnLCalculator', () => ({
  PnLCalculator: () => <div>pnl</div>,
}));

vi.mock('@/components/AssertionList', () => ({
  AssertionList: () => <div>list</div>,
}));

import OraclePage from './page';

describe('Oracle page', () => {
  it('renders the oracle platform page', () => {
    render(<OraclePage />);
    // The page should render with oracle platform content
    expect(screen.getByText('Universal Oracle')).toBeInTheDocument();
  });
});
