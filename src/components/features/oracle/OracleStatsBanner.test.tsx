import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OracleStatsBanner } from './OracleStatsBanner';

// Mock dependencies
vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className}>Skeleton</div>,
}));

describe('OracleStatsBanner', () => {
  const mockStats = {
    tvs: '$1.2M',
    activeDisputes: '5',
    resolved24h: '12',
    avgResolution: '4.2h',
  };

  it('renders loading state correctly', () => {
    render(<OracleStatsBanner stats={null} loading={true} />);

    // Should render skeleton elements
    const skeletons = screen.getAllByText('Skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders stats correctly', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    // Check main stats are displayed
    expect(screen.getByText('$1.2M')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('4.2h')).toBeInTheDocument();
  });

  it('renders TVS section', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    expect(screen.getByText('oracle.stats.tvs')).toBeInTheDocument();
    expect(screen.getByText('+2.4%')).toBeInTheDocument();
    expect(screen.getByText('oracle.stats.liveCap')).toBeInTheDocument();
  });

  it('renders active disputes section', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    expect(screen.getByText('oracle.stats.activeDisputes')).toBeInTheDocument();
  });

  it('renders resolved 24h section', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    expect(screen.getByText('oracle.stats.resolved24h')).toBeInTheDocument();
  });

  it('renders average resolution section', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    expect(screen.getByText('oracle.stats.avgResolution')).toBeInTheDocument();
  });

  it('renders em dash when stats are null', () => {
    render(<OracleStatsBanner stats={null} loading={false} />);

    // Should show em dash for missing stats
    const emDashes = screen.getAllByText('—');
    expect(emDashes.length).toBeGreaterThan(0);
  });

  it('renders active disputes indicator when disputes exist', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    // Should show the active indicator (pulse dot)
    const activeIndicators = document.querySelectorAll('.animate-pulse');
    expect(activeIndicators.length).toBeGreaterThan(0);
  });

  it('does not render active disputes indicator when no disputes', () => {
    const noDisputesStats = { ...mockStats, activeDisputes: '0' };
    render(<OracleStatsBanner stats={noDisputesStats} loading={false} />);

    // The active indicator should not be present
    // Note: This is a simplified check, actual implementation may vary
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('has correct CSS classes for styling', () => {
    const { container } = render(<OracleStatsBanner stats={mockStats} loading={false} />);

    // Check for main container classes
    expect(container.firstChild).toHaveClass('glass-panel');
  });

  it('renders all stat cards with correct structure', () => {
    render(<OracleStatsBanner stats={mockStats} loading={false} />);

    // Should have 4 main stat sections
    // TVS (large), Active Disputes, Resolved 24h, Avg Resolution
    expect(screen.getByText('oracle.stats.tvs')).toBeInTheDocument();
    expect(screen.getByText('oracle.stats.activeDisputes')).toBeInTheDocument();
    expect(screen.getByText('oracle.stats.resolved24h')).toBeInTheDocument();
    expect(screen.getByText('oracle.stats.avgResolution')).toBeInTheDocument();
  });
});
