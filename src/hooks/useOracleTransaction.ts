import { useRef, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/LanguageProvider";
import { oracleAbi } from "@/lib/oracleAbi";
import { env } from "@/lib/env";
import { createPublicClient, custom, http, parseEther, webSocket } from "viem";
import type { OracleChain, OracleConfig } from "@/lib/oracleTypes";
import { copyToClipboard, fetchApiData, getExplorerUrl, parseRpcUrls } from "@/lib/utils";
import { normalizeWalletError } from "@/lib/walletErrors";
import { logger } from "@/lib/logger";

type OracleWriteFunctionName = Exclude<typeof oracleAbi[number]["name"], "getBond">;

type OracleWriteArgs =
  | readonly [protocol: string, market: string, assertion: string]
  | readonly [`0x${string}`]
  | readonly [`0x${string}`, support: boolean];

type TransactionOptions<TFunctionName extends OracleWriteFunctionName> = {
  functionName: TFunctionName;
  args: OracleWriteArgs;
  value?: string; // ETH value as string, e.g. "0.1"
  contractAddress?: string;
  chain?: OracleChain;
  rpcUrl?: string;
  waitForConfirmation?: boolean;
  successTitle?: string;
  successMessage?: string;
  onSuccess?: (hash: string) => void;
  onConfirmed?: (hash: string) => void;
  onError?: (error: unknown) => void;
};

function oracleChainToChainId(chain: OracleChain): number {
  if (chain === "Polygon") return 137;
  if (chain === "Arbitrum") return 42161;
  if (chain === "Optimism") return 10;
  return 31337;
}

export function useOracleTransaction() {
  const { address, chainId, switchChain, getWalletClient } = useWallet();
  const { toast, update } = useToast();
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configRef = useRef<OracleConfig | null>(null);

  const execute = async <TFunctionName extends OracleWriteFunctionName>({
    functionName,
    args,
    value,
    contractAddress,
    chain,
    rpcUrl,
    waitForConfirmation = true,
    successTitle,
    successMessage,
    onSuccess,
    onConfirmed,
    onError
  }: TransactionOptions<TFunctionName>) => {
    if (!address) {
      const msg = t("errors.walletNotConnected");
      setError(msg);
      toast({ type: "error", title: t("oracle.detail.validationError"), message: msg });
      return;
    }

    setIsSubmitting(true);
    setIsConfirming(false);
    setError(null);

    try {
      const expectedChainId = chain ? oracleChainToChainId(chain) : null;
      if (expectedChainId && chainId !== expectedChainId) {
        try {
          await switchChain(expectedChainId);
        } catch (err) {
          const normalized = normalizeWalletError(err);
          const msg =
            normalized.kind === "CHAIN_NOT_ADDED"
              ? t("errors.chainNotAdded")
              : normalized.kind === "USER_REJECTED"
                ? t("errors.userRejected")
                : normalized.kind === "REQUEST_PENDING"
                  ? t("errors.requestPending")
                  : t("errors.wrongNetwork");
          setError(msg);
          toast({ type: "error", title: t("oracle.detail.validationError"), message: msg });
          return;
        }
      }

      const client = await getWalletClient(expectedChainId ?? undefined);
      if (!client) throw new Error("No wallet client");

      const targetAddress = contractAddress || env.INSIGHT_ORACLE_ADDRESS;
      if (!targetAddress) throw new Error("Oracle contract address not configured");

      const hash = await client.writeContract({
        account: address as `0x${string}`,
        address: targetAddress as `0x${string}`,
        abi: oracleAbi,
        functionName: functionName,
        args,
        value: value ? parseEther(value) : undefined,
        chain: client.chain ?? null
      } as unknown as Parameters<typeof client.writeContract>[0]);

      logger.info(`Transaction ${functionName} sent:`, hash);

      const explorerUrl = chain ? getExplorerUrl(chain, hash) : null;
      const copyHashForToast = async (toastId: string) => {
        const ok = await copyToClipboard(hash);
        if (ok) {
          update(toastId, {
            secondaryActionLabel: t("common.copied"),
            secondaryActionDisabled: true
          });
          window.setTimeout(() => {
            update(toastId, {
              secondaryActionLabel: t("common.copyHash"),
              secondaryActionDisabled: false
            });
          }, 1200);
          return;
        }
        toast({
          type: "error",
          title: t("oracle.detail.txFailed"),
          message: t("errors.unknownError")
        });
      };
      const makeCopyHandler = (toastId: string) => () => {
        void copyHashForToast(toastId);
      };

      const sentToastId = Math.random().toString(36).substring(2, 9);
      toast({
        id: sentToastId,
        type: "success",
        title: successTitle ?? t("oracle.tx.sentTitle"),
        message: `${successMessage ?? t("oracle.tx.sentMsg")} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
        actionLabel: explorerUrl ? t("common.viewTx") : undefined,
        actionHref: explorerUrl ?? undefined,
        secondaryActionLabel: t("common.copyHash"),
        secondaryActionOnClick: makeCopyHandler(sentToastId)
      });

      onSuccess?.(hash);

      if (waitForConfirmation && typeof window !== "undefined" && window.ethereum) {
        setIsConfirming(true);
        const confirmingToastId = Math.random().toString(36).substring(2, 9);
        toast({
          id: confirmingToastId,
          type: "info",
          title: t("oracle.tx.confirmingTitle"),
          message: `${t("oracle.tx.confirmingMsg")} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
          actionLabel: explorerUrl ? t("common.viewTx") : undefined,
          actionHref: explorerUrl ?? undefined,
          secondaryActionLabel: t("common.copyHash"),
          secondaryActionOnClick: makeCopyHandler(confirmingToastId)
        });
        let effectiveRpcUrl = (rpcUrl ?? "").trim();
        if (!effectiveRpcUrl) {
          if (!configRef.current) {
            try {
              configRef.current = await fetchApiData<OracleConfig>("/api/oracle/config");
            } catch {
              configRef.current = null;
            }
          }
          effectiveRpcUrl = (configRef.current?.rpcUrl ?? "").trim();
        }
        const primaryRpcUrl = parseRpcUrls(effectiveRpcUrl)[0] ?? "";

        const publicClient = createPublicClient({
          chain: client.chain ?? undefined,
          transport: primaryRpcUrl
            ? (primaryRpcUrl.startsWith("ws") ? webSocket(primaryRpcUrl) : http(primaryRpcUrl))
            : custom(window.ethereum)
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setIsConfirming(false);
        if (receipt.status === "reverted") {
          const msg = t("oracle.detail.txFailed");
          setError(msg);
          toast({ type: "error", title: t("oracle.detail.txFailed"), message: msg });
          return;
        }
        const confirmedToastId = Math.random().toString(36).substring(2, 9);
        toast({
          id: confirmedToastId,
          type: "success",
          title: t("oracle.tx.confirmedTitle"),
          message: `${t("oracle.tx.confirmedMsg")} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
          actionLabel: explorerUrl ? t("common.viewTx") : undefined,
          actionHref: explorerUrl ?? undefined,
          secondaryActionLabel: t("common.copyHash"),
          secondaryActionOnClick: makeCopyHandler(confirmedToastId)
        });
        onConfirmed?.(hash);
      }
    } catch (err: unknown) {
      logger.error(err);
      const normalized = normalizeWalletError(err);
      const errorMessage =
        normalized.kind === "USER_REJECTED"
          ? t("errors.userRejected")
          : normalized.kind === "REQUEST_PENDING"
            ? t("errors.requestPending")
            : normalized.kind === "INSUFFICIENT_FUNDS"
              ? t("errors.insufficientFunds")
              : normalized.rawMessage ?? t("errors.unknownError");
      setError(errorMessage);
      toast({
        type: "error",
        title: t("oracle.detail.txFailed"),
        message: errorMessage,
      });
      onError?.(err);
    } finally {
      setIsSubmitting(false);
      setIsConfirming(false);
    }
  };

  return { execute, isSubmitting, isConfirming, error, resetError: () => setError(null) };
}
