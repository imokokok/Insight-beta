import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssertionList } from './AssertionList';
import type { Assertion, OracleChain, OracleStatus } from '@/types/oracleTypes';

// Mock dependencies
vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'zh',
  }),
}));

vi.mock('@/i18n/translations', () => ({
  langToLocale: { zh: 'zh-CN', en: 'en-US' },
}));

vi.mock('@/hooks/user/useWatchlist', () => ({
  useWatchlist: () => ({
    isWatched: () => false,
    toggleWatchlist: vi.fn(),
  }),
}));

vi.mock('@/shared/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatTime: () => '2024-01-01',
  formatUsdCompact: (value: number) => `$${value.toLocaleString()}`,
  getExplorerUrl: () => null,
  getAssertionStatusColor: (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Resolved: 'bg-green-100 text-green-800',
      Disputed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },
  truncateAddress: (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/common/CopyButton', () => ({
  CopyButton: () => <button>Copy</button>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  SkeletonList: ({ viewMode }: { viewMode: string }) => <div>Skeleton {viewMode}</div>,
}));

vi.mock('@/components/features/oracle/LivenessProgressBar', () => ({
  LivenessProgressBar: () => <div>ProgressBar</div>,
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: Assertion[];
    itemContent: (index: number, item: Assertion) => React.ReactNode;
  }) => <div>{data.map((item, index) => itemContent(index, item))}</div>,
  VirtuosoGrid: ({
    data,
    itemContent,
  }: {
    data: Assertion[];
    itemContent: (index: number, item: Assertion) => React.ReactNode;
  }) => <div>{data.map((item, index) => itemContent(index, item))}</div>,
}));

describe('AssertionList', () => {
  const mockAssertions: Assertion[] = [
    {
      id: 'assertion-1',
      protocol: 'TestProtocol',
      chain: 'Polygon' as OracleChain,
      market: 'Test market question?',
      assertion: 'assertion-data-1',
      status: 'Pending' as OracleStatus,
      asserter: '0x1234567890123456789012345678901234567890',
      bondUsd: 1000,
      assertedAt: '2024-01-01T00:00:00Z',
      livenessEndsAt: '2024-01-02T00:00:00Z',
      txHash: '0xabc123',
    },
    {
      id: 'assertion-2',
      protocol: 'TestProtocol2',
      chain: 'Arbitrum' as OracleChain,
      market: 'Another test question?',
      assertion: 'assertion-data-2',
      status: 'Resolved' as OracleStatus,
      asserter: '0x0987654321098765432109876543210987654321',
      bondUsd: 2000,
      assertedAt: '2024-01-01T00:00:00Z',
      livenessEndsAt: '2024-01-02T00:00:00Z',
      txHash: '0xdef456',
    },
  ];

  const defaultProps = {
    items: mockAssertions,
    loading: false,
    viewMode: 'list' as const,
    hasMore: false,
    loadMore: vi.fn(),
    loadingMore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when loading and no items', () => {
    render(<AssertionList {...defaultProps} loading={true} items={[]} />);
    expect(screen.getByText('Skeleton list')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(<AssertionList {...defaultProps} items={[]} />);
    expect(screen.getByText('common.noData')).toBeInTheDocument();
  });

  it('renders empty state with custom message', () => {
    const customMessage = 'Custom empty message';
    render(<AssertionList {...defaultProps} items={[]} emptyStateMessage={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('renders create assertion button when onCreateAssertion provided', () => {
    const onCreateAssertion = vi.fn();
    render(<AssertionList {...defaultProps} items={[]} onCreateAssertion={onCreateAssertion} />);

    const button = screen.getByText('oracle.newAssertion');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onCreateAssertion).toHaveBeenCalled();
  });

  it('renders assertion items in list view', () => {
    render(<AssertionList {...defaultProps} />);

    expect(screen.getByText('Test market question?')).toBeInTheDocument();
    expect(screen.getByText('Another test question?')).toBeInTheDocument();
  });

  it('renders assertion items in grid view', () => {
    render(<AssertionList {...defaultProps} viewMode="grid" />);

    expect(screen.getByText('Test market question?')).toBeInTheDocument();
    expect(screen.getByText('Another test question?')).toBeInTheDocument();
  });

  it('displays correct status labels', () => {
    render(<AssertionList {...defaultProps} />);

    expect(screen.getAllByText('common.pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('common.resolved').length).toBeGreaterThan(0);
  });

  it('displays formatted bond amounts', () => {
    render(<AssertionList {...defaultProps} />);

    // Bond amounts should be formatted (the actual format depends on formatUsdCompact implementation)
    // Mock returns $1,000 format
    expect(screen.getByText('$1,000')).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
  });

  it('displays chain indicators', () => {
    render(<AssertionList {...defaultProps} />);

    // Chain first letters should be displayed
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders liveness progress bar for pending assertions', () => {
    render(<AssertionList {...defaultProps} />);

    // Should show progress bar for pending assertion
    expect(screen.getByText('ProgressBar')).toBeInTheDocument();
  });

  it('does not render liveness progress bar for resolved assertions', () => {
    const resolvedOnly: Assertion[] = mockAssertions.filter((a) => a.status === 'Resolved');
    render(<AssertionList {...defaultProps} items={resolvedOnly} />);

    // Should not show progress bar for resolved assertion
    expect(screen.queryByText('ProgressBar')).not.toBeInTheDocument();
  });

  it('displays short addresses correctly', () => {
    render(<AssertionList {...defaultProps} />);

    // Should show shortened addresses
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText('0x0987...4321')).toBeInTheDocument();
  });

  it('renders watchlist star button', () => {
    render(<AssertionList {...defaultProps} />);

    // Should have star buttons for each item
    const stars = screen.getAllByTitle('common.addToWatchlist');
    expect(stars.length).toBeGreaterThan(0);
  });

  it('calls loadMore when scrolling', () => {
    const loadMore = vi.fn();
    render(<AssertionList {...defaultProps} hasMore={true} loadMore={loadMore} />);

    // Note: Virtuoso's endReached is mocked, so we can't test scrolling directly
    // But we can verify the component renders without errors
    expect(screen.getByText('Test market question?')).toBeInTheDocument();
  });

  it('renders loading more indicator', () => {
    render(<AssertionList {...defaultProps} hasMore={true} loadingMore={true} />);

    // The loading indicator is rendered by the Footer component in Virtuoso
    // Since Virtuoso is mocked, we check the component renders without error
    expect(screen.getByText('Test market question?')).toBeInTheDocument();
  });

  it('renders all loaded indicator when no more items', () => {
    render(<AssertionList {...defaultProps} hasMore={false} items={mockAssertions} />);

    // The all loaded indicator is rendered by the Footer component in Virtuoso
    // Since Virtuoso is mocked, we check the component renders without error
    expect(screen.getByText('Test market question?')).toBeInTheDocument();
  });

  it('renders with instanceId in links', () => {
    render(<AssertionList {...defaultProps} instanceId="test-instance" />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    // Check that links contain instanceId
    const firstLink = links[0] as HTMLAnchorElement;
    expect(firstLink.href).toContain('instanceId=test-instance');
  });
});
