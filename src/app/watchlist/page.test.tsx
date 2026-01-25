import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

let watchlistState: { watchlist: string[]; mounted: boolean };
let listState: {
  items: Array<unknown>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
};

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/watchlist",
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

vi.mock("@/hooks/user/useWatchlist", () => ({
  useWatchlist: () => watchlistState,
}));

vi.mock("@/hooks/ui/useInfiniteList", () => ({
  useInfiniteList: () => listState,
}));

vi.mock("@/components/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/AssertionList", () => ({
  AssertionList: () => <div>AssertionList</div>,
}));

import WatchlistPage from "./page";

describe("WatchlistPage", () => {
  beforeEach(() => {
    watchlistState = { watchlist: ["0xabc"], mounted: true };
    listState = {
      items: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    };
  });

  it("shows error banner when watchlist fetch fails", () => {
    listState.error = "api_error";
    render(<WatchlistPage />);
    expect(screen.getByText("uiError")).toBeInTheDocument();
  });
});
