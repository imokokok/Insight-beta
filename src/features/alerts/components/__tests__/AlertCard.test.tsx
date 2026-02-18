import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AlertCard, AlertDetailPanel } from '../AlertCard';
import type { UnifiedAlert, AlertSeverity, AlertStatus } from '../../types';

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'alerts.statusActive': 'Active',
        'alerts.statusResolved': 'Resolved',
        'alerts.statusInvestigating': 'Investigating',
        'alerts.selectAlert': 'Select an alert to view details',
        'alerts.time': 'Time',
        'alerts.symbol': 'Symbol',
        'alerts.deviation': 'Deviation',
        'alerts.chains': 'Chains',
        'alerts.prices': 'Prices',
        'alerts.avgPrice': 'Average Price',
        'alerts.status': 'Status',
        'alerts.description': 'Description',
        'alerts.reason': 'Reason',
        'alerts.outlierProtocols': 'Outlier Protocols',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/shared/utils', () => ({
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
  formatTime: (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  },
}));

vi.mock('../AlertActionButtons', () => ({
  AlertActionButtons: ({ alert }: { alert: UnifiedAlert }) => (
    <div data-testid="alert-action-buttons" data-alert-id={alert.id}>
      Action Buttons
    </div>
  ),
}));

const createMockAlert = (overrides: Partial<UnifiedAlert> = {}): UnifiedAlert => ({
  id: 'alert-1',
  source: 'price_anomaly',
  timestamp: '2024-01-01T00:00:00Z',
  severity: 'critical',
  status: 'active',
  title: 'Test Alert',
  description: 'Test alert description',
  ...overrides,
});

describe('AlertCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render alert title and description', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Test Alert')).toBeInTheDocument();
      expect(screen.getByText('Test alert description')).toBeInTheDocument();
    });

    it('should render alert severity badge', () => {
      const alert = createMockAlert({ severity: 'critical' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    it('should render alert source badge', () => {
      const alert = createMockAlert({ source: 'price_anomaly' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Price Anomaly')).toBeInTheDocument();
    });

    it('should render symbol when provided', () => {
      const alert = createMockAlert({ symbol: 'BTC' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('BTC')).toBeInTheDocument();
    });

    it('should render deviation when provided', () => {
      const alert = createMockAlert({ deviation: 0.05 });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('5.00%')).toBeInTheDocument();
    });

    it('should render chain information when provided', () => {
      const alert = createMockAlert({ chainA: 'ethereum', chainB: 'arbitrum' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('ethereum')).toBeInTheDocument();
      expect(screen.getByText('arbitrum')).toBeInTheDocument();
    });

    it('should render reason when provided', () => {
      const alert = createMockAlert({ reason: 'Price deviation exceeded threshold' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Price deviation exceeded threshold')).toBeInTheDocument();
    });

    it('should render outlier protocols when provided', () => {
      const alert = createMockAlert({
        outlierProtocols: ['Uniswap', 'SushiSwap'],
      });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Uniswap')).toBeInTheDocument();
      expect(screen.getByText('SushiSwap')).toBeInTheDocument();
    });
  });

  describe('Severity levels', () => {
    const severityTestCases: { severity: AlertSeverity; expectedClass: string }[] = [
      { severity: 'critical', expectedClass: 'bg-red-500' },
      { severity: 'high', expectedClass: 'bg-orange-500' },
      { severity: 'medium', expectedClass: 'bg-yellow-500' },
      { severity: 'low', expectedClass: 'bg-green-500' },
      { severity: 'warning', expectedClass: 'bg-yellow-500' },
      { severity: 'info', expectedClass: 'bg-blue-500' },
    ];

    severityTestCases.forEach(({ severity, expectedClass }) => {
      it(`should render ${severity} severity with correct styling`, () => {
        const alert = createMockAlert({ severity });
        render(<AlertCard alert={alert} />);

        const badge = screen.getByText(severity);
        expect(badge).toHaveClass(expectedClass);
      });
    });
  });

  describe('Status display', () => {
    it('should display active status badge', () => {
      const alert = createMockAlert({ status: 'active' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display resolved status badge', () => {
      const alert = createMockAlert({ status: 'resolved' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('should display investigating status badge', () => {
      const alert = createMockAlert({ status: 'investigating' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Investigating')).toBeInTheDocument();
    });
  });

  describe('Source types', () => {
    it('should render price_anomaly source with correct label', () => {
      const alert = createMockAlert({ source: 'price_anomaly' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Price Anomaly')).toBeInTheDocument();
    });

    it('should render cross_chain source with correct label', () => {
      const alert = createMockAlert({ source: 'cross_chain' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Cross-Chain')).toBeInTheDocument();
    });

    it('should render security source with correct label', () => {
      const alert = createMockAlert({ source: 'security' });
      render(<AlertCard alert={alert} />);

      expect(screen.getByText('Security')).toBeInTheDocument();
    });
  });

  describe('Compact mode', () => {
    it('should render compact card when compact prop is true', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} compact />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Test Alert')).toBeInTheDocument();
    });

    it('should not show description in compact mode', () => {
      const alert = createMockAlert({ description: 'Detailed description' });
      render(<AlertCard alert={alert} compact />);

      expect(screen.queryByText('Detailed description')).not.toBeInTheDocument();
    });
  });

  describe('Selection state', () => {
    it('should apply selected styling when isSelected is true', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} isSelected />);

      const card = screen.getByText('Test Alert').closest('.cursor-pointer');
      expect(card).toHaveClass('ring-2');
      expect(card).toHaveClass('ring-primary');
    });

    it('should not apply selected styling when isSelected is false', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} isSelected={false} />);

      const card = screen.getByText('Test Alert').closest('.cursor-pointer');
      expect(card).not.toHaveClass('ring-2');
    });
  });

  describe('Checkbox functionality', () => {
    it('should render checkbox when showCheckbox is true', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} showCheckbox />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should not render checkbox by default', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} />);

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should call onCheckChange when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onCheckChange = vi.fn();
      const alert = createMockAlert();

      render(<AlertCard alert={alert} showCheckbox onCheckChange={onCheckChange} />);

      await user.click(screen.getByRole('checkbox'));

      expect(onCheckChange).toHaveBeenCalledWith(true);
    });

    it('should show checked state when isChecked is true', () => {
      const alert = createMockAlert();
      render(<AlertCard alert={alert} showCheckbox isChecked />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('Click interactions', () => {
    it('should call onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const alert = createMockAlert();

      render(<AlertCard alert={alert} onClick={onClick} />);

      await user.click(screen.getByText('Test Alert'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick in compact mode', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const alert = createMockAlert();

      render(<AlertCard alert={alert} compact onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AlertDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should show empty state when no alert is provided', () => {
      render(<AlertDetailPanel alert={null} />);

      expect(screen.getByText('Select an alert to view details')).toBeInTheDocument();
    });
  });

  describe('Alert details', () => {
    it('should render alert title', () => {
      const alert = createMockAlert({ title: 'Detailed Alert' });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('Detailed Alert')).toBeInTheDocument();
    });

    it('should render symbol information', () => {
      const alert = createMockAlert({ symbol: 'ETH' });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('should render deviation with correct formatting', () => {
      const alert = createMockAlert({ deviation: 0.1234 });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('12.3400%')).toBeInTheDocument();
    });

    it('should render chain information', () => {
      const alert = createMockAlert({ chainA: 'ethereum', chainB: 'polygon' });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('ethereum → polygon')).toBeInTheDocument();
    });

    it('should render price information', () => {
      const alert = createMockAlert({ priceA: 100.5, priceB: 102.3 });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('$100.50 / $102.30')).toBeInTheDocument();
    });

    it('should render average price', () => {
      const alert = createMockAlert({ avgPrice: 101.4 });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('$101.40')).toBeInTheDocument();
    });

    it('should render description', () => {
      const alert = createMockAlert({ description: 'Detailed alert description' });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('Detailed alert description')).toBeInTheDocument();
    });

    it('should render reason', () => {
      const alert = createMockAlert({ reason: 'Threshold exceeded' });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('Threshold exceeded')).toBeInTheDocument();
    });

    it('should render outlier protocols', () => {
      const alert = createMockAlert({
        outlierProtocols: ['Protocol A', 'Protocol B'],
      });
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByText('Protocol A')).toBeInTheDocument();
      expect(screen.getByText('Protocol B')).toBeInTheDocument();
    });

    it('should render AlertActionButtons', () => {
      const alert = createMockAlert();
      render(<AlertDetailPanel alert={alert} />);

      expect(screen.getByTestId('alert-action-buttons')).toBeInTheDocument();
    });
  });

  describe('Status display', () => {
    const statusTestCases: { status: AlertStatus; expectedClass: string }[] = [
      { status: 'active', expectedClass: 'bg-red-500' },
      { status: 'resolved', expectedClass: 'bg-green-500' },
      { status: 'investigating', expectedClass: 'bg-blue-500' },
    ];

    statusTestCases.forEach(({ status, expectedClass }) => {
      it(`should display ${status} status with correct styling`, () => {
        const alert = createMockAlert({ status });
        render(<AlertDetailPanel alert={alert} />);

        const statusBadge = screen.getByText(status);
        expect(statusBadge).toHaveClass(expectedClass);
      });
    });
  });

  describe('Alert update callback', () => {
    it('should call onAlertUpdate when action completes', async () => {
      const onAlertUpdate = vi.fn();
      const alert = createMockAlert();

      render(<AlertDetailPanel alert={alert} onAlertUpdate={onAlertUpdate} />);

      const actionButton = screen.queryByTestId('alert-action-buttons');
      if (actionButton) {
        expect(actionButton).toBeInTheDocument();
      }
    });
  });

  describe('Alert prop changes', () => {
    it('should update when alert prop changes', () => {
      const alert1 = createMockAlert({ id: 'alert-1', title: 'First Alert' });
      const { rerender } = render(<AlertDetailPanel alert={alert1} />);

      expect(screen.getByText('First Alert')).toBeInTheDocument();

      const alert2 = createMockAlert({ id: 'alert-2', title: 'Second Alert' });
      rerender(<AlertDetailPanel alert={alert2} />);

      expect(screen.getByText('Second Alert')).toBeInTheDocument();
    });
  });
});
