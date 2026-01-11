"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";

interface PayoutSimulatorProps {
  initialBond?: number;
  currencySymbol?: string;
}

export function PayoutSimulator({
  initialBond = 0,
  currencySymbol = "USD",
}: PayoutSimulatorProps) {
  const { t } = useI18n();
  const [bondAmount, setBondAmount] = useState<string>(
    initialBond > 0 ? initialBond.toString() : "1000"
  );
  const [mode, setMode] = useState<"assert" | "dispute">("dispute");

  const bond = parseFloat(bondAmount) || 0;

  // Basic 1:1 bond escalation logic
  // Assert: If no dispute, get bond back. If disputed & win, get bond + opponent bond.
  // Dispute: Stake bond. If win, get bond + opponent bond.

  // Using simple model:
  // Win = Bond * 2 (return) -> Profit = Bond
  // ROI = 100%

  // For more complex escalation (e.g. UMA 2.0 or varying bonds), this would need contract data.
  // Here we assume standard game theory optimal play where bonds are matched 1:1.

  const profit = bond;
  const potentialReturn = bond + profit;
  const roi = bond > 0 ? (profit / bond) * 100 : 0;

  return (
    <Card className="w-full bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <CardTitle className="text-lg">{t("pnl.title")}</CardTitle>
        </div>
        <CardDescription>{t("pnl.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "assert" | "dispute")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dispute">{t("pnl.iWantToDispute")}</TabsTrigger>
            <TabsTrigger value="assert">{t("pnl.iWantToAssert")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>{t("pnl.bondAmount")}</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="number"
              value={bondAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBondAmount(e.target.value)
              }
              className="pl-9 bg-white/50 dark:bg-black/50"
            />
          </div>
        </div>

        <div className="rounded-lg bg-white dark:bg-black/40 p-4 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{t("pnl.profit")}</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              +{profit.toLocaleString()} {currencySymbol}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{t("pnl.roi")}</span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {roi.toFixed(0)}%
            </span>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 my-2 pt-2 flex justify-between items-center">
            <span className="font-medium">{t("pnl.totalReturn")}</span>
            <span className="text-xl font-bold">
              {potentialReturn.toLocaleString()} {currencySymbol}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 italic">{t("pnl.disclaimer")}</p>
      </CardContent>
    </Card>
  );
}
