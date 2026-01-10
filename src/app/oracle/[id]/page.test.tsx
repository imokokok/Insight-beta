// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OracleDetailPage from './page';
import * as utils from '@/lib/utils';
import { Assertion, OracleConfig } from '@/lib/oracleTypes';

// Mock Next.js hooks
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '0x123' }),
  useRouter: () => ({ back: vi.fn() }),
}));

// Mock i18n
vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    lang: 'en',
    t: (key: string) => {
      const dict: Record<string, string> = {
        'oracle.detail.title': 'Assertion Details',
        'oracle.detail.disputeAssertion': 'Dispute Assertion',
        'oracle.detail.walletNotFound': 'Wallet not found',
        'oracle.detail.installWallet': 'Please install a wallet like MetaMask!',
        'oracle.detail.txSent': 'Transaction sent',
        'oracle.detail.hash': 'Hash',
        'oracle.detail.votes': 'votes',
        'oracle.detail.goBack': 'Go Back',
        'oracle.detail.errorTitle': 'Error Loading Assertion',
        'oracle.detail.errorNotFound': 'Assertion not found',
        'oracle.detail.back': 'Back to Monitor',
        'oracle.detail.marketQuestion': 'Market Question',
        'oracle.detail.assertedOutcome': 'Asserted Outcome',
        'oracle.detail.asserter': 'Asserter',
        'oracle.detail.transaction': 'Transaction',
        'oracle.detail.bondAmount': 'Bond Amount',
        'oracle.detail.confirming': 'Confirming…',
        'oracle.detail.disputeRequiresBond': 'Disputing requires a bond of',
        'oracle.detail.disputeActive': 'Dispute Active',
        'oracle.detail.reason': 'Reason',
        'oracle.detail.support': 'Support',
        'oracle.detail.against': 'Against',
        'oracle.detail.voteOnDispute': 'Vote on Dispute',
        'oracle.detail.txFailed': 'Transaction failed',
      };
      return dict[key] ?? key;
    }
  }),
}));

let lastDisputeModalProps: unknown = null;

vi.mock('@/components/DisputeModal', () => ({
  DisputeModal: (props: Record<string, unknown>) => {
    lastDisputeModalProps = props;
    return props.isOpen === true ? <div>Dispute Modal</div> : null;
  },
}));

vi.mock('@/components/VoteModal', () => ({
  VoteModal: (props: Record<string, unknown>) => {
    return props.isOpen === true ? <div>Vote Modal</div> : null;
  },
}));

vi.mock('@/components/SettleModal', () => ({
  SettleModal: (props: Record<string, unknown>) => {
    return props.isOpen === true ? <div>Settle Modal</div> : null;
  },
}));

// Mock Utils
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    fetchApiData: vi.fn(),
  };
});

describe('OracleDetailPage', () => {
  const mockAssertion: Assertion = {
    id: '0x123',
    chain: 'Local',
    asserter: '0xabc',
    protocol: 'Aave',
    market: 'ETH/USD > 2000',
    assertion: 'True',
    assertedAt: new Date().toISOString(),
    livenessEndsAt: new Date(Date.now() + 86400000).toISOString(), // +1 day
    status: 'Pending',
    bondUsd: 1000,
    txHash: '0xhash'
  };

  const mockConfig: OracleConfig = {
    chain: 'Local',
    contractAddress: '0xcontract',
    rpcUrl: 'http://localhost:8545'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lastDisputeModalProps = null;
    const fetchApiDataMock = vi.mocked(utils.fetchApiData) as unknown as {
      mockResolvedValue: (value: unknown) => void;
    };
    fetchApiDataMock.mockResolvedValue({
      assertion: mockAssertion,
      dispute: null,
      config: mockConfig,
      bondWei: null,
      bondEth: null
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders assertion details after loading', async () => {
    render(<OracleDetailPage />);
    
    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('Assertion Details')).toBeInTheDocument();
    });

    expect(screen.getByText('ETH/USD > 2000')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getAllByText(/1,000/)[0]).toBeInTheDocument(); // Bond
  });

  it('opens dispute modal and passes required props', async () => {
    render(<OracleDetailPage />);
    
    await waitFor(() => {
        expect(screen.getByText('Assertion Details')).toBeInTheDocument();
    });

    const disputeBtn = screen.getByText('Dispute Assertion');
    fireEvent.click(disputeBtn);

    await waitFor(() => {
      expect(screen.getByText('Dispute Modal')).toBeInTheDocument();
    });
    expect(lastDisputeModalProps as Record<string, unknown>).toEqual(expect.objectContaining({
      assertionId: mockAssertion.id,
      contractAddress: mockConfig.contractAddress,
      chain: mockConfig.chain,
    }));
  });
});
