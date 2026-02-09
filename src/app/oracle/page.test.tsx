// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  mockNextNavigation,
  mockNextDynamic,
  mockI18n,
  mockTranslations,
  mockPageHeader,
  mockWalletContext,
} from '@/test-utils';

vi.mock('next/navigation', () => mockNextNavigation('/oracle'));
vi.mock('next/dynamic', () => mockNextDynamic());
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
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
  LanguageProviderLazy: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/i18n/LanguageProvider', () => mockI18n());
vi.mock('@/i18n/translations', () => mockTranslations());
vi.mock('@/components/PageHeader', () => mockPageHeader());

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

vi.mock('@/contexts/WalletContext', () => mockWalletContext());

vi.mock('@/components/OracleStatsBanner', () => ({
  OracleStatsBanner: () => <div>stats</div>,
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
  it('renders without crashing', () => {
    const { container } = render(<OraclePage />);
    expect(container).toBeTruthy();
  });
});
