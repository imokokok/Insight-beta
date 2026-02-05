import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  mockNextNavigation,
  mockNextLink,
  mockI18n,
  mockTranslations,
  mockPageHeader,
  mockAssertionList,
} from '@/test-utils';

vi.mock('next/link', () => mockNextLink());
vi.mock('next/navigation', () => mockNextNavigation('/watchlist'));
vi.mock('@/i18n/LanguageProvider', () => mockI18n());
vi.mock('@/i18n/translations', () => mockTranslations());
vi.mock('@/hooks/user/useWatchlist', () => ({
  useWatchlist: () => ({ watchlist: ['0xabc'], mounted: true }),
}));
vi.mock('@/hooks/ui/useInfiniteList', () => ({
  useInfiniteList: () => ({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  }),
}));
vi.mock('@/components/PageHeader', () => mockPageHeader());
vi.mock('@/components/AssertionList', () => mockAssertionList());

import WatchlistPage from './page';

describe('WatchlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders watchlist page', () => {
    render(<WatchlistPage />);
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
  });
});
