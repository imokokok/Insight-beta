"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  content: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({
  content,
  className,
  side = "top",
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info
        size={14}
        className={cn(
          "text-gray-400 cursor-help transition-colors hover:text-purple-600",
          className
        )}
      />

      {/* Tooltip Popup */}
      <div
        className={cn(
          "absolute z-50 w-64 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-xl transition-all duration-200 pointer-events-none",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
          side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
          side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
        )}
      >
        {content}
        {/* Arrow */}
        <div
          className={cn(
            "absolute w-2 h-2 bg-gray-900 rotate-45",
            side === "top" && "bottom-[-4px] left-1/2 -translate-x-1/2",
            side === "bottom" && "top-[-4px] left-1/2 -translate-x-1/2",
            side === "left" && "right-[-4px] top-1/2 -translate-y-1/2",
            side === "right" && "left-[-4px] top-1/2 -translate-y-1/2"
          )}
        />
      </div>
    </div>
  );
}
