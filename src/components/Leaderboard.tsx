"use client";

import { useEffect, useState } from "react";
import { Trophy, ShieldAlert, Award, Medal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApiData, formatUsdCompact } from "@/lib/utils";
import type { LeaderboardStats } from "@/lib/oracleTypes";

import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="flex h-5 w-5 items-center justify-center font-bold text-gray-500">{rank}</span>;
}

function AddressDisplay({ address }: { address: string }) {
  return (
    <span className="font-mono text-sm text-gray-700">
      {address.substring(0, 6)}...{address.substring(38)}
    </span>
  );
}

export function Leaderboard() {
  const [data, setData] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useI18n();
  const locale = langToLocale[lang];

  useEffect(() => {
    fetchApiData<LeaderboardStats>("/api/oracle/leaderboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-purple-100 bg-white/60 shadow-sm">
          <CardHeader className="pb-4"><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-rose-100 bg-white/60 shadow-sm">
          <CardHeader className="pb-4"><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Top Asserters */}
      <Card className="border-purple-100 bg-white/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Top Asserters</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topAsserters.map((item) => (
              <div key={item.address} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <RankIcon rank={item.rank} />
                  <AddressDisplay address={item.address} />
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{formatUsdCompact(item.value || 0, locale)}</div>
                  <div className="text-xs text-gray-500">{item.count} assertions</div>
                </div>
              </div>
            ))}
            {data.topAsserters.length === 0 && (
              <div className="text-center text-sm text-gray-500">No data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Disputers */}
      <Card className="border-rose-100 bg-white/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold text-gray-900">Top Disputers</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topDisputers.map((item) => (
              <div key={item.address} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <RankIcon rank={item.rank} />
                  <AddressDisplay address={item.address} />
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{item.count} disputes</div>
                </div>
              </div>
            ))}
            {data.topDisputers.length === 0 && (
              <div className="text-center text-sm text-gray-500">No data available</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
