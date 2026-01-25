import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import OracleDetailPage from "./page";
import * as utils from "@/lib/utils";
import { Assertion, OracleConfig } from "@/lib/types/oracleTypes";
import { WalletProvider } from "@/contexts/WalletContext";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "0x123" }),
  useRouter: () => ({ back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    lang: "en",
    t: (key: string) => {
      const dict: Record<string, string> = {
        "oracle.detail.title": "Assertion Details",
        "oracle.detail.disputeAssertion": "Dispute Assertion",
        "oracle.detail.errorTitle": "Error Loading Assertion",
        "oracle.detail.back": "Back to Monitor",
        "oracle.detail.bondAmount": "Bond Amount",
        "oracle.detail.pending": "Pending",
      };
      return dict[key] ?? key;
    },
  }),
}));

const DisputeModalMock = (props: Record<string, unknown>) => {
  return (
    <div data-testid="dispute-modal">
      {props.isOpen === true ? "Dispute Modal" : null}
    </div>
  );
};

const SettleModalMock = (props: Record<string, unknown>) => {
  return (
    <div data-testid="settle-modal">
      {props.isOpen === true ? "Settle Modal" : null}
    </div>
  );
};

vi.mock("@/components/features/dispute/DisputeModal", () => ({
  DisputeModal: DisputeModalMock,
}));

vi.mock("@/components/features/common/SettleModal", () => ({
  SettleModal: SettleModalMock,
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof utils>();
  return {
    ...actual,
    fetchApiData: vi.fn(),
  };
});

vi.mock("@/components/features/assertion/AssertionTimeline", () => ({
  AssertionTimeline: () => <div data-testid="timeline">Timeline</div>,
}));

vi.mock("@/components/features/oracle/PayoutSimulator", () => ({
  PayoutSimulator: () => (
    <div data-testid="payout-simulator">PayoutSimulator</div>
  ),
}));

vi.mock("@/components/features/common/CountdownTimer", () => ({
  CountdownTimer: () => <div data-testid="countdown">Countdown</div>,
}));

vi.mock("@/components/features/wallet/AddressAvatar", () => ({
  AddressAvatar: () => <div data-testid="address-avatar">Avatar</div>,
}));

vi.mock("@/components/features/common/CopyButton", () => ({
  CopyButton: () => <button data-testid="copy-button">Copy</button>,
}));

vi.mock("@/components/features/common/InfoTooltip", () => ({
  InfoTooltip: () => <span data-testid="info-tooltip">Tooltip</span>,
}));

vi.mock("@/components/features/oracle/LivenessProgressBar", () => ({
  LivenessProgressBar: () => <div data-testid="liveness-bar">Liveness</div>,
}));

describe("OracleDetailPage", () => {
  const mockAssertion: Assertion = {
    id: "0x123",
    chain: "Local",
    asserter: "0xabc",
    protocol: "Aave",
    market: "ETH/USD > 2000",
    assertion: "True",
    assertedAt: new Date().toISOString(),
    livenessEndsAt: new Date(Date.now() + 86400000).toISOString(),
    status: "Pending",
    bondUsd: 1000,
    txHash: "0xhash",
  };

  const mockConfig: OracleConfig = {
    chain: "Local",
    contractAddress: "0xcontract",
    rpcUrl: "http://localhost:8545",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const fetchApiDataMock = vi.mocked(utils.fetchApiData);
    fetchApiDataMock.mockImplementation((input) => {
      if (typeof input === "string" && input.includes("/timeline")) {
        return Promise.resolve({
          assertion: mockAssertion,
          dispute: null,
          alerts: [],
          timeline: [],
        });
      }

      return Promise.resolve({
        assertion: mockAssertion,
        dispute: null,
        config: mockConfig,
        bondWei: null,
        bondEth: null,
        voteTrackingEnabled: true,
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("renders assertion details after loading", async () => {
    render(
      <WalletProvider>
        <OracleDetailPage />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Assertion Details")).toBeInTheDocument();
    });

    expect(screen.getByText("ETH/USD > 2000")).toBeInTheDocument();
  });

  it("handles pending status correctly", async () => {
    render(
      <WalletProvider>
        <OracleDetailPage />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Assertion Details")).toBeInTheDocument();
    });

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("displays bond amount section", async () => {
    render(
      <WalletProvider>
        <OracleDetailPage />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Bond Amount")).toBeInTheDocument();
    });
  });
});
