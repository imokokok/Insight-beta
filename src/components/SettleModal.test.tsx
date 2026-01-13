import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettleModal } from "./SettleModal";

// Mock dependencies
vi.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key, // Return key as translation
    lang: "en",
  }),
}));

vi.mock("@/contexts/WalletContext", () => ({
  useWallet: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    chainId: 1,
    switchChain: vi.fn(),
    getWalletClient: vi.fn(),
  }),
}));

vi.mock("@/hooks/useOracleTransaction", () => ({
  useOracleTransaction: () => ({
    execute: vi.fn(),
    isSubmitting: false,
    isConfirming: false,
    error: null,
    resetError: vi.fn(),
  }),
}));

describe("SettleModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the modal when isOpen is true", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Check if the modal is rendered by looking for the title
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Get the title specifically by its role and name
    expect(
      screen.getByRole("heading", { name: "oracle.detail.settleAssertion" })
    ).toBeInTheDocument();
  });

  it("should not render the modal when isOpen is false", () => {
    const { container } = render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should close the modal when clicking the close button", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText("common.close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should close the modal when clicking the cancel button", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText("oracle.detail.cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should allow selecting outcome true", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const trueButton = screen.getByText("oracle.settleModal.outcomeTrue");
    fireEvent.click(trueButton);

    // Check if the button is selected (has correct class)
    expect(trueButton.closest("button")).toHaveClass(
      "border-green-500 bg-green-50"
    );
  });

  it("should allow selecting outcome false", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const falseButton = screen.getByText("oracle.settleModal.outcomeFalse");
    fireEvent.click(falseButton);

    // Check if the button is selected (has correct class)
    expect(falseButton.closest("button")).toHaveClass(
      "border-red-500 bg-red-50"
    );
  });

  it("should disable submit button when no outcome is selected", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Get the submit button specifically by its role
    const submitButton = screen.getByRole("button", {
      name: "oracle.detail.settleAssertion",
    });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when outcome is selected", () => {
    render(
      <SettleModal
        assertionId="0xassertion123"
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Select outcome true
    const trueButton = screen.getByText("oracle.settleModal.outcomeTrue");
    fireEvent.click(trueButton);

    // Get the submit button specifically by its role
    const submitButton = screen.getByRole("button", {
      name: "oracle.detail.settleAssertion",
    });
    expect(submitButton).not.toBeDisabled();
  });
});
