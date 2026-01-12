"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "insight_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

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
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      if (
        typeof window !== "undefined" &&
        window.localStorage &&
        typeof window.localStorage.setItem === "function"
      ) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const isWatched = (id: string) => watchlist.includes(id);

  return { watchlist, toggleWatchlist, isWatched, mounted };
}
