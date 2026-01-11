"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "insight_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  const toggleWatchlist = (id: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isWatched = (id: string) => watchlist.includes(id);

  return { watchlist, toggleWatchlist, isWatched, mounted };
}
