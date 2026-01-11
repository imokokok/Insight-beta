import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisputeList } from "./DisputeList";
import type { Dispute } from "@/lib/oracleTypes";

// Mock dependencies
vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key, // Return key as translation
    lang: "en",
  }),
}));

vi.mock("@/i18n/translations", () => ({
  langToLocale: { en: "en-US" },
}));

// Mock Link to avoid Next.js router context issues
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
    <a href={href} className={className} data-testid="mock-link">
      {children}
    </a>
  ),
}));

// Mock SkeletonList
vi.mock("./SkeletonList", () => ({
  SkeletonList: ({ count }: { count: number }) => (
    <div data-testid="skeleton-list">Skeleton Loading {count}</div>
  ),
}));

// Mock react-virtuoso
type VirtuosoProps<T> = {
  itemContent: (index: number, item: T) => React.ReactNode;
  data: T[];
};

type VirtuosoGridProps<T> = VirtuosoProps<T> & {
  listClassName?: string;
  itemClassName?: string;
};

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ itemContent, data }: VirtuosoProps<unknown>) => (
    <div data-testid="virtuoso-list">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
  VirtuosoGrid: ({
    itemContent,
    data,
    listClassName,
    itemClassName,
  }: VirtuosoGridProps<unknown>) => (
    <div className={listClassName} data-testid="virtuoso-grid">
      {data.map((item, index) => (
        <div key={index} className={itemClassName}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

describe("DisputeList", () => {
  const mockDispute: Dispute = {
    id: "0x1234567890abcdef1234567890abcdef12345678",
    chain: "Arbitrum",
    assertionId: "0xassertion",
    market: "Test Market",
    disputeReason: "Bad result",
    disputer: "0xuser",
    disputedAt: new Date().toISOString(),
    votingEndsAt: new Date().toISOString(),
    status: "Voting",
    currentVotesFor: 10,
    currentVotesAgainst: 5,
    totalVotes: 15,
  };

  it("renders loading skeleton when loading is true", () => {
    render(
      <DisputeList
        items={[]}
        loading={true}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />
    );
    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
  });

  it("renders empty state when items are empty", () => {
    render(
      <DisputeList
        items={[]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />
    );
    expect(screen.getByText("common.noData")).toBeInTheDocument();
  });

  it("renders items in grid view", () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />
    );

    // Check if ID is displayed (truncated)
    expect(screen.getByText("0x123456...")).toBeInTheDocument();
    // Check if chain is displayed
    expect(screen.getByText("A")).toBeInTheDocument(); // First letter of Arbitrum
    // Check if status is displayed
    expect(screen.getByText("status.voting")).toBeInTheDocument();
  });

  it("renders items in list view", () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="list"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />
    );

    // Check content
    expect(screen.getByText("0x123456...")).toBeInTheDocument();
    // In list view, status might be displayed differently or same, but checking existence
    expect(screen.getByText("status.voting")).toBeInTheDocument();
  });

  it("generates correct link to assertion details", () => {
    render(
      <DisputeList
        items={[mockDispute]}
        loading={false}
        viewMode="grid"
        hasMore={false}
        loadMore={() => {}}
        loadingMore={false}
      />
    );

    const link = screen.getByTestId("mock-link");
    expect(link).toHaveAttribute("href", "/oracle/0xassertion");
  });
});
