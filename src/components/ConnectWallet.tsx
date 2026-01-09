"use client";

import { Wallet } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/LanguageProvider";
import { useWallet } from "@/contexts/WalletContext";
import { normalizeWalletError } from "@/lib/walletErrors";

export function ConnectWallet() {
  const { address, connect, disconnect, isConnecting } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        type: "success",
        title: t("wallet.connected"),
        message: t("wallet.connectedMsg")
      });
    } catch (error: unknown) {
      console.error("Failed to connect wallet:", error);
      const normalized = normalizeWalletError(error);
      if (normalized.kind === "WALLET_NOT_FOUND") {
        toast({
          type: "error",
          title: t("wallet.notFound"),
          message: t("wallet.install")
        });
        return;
      }
      const msg =
        normalized.kind === "USER_REJECTED"
          ? t("errors.userRejected")
          : normalized.kind === "REQUEST_PENDING"
            ? t("errors.requestPending")
            : t("errors.unknownError");
      toast({
        type: "error",
        title: t("wallet.failed"),
        message: msg
      });
    }
  };

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
      >
        <div className="h-2 w-2 rounded-full bg-green-500" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Wallet size={16} />
      {isConnecting ? t("wallet.connecting") : t("wallet.connect")}
    </button>
  );
}
