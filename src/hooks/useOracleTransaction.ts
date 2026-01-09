import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/LanguageProvider";
import { oracleAbi } from "@/lib/oracleAbi";
import { env } from "@/lib/env";
import { createPublicClient, custom, parseEther } from "viem";
import type { OracleChain } from "@/lib/oracleTypes";
import { copyToClipboard, getExplorerUrl } from "@/lib/utils";
import { normalizeWalletError } from "@/lib/walletErrors";

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
  waitForConfirmation?: boolean;
  successTitle?: string;
  successMessage?: string;
  onSuccess?: (hash: string) => void;
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
  const { toast } = useToast();
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <TFunctionName extends OracleWriteFunctionName>({
    functionName,
    args,
    value,
    contractAddress,
    chain,
    waitForConfirmation = true,
    successTitle = "Transaction Sent",
    successMessage = "Your transaction has been submitted.",
    onSuccess,
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

      console.log(`Transaction ${functionName} sent:`, hash);

      const explorerUrl = chain ? getExplorerUrl(chain, hash) : null;
      const copyHash = async () => {
        const ok = await copyToClipboard(hash);
        toast({
          type: ok ? "success" : "error",
          title: ok ? t("common.copied") : t("oracle.detail.txFailed"),
          message: `${hash.slice(0, 10)}…${hash.slice(-8)}`
        });
      };
      
      toast({
        type: "success",
        title: successTitle,
        message: `${successMessage} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
        actionLabel: explorerUrl ? t("common.viewTx") : undefined,
        actionHref: explorerUrl ?? undefined,
        secondaryActionLabel: t("common.copyHash"),
        secondaryActionOnClick: copyHash
      });

      onSuccess?.(hash);

      if (waitForConfirmation && typeof window !== "undefined" && window.ethereum) {
        setIsConfirming(true);
        toast({
          type: "info",
          title: t("oracle.tx.confirmingTitle"),
          message: `${t("oracle.tx.confirmingMsg")} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
          actionLabel: explorerUrl ? t("common.viewTx") : undefined,
          actionHref: explorerUrl ?? undefined,
          secondaryActionLabel: t("common.copyHash"),
          secondaryActionOnClick: copyHash
        });
        const publicClient = createPublicClient({
          chain: client.chain ?? undefined,
          transport: custom(window.ethereum)
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        setIsConfirming(false);
        if (receipt.status === "reverted") {
          const msg = t("oracle.detail.txFailed");
          setError(msg);
          toast({ type: "error", title: t("oracle.detail.txFailed"), message: msg });
          return;
        }
        toast({
          type: "success",
          title: t("oracle.tx.confirmedTitle"),
          message: `${t("oracle.tx.confirmedMsg")} (${hash.slice(0, 10)}…${hash.slice(-8)})`,
          actionLabel: explorerUrl ? t("common.viewTx") : undefined,
          actionHref: explorerUrl ?? undefined,
          secondaryActionLabel: t("common.copyHash"),
          secondaryActionOnClick: copyHash
        });
      }
    } catch (err: unknown) {
      console.error(err);
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
