import type { UnifiedAlert, AlertSeverity, AlertStatus } from '../types';

export type SortMode = 'time' | 'smart' | 'severity';

export interface AlertScore {
  total: number;
  severityScore: number;
  freshnessScore: number;
  statusScore: number;
}

const SEVERITY_SCORES: Record<AlertSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  warning: 40,
  info: 10,
};

const STATUS_SCORES: Record<AlertStatus, number> = {
  active: 20,
  investigating: 10,
  resolved: 0,
};

export function calculateFreshnessScore(timestamp: string): number {
  const alertTime = new Date(timestamp).getTime();
  const now = Date.now();
  const hoursDiff = (now - alertTime) / (1000 * 60 * 60);
  
  if (hoursDiff <= 1) {
    return 50;
  }
  
  const score = 50 - Math.floor(hoursDiff - 1) * 5;
  return Math.max(0, score);
}

export function calculateAlertScore(alert: UnifiedAlert): AlertScore {
  const severityScore = SEVERITY_SCORES[alert.severity] || 25;
  const freshnessScore = calculateFreshnessScore(alert.timestamp);
  const statusScore = STATUS_SCORES[alert.status] || 0;
  
  return {
    total: severityScore + freshnessScore + statusScore,
    severityScore,
    freshnessScore,
    statusScore,
  };
}

export function sortAlertsByTime(alerts: UnifiedAlert[]): UnifiedAlert[] {
  return [...alerts].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
}

export function sortAlertsBySeverity(alerts: UnifiedAlert[]): UnifiedAlert[] {
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    warning: 4,
    info: 5,
  };
  
  return [...alerts].sort((a, b) => {
    const orderA = severityOrder[a.severity] ?? 6;
    const orderB = severityOrder[b.severity] ?? 6;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
}

export function sortAlertsBySmart(alerts: UnifiedAlert[]): UnifiedAlert[] {
  return [...alerts].sort((a, b) => {
    const scoreA = calculateAlertScore(a);
    const scoreB = calculateAlertScore(b);
    
    if (scoreA.total !== scoreB.total) {
      return scoreB.total - scoreA.total;
    }
    
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });
}

export function sortAlerts(alerts: UnifiedAlert[], mode: SortMode): UnifiedAlert[] {
  switch (mode) {
    case 'time':
      return sortAlertsByTime(alerts);
    case 'severity':
      return sortAlertsBySeverity(alerts);
    case 'smart':
      return sortAlertsBySmart(alerts);
    default:
      return alerts;
  }
}

export type GroupMode = 'none' | 'rule' | 'symbol';

export interface AlertGroup {
  key: string;
  label: string;
  count: number;
  alerts: UnifiedAlert[];
}

export function groupAlertsByRule(alerts: UnifiedAlert[]): AlertGroup[] {
  const groups = new Map<string, UnifiedAlert[]>();
  
  alerts.forEach((alert) => {
    const key = alert.source;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(alert);
  });
  
  const labels: Record<string, string> = {
    price_anomaly: 'Price Anomaly',
    cross_chain: 'Cross-Chain',
    security: 'Security',
  };
  
  return Array.from(groups.entries())
    .map(([key, groupAlerts]) => ({
      key,
      label: labels[key] || key,
      count: groupAlerts.length,
      alerts: groupAlerts,
    }))
    .sort((a, b) => b.count - a.count);
}

export function groupAlertsBySymbol(alerts: UnifiedAlert[]): AlertGroup[] {
  const groups = new Map<string, UnifiedAlert[]>();
  
  alerts.forEach((alert) => {
    const key = alert.symbol || 'Unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(alert);
  });
  
  return Array.from(groups.entries())
    .map(([key, groupAlerts]) => ({
      key,
      label: key,
      count: groupAlerts.length,
      alerts: groupAlerts,
    }))
    .sort((a, b) => b.count - a.count);
}

export function groupAlerts(alerts: UnifiedAlert[], mode: GroupMode): AlertGroup[] {
  switch (mode) {
    case 'rule':
      return groupAlertsByRule(alerts);
    case 'symbol':
      return groupAlertsBySymbol(alerts);
    case 'none':
    default:
      return [];
  }
}
