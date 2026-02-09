/**
 * useWallet Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '@/contexts/WalletContext';

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
};

Object.defineProperty(window, 'ethereum', {
  writable: true,
  value: mockEthereum,
});

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.chainId).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('should connect wallet successfully', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockChainId = '0x1';

    mockEthereum.request
      .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
      .mockResolvedValueOnce(mockChainId); // eth_chainId

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.address).toBe(mockAddress);
      expect(result.current.chainId).toBe(1);
    });
  });

  it('should handle connection rejection', async () => {
    mockEthereum.request.mockRejectedValue(new Error('User rejected'));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('should disconnect wallet', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockEthereum.request.mockResolvedValueOnce([mockAddress]).mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it('should switch chain successfully', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockEthereum.request
      .mockResolvedValueOnce([mockAddress])
      .mockResolvedValueOnce('0x1')
      .mockResolvedValueOnce(null); // wallet_switchEthereumChain

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    await act(async () => {
      await result.current.switchChain(137); // Switch to Polygon
    });

    expect(mockEthereum.request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }],
    });
  });

  it('should handle chain change events', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    let chainChangeHandler: ((chainId: string) => void) | undefined;

    mockEthereum.on.mockImplementation((event: string, handler: (chainId: string) => void) => {
      if (event === 'chainChanged') {
        chainChangeHandler = handler;
      }
    });

    mockEthereum.request.mockResolvedValueOnce([mockAddress]).mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    act(() => {
      chainChangeHandler?.('0x89'); // Change to Polygon
    });

    expect(result.current.chainId).toBe(137);
  });

  it('should handle account change events', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const newAddress = '0x0987654321098765432109876543210987654321';
    let accountChangeHandler: ((accounts: string[]) => void) | undefined;

    mockEthereum.on.mockImplementation((event: string, handler: (accounts: string[]) => void) => {
      if (event === 'accountsChanged') {
        accountChangeHandler = handler;
      }
    });

    mockEthereum.request.mockResolvedValueOnce([mockAddress]).mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    act(() => {
      accountChangeHandler?.([newAddress]);
    });

    expect(result.current.address).toBe(newAddress);
  });

  it('should auto-connect if previously connected', async () => {
    localStorage.setItem('wallet-connected', 'true');
    const mockAddress = '0x1234567890123456789012345678901234567890';

    mockEthereum.request.mockResolvedValueOnce([mockAddress]).mockResolvedValueOnce('0x1');

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});
