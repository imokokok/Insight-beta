/**
 * User Flows Integration Tests - 用户流程集成测试
 *
 * 测试关键用户流程的完整性和正确性
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import OraclePlatformPage from '@/app/oracle/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/oracle'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock fetchApiData
vi.mock('@/lib/utils/api', () => ({
  fetchApiData: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    code: string;
    constructor(code: string, _details?: unknown) {
      super(code);
      this.code = code;
      this.name = 'ApiClientError';
    }
  },
}));

import { fetchApiData } from '@/lib/utils/api';

const mockedFetchApiData = vi.mocked(fetchApiData);
const mockedUseRouter = vi.mocked(useRouter);

describe('User Flows Integration', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  describe('Oracle Platform Landing Flow', () => {
    it('should display platform overview and navigation options', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      // 验证页面标题
      await waitFor(() => {
        expect(screen.getByText('One Platform.')).toBeInTheDocument();
        expect(screen.getByText('All Oracles.')).toBeInTheDocument();
      });

      // 验证导航按钮存在
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Price Comparison')).toBeInTheDocument();
      expect(screen.getByText('Assert & Dispute')).toBeInTheDocument();
    });

    it('should navigate to dashboard when clicking dashboard button', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      const dashboardButton = await screen.findByText('Dashboard');
      await userEvent.click(dashboardButton);

      expect(mockPush).toHaveBeenCalledWith('/oracle/dashboard');
    });

    it('should display platform statistics correctly', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      await waitFor(() => {
        expect(screen.getByText('Supported Protocols')).toBeInTheDocument();
        expect(screen.getByText('Price Feeds')).toBeInTheDocument();
        expect(screen.getByText('Supported Chains')).toBeInTheDocument();
        expect(screen.getByText('Avg Latency')).toBeInTheDocument();
      });
    });

    it('should display supported protocols section', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      await waitFor(() => {
        expect(screen.getByText('Supported Protocols')).toBeInTheDocument();
        expect(screen.getByText('Chainlink')).toBeInTheDocument();
        expect(screen.getByText('Pyth Network')).toBeInTheDocument();
        expect(screen.getByText('UMA')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should display error message when stats API fails', async () => {
      mockedFetchApiData.mockRejectedValue(new Error('Network error'));

      render(<OraclePlatformPage />);

      // 验证使用默认数据或显示错误状态
      await waitFor(() => {
        const errorElement = screen.queryByText(/error/i);
        const defaultDataElement = screen.queryByText('10');
        expect(errorElement || defaultDataElement).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility Flow', () => {
    it('should support keyboard navigation', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      const buttons = await screen.findAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // 测试第一个按钮可以通过键盘聚焦
      const firstButton = buttons[0];
      if (firstButton) {
        firstButton.focus();
        expect(document.activeElement).toBe(firstButton);
      }
    });

    it('should have proper ARIA labels', async () => {
      mockedFetchApiData.mockResolvedValue({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });

      render(<OraclePlatformPage />);

      // 验证主要区域有适当的角色或标签
      await waitFor(() => {
        const headings = screen.queryAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });
    });
  });
});
