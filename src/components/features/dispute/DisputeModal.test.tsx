import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DisputeModal } from "./DisputeModal";

let mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
const mockExecute = vi.fn();
const mockResetError = vi.fn();

vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: "en",
  }),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    address: mockAddress,
  }),
}));

vi.mock("@/hooks/oracle/useOracleTransaction", () => ({
  useOracleTransaction: () => ({
    execute: mockExecute,
    isSubmitting: false,
    isConfirming: false,
    error: null,
    resetError: mockResetError,
  }),
}));

vi.mock("@/components/InfoTooltip", () => ({
  InfoTooltip: ({ content }: { content: string }) => <span>{content}</span>,
}));

vi.mock("@/components/ConnectWallet", () => ({
  ConnectWallet: () => <div>ConnectWallet</div>,
}));

describe("DisputeModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS = "";
    mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
  });

  it("renders when open", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", {
        name: "oracle.detail.disputeAssertion",
      }).length,
    ).toBeGreaterThan(0);
  });

  it("does not render when closed", () => {
    const { container } = render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={false}
        onClose={mockOnClose}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows missing config prompt when config is absent", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("errors.missingConfig")).toBeInTheDocument();
  });

  it("enables submit when config is missing but form is valid", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Reason provided" },
    });

    expect(
      screen.getByRole("button", { name: "oracle.disputeModal.submit" }),
    ).toBeEnabled();
  });

  it("hides missing config prompt when contract address is provided", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
        contractAddress="0xabc"
      />,
    );

    expect(screen.queryByText("errors.missingConfig")).toBeNull();
  });

  it("renders reason helper and example text", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText("oracle.disputeModal.reasonHint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("common.example: oracle.disputeModal.reasonExample"),
    ).toBeInTheDocument();
  });

  it("disables submit when reason is empty", () => {
    render(
      <DisputeModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByRole("button", { name: "oracle.disputeModal.submit" }),
    ).toBeDisabled();
  });
});
