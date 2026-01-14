"use client";

import { useCallback, useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/LanguageProvider";
import { normalizeWalletError } from "@/lib/walletErrors";
import { logger } from "@/lib/logger";

type ChainTarget = {
  id: number;
  name: string;
};

export function useSwitchChainWithFeedback(options?: { onClose?: () => void }) {
  const { chainId, switchChain } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null);
  const lockRef = useRef(false);

  const switchToChain = useCallback(
    async (target: ChainTarget) => {
      if (lockRef.current) return;
      if (chainId === target.id) {
        toast({
          type: "info",
          title: t("wallet.networkAlreadySelected"),
          message: target.name,
        });
        options?.onClose?.();
        return;
      }

      try {
        lockRef.current = true;
        setSwitchingChainId(target.id);
        await switchChain(target.id);
        toast({
          type: "success",
          title: t("wallet.networkSwitched"),
          message: target.name,
        });
        options?.onClose?.();
      } catch (err: unknown) {
        logger.error("Failed to switch chain:", { error: err });
        const normalized = normalizeWalletError(err);
        const msg =
          normalized.kind === "USER_REJECTED"
            ? t("errors.userRejected")
            : normalized.kind === "REQUEST_PENDING"
            ? t("errors.requestPending")
            : normalized.kind === "CHAIN_NOT_ADDED"
            ? t("errors.chainNotAdded")
            : normalized.kind === "WRONG_NETWORK"
            ? t("errors.wrongNetwork")
            : t("errors.unknownError");
        toast({
          type: "error",
          title: t("wallet.networkSwitchFailed"),
          message: msg,
          actionLabel: t("common.retry"),
          actionOnClick: () => {
            void switchToChain(target);
          },
        });
      } finally {
        setSwitchingChainId(null);
        lockRef.current = false;
      }
    },
    [chainId, options, switchChain, t, toast]
  );

  return { switchToChain, switchingChainId };
}
