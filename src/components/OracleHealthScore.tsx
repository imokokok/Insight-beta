import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface OracleHealthScoreProps {
  score: number;
  isLoading?: boolean;
}

export function OracleHealthScore({
  score,
  isLoading,
}: OracleHealthScoreProps) {
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-pulse h-16 w-16 rounded-full bg-gray-200" />
      </div>
    );
  }

  let color = "text-green-500";
  let bgColor = "bg-green-50";
  let ringColor = "ring-green-100";
  let Icon = ShieldCheck;
  let statusText = "Excellent";

  if (score < 90) {
    color = "text-yellow-500";
    bgColor = "bg-yellow-50";
    ringColor = "ring-yellow-100";
    Icon = CheckCircle2;
    statusText = "Good";
  }
  if (score < 80) {
    color = "text-orange-500";
    bgColor = "bg-orange-50";
    ringColor = "ring-orange-100";
    Icon = Activity;
    statusText = "Degraded";
  }
  if (score < 60) {
    color = "text-red-500";
    bgColor = "bg-red-50";
    ringColor = "ring-red-100";
    Icon = AlertTriangle;
    statusText = "Critical";
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div
        className={cn(
          "relative flex items-center justify-center w-24 h-24 rounded-full border-4 mb-4",
          bgColor,
          ringColor,
          color.replace("text-", "border-"),
        )}
      >
        <Icon className={cn("w-10 h-10", color)} />
        <span
          className={cn(
            "absolute -bottom-2 bg-white px-2 py-0.5 rounded-full text-xs font-bold border shadow-sm",
            color.replace("text-", "border-"),
            color,
          )}
        >
          {score}/100
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{statusText}</h3>
      <p className="text-sm text-gray-500 mt-1">Node Health Score</p>
    </div>
  );
}
