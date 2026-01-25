import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let assertionsState: {
  items: Array<unknown>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
};

let disputesState: {
  items: Array<unknown>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
};

vi.mock("next/navigation", () => ({
  useParams: () => ({ address: "0x1234" }),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/oracle/address/0x1234",
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

vi.mock("@/hooks/oracle/useOracleData", () => ({
  useOracleData: () => assertionsState,
}));

vi.mock("@/hooks/dispute/useDisputes", () => ({
  useDisputes: () => disputesState,
}));

vi.mock("@/hooks/user/useUserStats", () => ({
  useUserStats: () => ({
    stats: null,
    loading: false,
  }),
}));

vi.mock("@/components/UserStatsCard", () => ({
  UserStatsCard: () => <div>UserStatsCard</div>,
}));

vi.mock("@/components/AssertionList", () => ({
  AssertionList: () => <div>AssertionList</div>,
}));

vi.mock("@/components/DisputeList", () => ({
  DisputeList: () => <div>DisputeList</div>,
}));

vi.mock("@/components/AddressAvatar", () => ({
  AddressAvatar: () => <div>AddressAvatar</div>,
}));

vi.mock("@/components/CopyButton", () => ({
  CopyButton: () => <div>CopyButton</div>,
}));

import AddressProfilePage from "./page";

describe("AddressProfilePage", () => {
  beforeEach(() => {
    assertionsState = {
      items: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    };
    disputesState = {
      items: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
    };
  });

  it("shows error banner for assertions tab", () => {
    assertionsState.error = "api_error";
    render(<AddressProfilePage />);
    expect(screen.getByText("uiError")).toBeInTheDocument();
  });

  it("shows error banner for disputes tab after switching", () => {
    disputesState.error = "api_error";
    render(<AddressProfilePage />);
    fireEvent.click(screen.getByText("oracle.profile.disputesHistory"));
    expect(screen.getByText("uiError")).toBeInTheDocument();
  });
});
