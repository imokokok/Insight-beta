"use client";

import { useI18n } from "@/i18n/LanguageProvider";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calculator, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PnLCalculator() {
  const { t } = useI18n();
  const [bondAmount, setBondAmount] = useState<string>("1000");
  const [role, setRole] = useState<"disputer" | "asserter">("disputer");

  // Simplified logic for Optimistic Oracle:
  // Usually it's a 1:1 game. Winner takes loser's bond.
  // ROI is typically 100% (excluding gas).
  const bond = parseFloat(bondAmount) || 0;
  const profit = bond; // Winner gets their bond back + loser's bond
  const totalReturn = bond + profit;
  const roi = bond > 0 ? ((profit / bond) * 100).toFixed(0) : "0";

  return (
    <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">
              {t("pnl.title")}
            </CardTitle>
            <CardDescription className="text-indigo-100">
              {t("pnl.description")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setRole("disputer")}
            className={cn(
              "py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              role === "disputer"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t("pnl.iWantToDispute")}
          </button>
          <button
            onClick={() => setRole("asserter")}
            className={cn(
              "py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              role === "asserter"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t("pnl.iWantToAssert")}
          </button>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t("pnl.bondAmount")}
          </label>
          <div className="relative group">
            <input
              type="number"
              value={bondAmount}
              onChange={(e) => setBondAmount(e.target.value)}
              className="w-full text-4xl font-bold text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-violet-500 outline-none px-2 py-2 transition-colors placeholder:text-slate-300"
              placeholder="0"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-lg">
              {t("common.usd")}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t("pnl.disclaimer")}</p>
        </div>

        {/* Result Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="h-24 w-24 text-emerald-600" />
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-1">
                {t("pnl.profit")}
              </p>
              <p className="text-3xl font-bold text-emerald-700">
                +${profit.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-600 mb-1">
                {t("pnl.roi")}
              </p>
              <p className="text-3xl font-bold text-emerald-700">{roi}%</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-emerald-200/50 flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-emerald-800/60">
                {t("pnl.totalReturn")}
              </span>
              <span className="font-semibold text-emerald-900">
                ${totalReturn.toLocaleString()}
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
