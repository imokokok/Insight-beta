"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Clock } from "lucide-react";

interface LivenessProgressBarProps {
  startDate: string | number;
  endDate: string | number;
  status: string;
  className?: string;
  tooltip?: string;
  label?: string;
}

export function LivenessProgressBar({
  startDate,
  endDate,
  status,
  className,
  tooltip,
  label = "Challenge Period",
}: LivenessProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const totalDuration = end - start;

    const update = () => {
      const now = Date.now();

      // If status is not Pending, we might want to show full bar or specific state
      // But usually we just want to show time relative to window

      const elapsed = now - start;
      const p = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setProgress(p);

      const remaining = end - now;
      if (remaining <= 0) {
        setTimeLeft("Ended");
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (remaining % (1000 * 60 * 60)) / (1000 * 60)
        );
        // If less than 1 hour, show minutes
        if (hours === 0) {
          setTimeLeft(`${minutes}m left`);
        } else {
          setTimeLeft(`${hours}h ${minutes}m left`);
        }
      }
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const isExpired = progress >= 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span className="flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip content={tooltip} side="right" />}
        </span>
        <span
          className={cn(
            "flex items-center gap-1",
            isExpired ? "text-gray-400" : "text-purple-600 font-bold"
          )}
        >
          <Clock size={12} />
          {timeLeft}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200/50">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-out shadow-sm",
            isExpired
              ? "bg-gray-300"
              : "bg-gradient-to-r from-purple-500 to-indigo-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
