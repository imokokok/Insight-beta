import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let mockAddress: string | null = null;
let oracleState: {
  items: Array<unknown>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/my-assertions",
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

vi.mock("@/hooks/useOracleData", () => ({
  useOracleData: () => oracleState,
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

vi.mock("@/components/AssertionList", () => ({
  AssertionList: () => <div>AssertionList</div>,
}));

import MyAssertionsPage from "./page";

describe("MyAssertionsPage", () => {
  beforeEach(() => {
    mockAddress = null;
    oracleState = {
      items: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    };
  });

  it("renders connect wallet prompt when wallet is disconnected", () => {
    render(<MyAssertionsPage />);
    expect(
      screen.getByText("oracle.myAssertions.connectWalletTitle"),
    ).toBeInTheDocument();
  });

  it("renders search input when wallet is connected", () => {
    mockAddress = "0x1234";
    render(<MyAssertionsPage />);
    expect(
      screen.getByPlaceholderText("oracle.myAssertions.searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("shows error banner when assertions fail to load", () => {
    mockAddress = "0x1234";
    oracleState.error = "api_error";
    render(<MyAssertionsPage />);
    expect(screen.getByText("uiError")).toBeInTheDocument();
  });
});
