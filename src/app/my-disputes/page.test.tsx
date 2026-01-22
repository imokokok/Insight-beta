import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockAddress: string | null = null;
let disputesState: {
  items: Array<unknown>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/my-disputes",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/i18n/translations", () => ({
  getUiErrorMessage: () => "uiError",
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    address: mockAddress,
  }),
}));

vi.mock("@/hooks/useDisputes", () => ({
  useDisputes: () => disputesState,
}));

vi.mock("@/hooks/useUserStats", () => ({
  useUserStats: () => ({
    stats: null,
    loading: false,
  }),
}));

vi.mock("@/components/PageHeader", () => ({
  PageHeader: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ConnectWallet", () => ({
  ConnectWallet: () => <div>ConnectWallet</div>,
}));

vi.mock("@/components/UserStatsCard", () => ({
  UserStatsCard: () => <div>UserStatsCard</div>,
}));

vi.mock("@/components/DisputeList", () => ({
  DisputeList: () => <div>DisputeList</div>,
}));

import MyDisputesPage from "./page";

describe("MyDisputesPage", () => {
  beforeEach(() => {
    mockAddress = null;
    disputesState = {
      items: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    };
  });

  it("renders connect wallet prompt when wallet is disconnected", () => {
    render(<MyDisputesPage />);
    expect(
      screen.getByText("oracle.myDisputes.connectWalletTitle"),
    ).toBeInTheDocument();
  });

  it("renders search input when wallet is connected", () => {
    mockAddress = "0x1234";
    render(<MyDisputesPage />);
    expect(
      screen.getByPlaceholderText("oracle.myDisputes.searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("shows error banner when disputes fail to load", () => {
    mockAddress = "0x1234";
    disputesState.error = "api_error";
    render(<MyDisputesPage />);
    expect(screen.getByText("uiError")).toBeInTheDocument();
  });
});
