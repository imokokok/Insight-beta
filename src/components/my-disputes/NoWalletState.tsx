import { PageHeader } from "@/components/PageHeader";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Wallet } from "lucide-react";
import type { TranslationKey } from "@/i18n/translations";

type Translate = (key: TranslationKey) => string;

type NoWalletStateProps = {
  t: Translate;
};

export function NoWalletState({ t }: NoWalletStateProps) {
  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t("nav.myDisputes")}
        description={t("oracle.myDisputes.description")}
      >
        <ConnectWallet />
      </PageHeader>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
          <Wallet size={48} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t("oracle.myDisputes.connectWalletTitle")}
        </h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          {t("oracle.myDisputes.connectWalletDesc")}
        </p>
        <ConnectWallet />
      </div>
    </div>
  );
}
