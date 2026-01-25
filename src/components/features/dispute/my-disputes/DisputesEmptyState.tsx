import Link from "next/link";
import { Wallet } from "lucide-react";
import type { TranslationKey } from "@/i18n/translations";

type Translate = (key: TranslationKey) => string;

type DisputesEmptyStateProps = {
  instanceId: string;
  t: Translate;
};

export function DisputesEmptyState({ instanceId, t }: DisputesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
        <Wallet size={48} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {t("oracle.myDisputes.noDisputes")}
      </h2>
      <p className="text-gray-500 max-w-md mx-auto">
        {t("oracle.myDisputes.description")}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href={
            instanceId
              ? `/oracle?instanceId=${encodeURIComponent(instanceId)}`
              : "/oracle"
          }
          className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30"
        >
          {t("nav.oracle")}
        </Link>
        <Link
          href={
            instanceId
              ? `/disputes?instanceId=${encodeURIComponent(instanceId)}`
              : "/disputes"
          }
          className="px-6 py-3 rounded-xl border border-purple-200 text-purple-700 bg-white hover:bg-purple-50 transition-colors font-medium"
        >
          {t("nav.disputes")}
        </Link>
      </div>
    </div>
  );
}
