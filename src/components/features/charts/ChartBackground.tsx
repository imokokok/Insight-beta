"use client";

import { cn } from "@/lib/utils";
import type { TabKey } from "./types";

function ChartBackground({ activeTab }: { activeTab: TabKey }) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "activity" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -left-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-br from-purple-200/30 via-indigo-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tl from-blue-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "tvs" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -right-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-bl from-pink-200/30 via-rose-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute left-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tr from-purple-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "sync" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -left-[10%] -bottom-[10%] h-[150%] w-[50%] bg-gradient-to-tr from-blue-200/30 via-cyan-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 top-0 h-[60%] w-[40%] bg-gradient-to-bl from-indigo-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "markets" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute right-[20%] -top-[10%] h-[120%] w-[60%] bg-gradient-to-b from-orange-200/30 via-amber-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute left-0 bottom-0 h-[50%] w-[40%] bg-gradient-to-tr from-red-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "accuracy" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute left-[20%] -top-[10%] h-[120%] w-[60%] bg-gradient-to-b from-green-200/30 via-emerald-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 bottom-0 h-[50%] w-[40%] bg-gradient-to-tr from-teal-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
    </>
  );
}

export { ChartBackground };
