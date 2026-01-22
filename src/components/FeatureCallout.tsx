"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FeatureCalloutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export function FeatureCallout({
  title,
  description,
  icon,
  className,
}: FeatureCalloutProps) {
  return (
    <div
      className={cn(
        "flex items-start p-4 bg-blue-50 border border-blue-100 rounded-lg",
        className,
      )}
    >
      <div className="text-blue-600 mr-3">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-blue-900 mb-1">{title}</h3>
        <p className="text-xs text-blue-800">{description}</p>
      </div>
    </div>
  );
}
