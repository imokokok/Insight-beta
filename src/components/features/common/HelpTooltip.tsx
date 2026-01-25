"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpTooltip({
  content,
  title,
  children,
  className,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className="cursor-help"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {children}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg -top-4 left-1/2 transform -translate-x-1/2">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {title}
            </h4>
          )}
          <p className="text-xs text-gray-600">{content}</p>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 rotate-45" />
        </div>
      )}
    </div>
  );
}
