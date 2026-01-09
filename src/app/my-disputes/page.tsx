"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConnectWallet } from "@/components/ConnectWallet";
import { DisputeList } from "@/components/DisputeList";
import { UserStatsCard } from "@/components/UserStatsCard";
import { useDisputes } from "@/hooks/useDisputes";
import { useUserStats } from "@/hooks/useUserStats";
import { useWallet } from "@/contexts/WalletContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { 
  LayoutGrid, 
  List, 
  Search,
  Wallet 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyDisputesPage() {
  const { address } = useWallet();
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");

  const { items, loading, loadingMore, hasMore, loadMore } = useDisputes("All", "All", query, address);
  const { stats, loading: statsLoading } = useUserStats(address);

  if (!address) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader 
          title="My Disputes" 
          description="View and manage your disputes"
        >
          <ConnectWallet />
        </PageHeader>
        
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
            <Wallet size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Please connect your wallet to view your dispute history and statistics.
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title={t("nav.myDisputes")} 
        description={t("oracle.myDisputes.description")}
      >
        <ConnectWallet />
      </PageHeader>

      {/* User Stats */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <UserStatsCard stats={stats} loading={statsLoading} />
      </div>

      {/* Toolbar */}
      <div className="glass-panel sticky top-4 z-20 rounded-2xl p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xl shadow-purple-900/5 backdrop-blur-xl border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "grid" ? "bg-white shadow text-purple-600" : "text-gray-400 hover:text-gray-600"
              )}
              title={t("oracle.card.gridView")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list" ? "bg-white shadow text-purple-600" : "text-gray-400 hover:text-gray-600"
              )}
              title={t("oracle.card.listView")}
            >
              <List size={16} />
            </button>
          </div>
          
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={t("oracle.searchPlaceholder")} 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
            />
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <DisputeList 
          items={items} 
          loading={loading} 
          viewMode={viewMode}
          hasMore={hasMore}
          loadMore={loadMore}
          loadingMore={loadingMore}
        />
      </div>
    </div>
  );
}
