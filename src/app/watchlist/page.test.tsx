import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/watchlist',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/i18n/translations', () => ({
  getUiErrorMessage: () => 'uiError',
  langToLocale: { en: 'en-US' },
}));

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

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/AssertionList', () => ({
  AssertionList: () => <div>AssertionList</div>,
}));

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
    expect(screen.getByText('nav.watchlist')).toBeInTheDocument();
  });
});
