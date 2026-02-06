import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  mockNextNavigation,
  mockNextLink,
  mockI18n,
  mockTranslations,
  mockPageHeader,
} from '@/test-utils';

const mockAddressState = { current: null as string | null };

vi.mock('next/navigation', () => mockNextNavigation('/my-disputes'));
vi.mock('next/link', () => mockNextLink());
vi.mock('@/i18n/LanguageProvider', () => mockI18n());
vi.mock('@/i18n/translations', () => mockTranslations());

import Page from './page';

vi.mock('@/contexts/WalletContext', () => ({
  useWallet: vi.fn(() => ({ address: mockAddressState.current })),
}));

vi.mock('@/hooks/dispute/useDisputes', () => ({
  useDisputes: vi.fn(() => ({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  })),
}));

vi.mock('@/hooks/user/useUserStats', () => ({
  useUserStats: () => ({
    stats: null,
    loading: false,
  }),
}));

vi.mock('@/components/PageHeader', () => mockPageHeader());

describe('MyDisputesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddressState.current = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders my disputes page', () => {
    render(<Page />);
    expect(screen.getByText('nav.myDisputes')).toBeInTheDocument();
  });
});
