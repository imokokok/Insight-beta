"use client";

import React, { useEffect, useState } from "react";

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  inp: number | null;
}

interface Props {
  children: React.ReactNode;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

interface MetricHandler {
  (metric: {
    name: string;
    value: number;
    delta: number;
    id: string;
    rating: string | null;
  }): void;
}

export function PerformanceMonitor({
  children,
  onMetrics,
}: Props): React.ReactElement {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    inp: null,
  });

  const [isSupported, setIsSupported] = useState(true);

  const sendToAnalytics = (metric: {
    name: string;
    value: number;
    delta: number;
    id: string;
    rating: string | null;
  }) => {
    if (process.env.NODE_ENV === "production") {
      try {
        const endpoint = "/api/ops-metrics";
        const body = JSON.stringify({
          type: "web-vitals",
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
          id: metric.id,
          timestamp: Date.now(),
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, body);
        } else {
          fetch(endpoint, {
            method: "POST",
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        console.warn("Failed to send performance metric");
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initWebVitals = async () => {
      try {
        const webVitals = await import("web-vitals");
        const { onFCP, onLCP, onFID, onCLS, onINP, onTTFB } = webVitals;

        const handleFCP: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, fcp: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, fcp: metric.value });
        };

        const handleLCP: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, lcp: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, lcp: metric.value });
        };

        const handleFID: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, fid: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, fid: metric.value });
        };

        const handleCLS: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, cls: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, cls: metric.value });
        };

        const handleINP: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, inp: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, inp: metric.value });
        };

        const handleTTFB: MetricHandler = (metric) => {
          setMetrics((prev) => ({ ...prev, ttfb: metric.value }));
          sendToAnalytics(metric);
          onMetrics?.({ ...metrics, ttfb: metric.value });
        };

        onFCP(handleFCP);
        onLCP(handleLCP);
        onFID(handleFID);
        onCLS(handleCLS);
        onINP(handleINP);
        onTTFB(handleTTFB);
      } catch {
        setIsSupported(false);
      }
    };

    initWebVitals();
  }, [onMetrics, metrics]);

  if (!isSupported) {
    return <>{children}</>;
  }

  return (
    <div className="performance-monitor" data-metrics={JSON.stringify(metrics)}>
      {children}
    </div>
  );
}

export function getPerformanceRating(
  metricName: string,
  value: number,
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    fcp: [1800, 3000],
    lcp: [2500, 4000],
    fid: [100, 300],
    cls: [0.1, 0.25],
    inp: [200, 500],
    ttfb: [800, 1800],
  };

  const [good, poor] = thresholds[metricName] || [100, 300];

  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export function formatMetricValue(
  value: number | null,
  unit: string = "ms",
): string {
  if (value === null) return "N/A";
  return `${value.toFixed(2)}${unit}`;
}

export function getOverallRating(
  metrics: PerformanceMetrics,
): "good" | "needs-improvement" | "poor" {
  const ratings = [
    metrics.fcp ? getPerformanceRating("fcp", metrics.fcp) : "good",
    metrics.lcp ? getPerformanceRating("lcp", metrics.lcp) : "good",
    metrics.fid ? getPerformanceRating("fid", metrics.fid) : "good",
    metrics.cls ? getPerformanceRating("cls", metrics.cls) : "good",
    metrics.inp ? getPerformanceRating("inp", metrics.inp) : "good",
    metrics.ttfb ? getPerformanceRating("ttfb", metrics.ttfb) : "good",
  ];

  if (ratings.includes("poor")) return "poor";
  if (ratings.includes("needs-improvement")) return "needs-improvement";
  return "good";
}

export default PerformanceMonitor;
