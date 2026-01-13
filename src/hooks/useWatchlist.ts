"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n/LanguageProvider";

const STORAGE_KEY = "insight_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
    if (
      typeof window === "undefined" ||
      !window.localStorage ||
      typeof window.localStorage.getItem !== "function"
    ) {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setWatchlist(JSON.parse(stored));
    } catch {
      setWatchlist([]);
    }
  }, []);

  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const isCurrentlyWatched = prev.includes(id);
      const next = isCurrentlyWatched
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      if (
        typeof window !== "undefined" &&
        window.localStorage &&
        typeof window.localStorage.setItem === "function"
      ) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }

      // Show toast notification
      if (isCurrentlyWatched) {
        toast({
          type: "success",
          title: t("common.removeFromWatchlist"),
          message: t("common.success"),
          duration: 2000,
        });
      } else {
        toast({
          type: "success",
          title: t("common.addToWatchlist"),
          message: t("common.success"),
          duration: 2000,
        });
      }

      return next;
    });
  };

  const isWatched = (id: string) => watchlist.includes(id);

  return { watchlist, toggleWatchlist, isWatched, mounted };
}
