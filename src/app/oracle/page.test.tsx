// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  mockNextNavigation,
  mockNextDynamic,
  mockI18n,
  mockTranslations,
  mockLucideReact,
  mockPageHeader,
  mockWalletContext,
} from '@/test-utils';

vi.mock('next/navigation', () => mockNextNavigation('/oracle'));
vi.mock('next/dynamic', () => mockNextDynamic());
vi.mock('lucide-react', mockLucideReact);
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
  it('renders the oracle platform page', () => {
    render(<OraclePage />);
    expect(screen.getByText('One Platform.')).toBeInTheDocument();
    expect(screen.getByText('All Oracles.')).toBeInTheDocument();
  });
});
