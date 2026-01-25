import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

const mockAddressState = { current: null as string | null };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/my-disputes",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/i18n/translations", () => ({
  getUiErrorMessage: (code: string) => `Error: ${code}`,
  langToLocale: { en: "en-US" },
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: vi.fn(() => ({ address: mockAddressState.current })),
}));

vi.mock("@/hooks/dispute/useDisputes", () => ({
  useDisputes: vi.fn(() => ({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  })),
}));

vi.mock("@/hooks/user/useUserStats", () => ({
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
    <div data-testid="page-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ConnectWallet", () => ({
  ConnectWallet: () => <div data-testid="connect-wallet">ConnectWallet</div>,
}));

vi.mock("@/components/UserStatsCard", () => ({
  UserStatsCard: () => <div data-testid="user-stats">UserStatsCard</div>,
}));

vi.mock("@/lib/utils", async () => {
  const actual = await import("@/lib/utils");
  return {
    ...actual,
    fetchApiData: vi.fn().mockResolvedValue({ instances: [] }),
  };
});

vi.mock("@/components/features/dispute/DisputeList", () => ({
  DisputeList: () => <div data-testid="dispute-list">DisputeList</div>,
}));

import MyDisputesPage from "./page";

describe("MyDisputesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddressState.current = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders connect wallet prompt when wallet is disconnected", () => {
    render(<MyDisputesPage />);
    expect(
      screen.getByText("oracle.myDisputes.connectWalletTitle"),
    ).toBeInTheDocument();
  });
});
