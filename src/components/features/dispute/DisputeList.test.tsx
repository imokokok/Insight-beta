import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisputeList } from './DisputeList';
import type { Dispute } from '@/lib/types/oracleTypes';

vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

vi.mock('@/i18n/translations', () => ({
  langToLocale: { en: 'en-US' },
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className} data-testid="mock-link">
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/user/useWatchlist', () => ({
  useWatchlist: () => ({
    isWatched: () => false,
    toggleWatchlist: vi.fn(),
    mounted: true,
  }),
}));

type VirtuosoProps<T> = {
  itemContent: (index: number, item: T) => React.ReactNode;
  data: T[];
  endReached?: () => void;
};

type VirtuosoGridProps<T> = VirtuosoProps<T> & {
  listClassName?: string;
  itemClassName?: string;
};

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ itemContent, data }: VirtuosoProps<unknown>) => (
    <div data-testid="virtuoso-list" data-count={data.length}>
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
  VirtuosoGrid: ({
    itemContent,
    data,
    listClassName,
    itemClassName,
  }: VirtuosoGridProps<unknown>) => (
    <div className={listClassName} data-testid="virtuoso-grid" data-count={data.length}>
      {data.map((item, index) => (
        <div key={index} className={itemClassName}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

describe('DisputeList', () => {
  const mockDispute: Dispute = {
    id: '0x1234567890abcdef1234567890abcdef12345678',
    chain: 'Arbitrum',
    assertionId: '0xassertion',
    market: 'Test Market',
    disputeReason: 'Bad result',
    disputer: '0xuser',
    disputedAt: new Date().toISOString(),
    votingEndsAt: new Date().toISOString(),
    status: 'Voting',
    currentVotesFor: 10,
    currentVotesAgainst: 5,
    totalVotes: 15,
  };

  it('renders loading skeleton when loading is true with no items', () => {
    const { container } = render(
      <DisputeList
        items={[]}
        loading={true}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
    expect(skeletonCards.length).toBe(6);
  });

  it('does not render skeleton when loading is false with no items', () => {
    render(
      <DisputeList
        items={[]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );
    expect(screen.getByText('common.noData')).toBeInTheDocument();
  });

  it('renders items in grid view', () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    expect(screen.getByText('0x123456...')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('status.voting')).toBeInTheDocument();
  });

  it('renders items in list view', () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="list"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    expect(screen.getByText('0x123456...')).toBeInTheDocument();
    expect(screen.getByText('status.voting')).toBeInTheDocument();
  });

  it('generates correct link to assertion details', () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    const link = screen.getByTestId('mock-link');
    expect(link).toHaveAttribute('href', '/oracle/0xassertion');
  });

  it('generates correct link with instanceId', () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
        instanceId="demo"
      />,
    );

    const link = screen.getByTestId('mock-link');
    expect(link).toHaveAttribute('href', '/oracle/0xassertion?instanceId=demo');
  });

  it('renders multiple items', () => {
    const mockDispute2: Dispute = {
      ...mockDispute,
      id: '0xabcdef1234567890abcdef1234567890abcdef12',
      market: 'Another Market',
    };

    render(
      <DisputeList
        items={[mockDispute, mockDispute2]}
        loading={false}
        viewMode="list"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    expect(screen.getByText('Test Market')).toBeInTheDocument();
    expect(screen.getByText('Another Market')).toBeInTheDocument();
  });

  it('handles empty items correctly', () => {
    render(
      <DisputeList
        items={[]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );
    expect(screen.getByText('common.noData')).toBeInTheDocument();
  });

  it('handles loading with items gracefully', () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={true}
        viewMode="grid"
        hasMore={true}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    expect(screen.getByText('Test Market')).toBeInTheDocument();
  });

  it('renders skeleton in list mode when loading', () => {
    const { container } = render(
      <DisputeList
        items={[]}
        loading={true}
        viewMode="list"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />,
    );

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('handles custom empty state message', () => {
    render(
      <DisputeList
        items={[]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
        emptyStateMessage="Custom empty message"
      />,
    );
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });
});
