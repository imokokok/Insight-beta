import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, trendUp, className }: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-purple-700/70">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-purple-100/50 p-2 text-purple-600">
          <Icon size={18} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-purple-950">{value}</div>
        {trend && (
          <p className={cn("text-xs mt-1", trendUp ? "text-emerald-600" : "text-rose-600")}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
