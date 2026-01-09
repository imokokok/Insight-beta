"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApiData } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";

type ChartItem = {
  date: string;
  count: number;
  volume: number;
};

export function OracleCharts() {
  const [rawData, setRawData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  useEffect(() => {
    fetchApiData<ChartItem[]>("/api/oracle/charts")
      .then(setRawData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "unknown_error"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    // Calculate cumulative volume
    let cumulative = 0;
    return rawData.map(item => {
      cumulative += item.volume;
      return {
        ...item,
        date: new Date(item.date).toLocaleDateString(locale, { month: "short", day: "numeric" }),
        cumulativeVolume: cumulative
      };
    });
  }, [locale, rawData]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-rose-100 bg-rose-50/50 shadow-sm">
        <CardContent className="p-6 text-sm text-rose-700">
          {getUiErrorMessage(error, t)}
        </CardContent>
      </Card>
    );
  }
  if (chartData.length < 2) {
    return (
      <Card className="border-purple-100/60 bg-white/60 shadow-sm">
        <CardContent className="p-6 text-sm text-purple-700/70">{t("oracle.charts.noData")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-purple-100/60 bg-white/60 shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold text-purple-950">{t("oracle.charts.dailyAssertions")}</h3>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#9333ea" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-100/60 bg-white/60 shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="text-sm font-semibold text-purple-950">{t("oracle.charts.tvsCumulative")}</h3>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => `$${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number | string | undefined) => [`$${Number(value || 0).toLocaleString()}`, "Volume"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeVolume" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
