'use client';

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Filter, RefreshCw, ShieldAlert, Clock, AlertTriangle, Info } from 'lucide-react';

import { MetricCard } from '@/components/charts/ProfessionalChart';
import { EmptyAlertsState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import {
  TimeRangeSelector,
  DashboardSection,
  DashboardGrid,
} from '@/components/dashboard/ProfessionalDashboard';
import { AlertRulesManager } from '@/components/features/alert/AlertRulesManager';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { DEBOUNCE_CONFIG } from '@/config/constants';
import { getRefreshStrategy } from '@/config/refreshStrategy';
import {
  useIsMobile,
  useOracleIncidents,
  useOracleRisks,
  useOracleOpsMetrics,
  useDebounce,
  useAdminSession,
} from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n/LanguageProvider';
import { getUiErrorMessage, langToLocale } from '@/i18n/translations';
import { fetchApiData, getErrorCode, mergeOracleFilters, buildApiUrl } from '@/shared/utils';
import {
  formatSloTarget,
  formatSloValue,
  getInitialInstanceId,
  getSloEntries,
  rootCauseOptions,
  sloAlertTypes,
  sloLabels,
  sloStatusLabel,
} from '@/shared/utils/alertsUtils';
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Incident,
  OpsMetrics,
  OracleInstance,
} from '@/types/oracleTypes';

import {
  AlertCard,
  IncidentCard,
  OpsMetricsCard,
  type IncidentDraft,
  type IncidentWithAlerts,
  type OpsSeriesPoint,
} from './AlertsComponents';

import type { Route } from 'next';

export default function AlertsPageClient() {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? '';
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || '';
  const isMobile = useIsMobile();

  const {
    adminToken,
    setAdminToken,
    adminActor,
    setAdminActor,
    headers: adminHeaders,
    canAdmin,
  } = useAdminSession({ actor: true });
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'All'>('All');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'All'>('All');
  const [filterType, setFilterType] = useState<string | 'All'>('All');
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  // 使用 useDeferredValue 优化输入响应性，保持 UI 流畅
  const deferredQuery = useDeferredValue(query);
  // 使用防抖处理搜索输入，减少不必要的 API 请求
  const debouncedQuery = useDebounce(deferredQuery, DEBOUNCE_CONFIG.SEARCH_DELAY);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [instanceId, setInstanceId] = useState<string>(getInitialInstanceId);
  const [instances, setInstances] = useState<OracleInstance[] | null>(null);
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const { incidents, incidentsError, incidentsLoading, reloadIncidents } =
    useOracleIncidents(instanceId);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(null);
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft | null>(null);
  const { risks, risksError, risksLoading, reloadRisks } = useOracleRisks(instanceId);
  const { opsMetrics, opsMetricsSeries, opsMetricsError, opsMetricsLoading, reloadOpsMetrics } =
    useOracleOpsMetrics(instanceId);
  const [sloIncidentCreating, setSloIncidentCreating] = useState(false);
  const [sloIncidentError, setSloIncidentError] = useState<string | null>(null);

  const rulesById = useMemo(() => {
    const map = new Map<string, AlertRule>();
    for (const r of rules ?? []) map.set(r.id, r);
    return map;
  }, [rules]);

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceId(instanceIdFromUrl);
  }, [instanceIdFromUrl, instanceId]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set('instanceId', normalized);
    else params.delete('instanceId');
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch ? `${pathname}?${currentSearch}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl as Route, { scroll: false });
  }, [instanceId, pathname, router, currentSearch]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetchApiData<{ instances: OracleInstance[] }>('/api/oracle/instances', {
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setInstances(r.instances);
      })
      .catch(() => {
        if (!cancelled) setInstances(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    mergeOracleFilters({ instanceId });
  }, [instanceId]);

  const loadRules = useCallback(async () => {
    if (!canAdmin) {
      setRules(null);
      setRulesError(null);
      return;
    }
    setRulesError(null);
    try {
      const data = await fetchApiData<{ rules: AlertRule[] }>('/api/oracle/alert-rules', {
        headers: adminHeaders,
      });
      setRules(data.rules ?? []);
    } catch (error: unknown) {
      setRulesError(getErrorCode(error));
    }
  }, [adminHeaders, canAdmin]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const attachInstanceId = useCallback(
    (path: string) => {
      if (!instanceId) return path;
      if (!path.startsWith('/oracle') && !path.startsWith('/disputes')) return path;
      const normalized = instanceId.trim();
      if (!normalized) return path;
      const url = new URL(path, 'http://oracle-monitor.local');
      url.searchParams.set('instanceId', normalized);
      return `${url.pathname}${url.search}${url.hash}`;
    },
    [instanceId],
  );

  const fetchAlerts = useCallback(
    async (cursor: number | null, signal?: AbortSignal) => {
      setError(null);
      const url = buildApiUrl('/api/oracle/alerts', {
        instanceId: instanceId || undefined,
        status: filterStatus !== 'All' ? filterStatus : undefined,
        severity: filterSeverity !== 'All' ? filterSeverity : undefined,
        type: filterType !== 'All' ? filterType : undefined,
        q: debouncedQuery.trim() || undefined,
        limit: 30,
        cursor: cursor !== null ? String(cursor) : undefined,
      });
      return await fetchApiData<{
        items: Alert[];
        total: number;
        nextCursor: number | null;
      }>(url, { signal });
    },
    [filterSeverity, filterStatus, filterType, instanceId, debouncedQuery],
  );

  const focusOpenCritical = useCallback(() => {
    setFilterStatus('Open');
    setFilterSeverity('critical');
    setFilterType('All');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const focusOpenAlerts = useCallback(() => {
    setFilterStatus('Open');
    setFilterSeverity('All');
    setFilterType('All');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToIncidents = useCallback(() => {
    const el = document.getElementById('incidents-panel');
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToSlo = useCallback(() => {
    const el = document.getElementById('slo-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 并行执行所有请求，提高性能
      const [alertsData] = await Promise.all([
        fetchAlerts(null),
        reloadIncidents(),
        reloadRisks(),
        reloadOpsMetrics(),
      ]);
      setItems(alertsData.items ?? []);
      setNextCursor(alertsData.nextCursor ?? null);
    } catch (error: unknown) {
      setError(getErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, reloadIncidents, reloadOpsMetrics, reloadRisks]);

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '告警管理',
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="搜索"]',
    showRefreshToast: true,
  });

  const createIncidentFromAlert = useCallback(
    async (a: Alert, rule?: AlertRule) => {
      if (!canAdmin) return;
      await fetchApiData<{ ok: true; incident: Incident }>('/api/oracle/incidents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          title: a.title,
          severity: a.severity,
          summary: a.message,
          runbook: rule?.runbook ?? null,
          owner: rule?.owner ?? null,
          alertIds: [a.id],
          entityType: a.entityType,
          entityId: a.entityId,
        }),
      });
      await reloadIncidents();
    },
    [canAdmin, adminHeaders, reloadIncidents],
  );

  const collectSloAlertIds = useCallback(
    async (slo: NonNullable<OpsMetrics['slo']>) => {
      const keys = new Set(slo.breaches.map((b) => b.key));
      const ids = new Set<number>();
      const lagTypes = ['sync_backlog', 'sync_error', 'backlog_assertions', 'backlog_disputes'];
      const stalenessTypes = ['stale_sync', 'sync_error', 'contract_paused', 'market_stale'];
      const performanceTypes = ['slow_api_request', 'high_error_rate', 'database_slow_query'];

      const fetchIds = async (params: {
        status?: AlertStatus | 'All';
        severity?: AlertSeverity | 'All';
        type?: string | 'All';
      }) => {
        const url = buildApiUrl('/api/oracle/alerts', {
          instanceId: instanceId || undefined,
          status: params.status && params.status !== 'All' ? params.status : undefined,
          severity: params.severity && params.severity !== 'All' ? params.severity : undefined,
          type: params.type && params.type !== 'All' ? params.type : undefined,
          limit: 50,
        });
        const data = await fetchApiData<{ items: Alert[] }>(url);
        for (const item of data.items ?? []) {
          if (Number.isFinite(item.id)) ids.add(item.id);
        }
      };

      if (keys.has('lagBlocks')) {
        for (const type of lagTypes) {
          await fetchIds({ status: 'Open', type });
        }
      }
      if (keys.has('syncStalenessMinutes')) {
        for (const type of stalenessTypes) {
          await fetchIds({ status: 'Open', type });
        }
      }
      if (keys.has('openAlerts')) {
        await fetchIds({ status: 'Open' });
      }
      if (keys.has('openCriticalAlerts')) {
        await fetchIds({ status: 'Open', severity: 'critical' });
      }
      if (keys.has('alertMttaMinutes')) {
        await fetchIds({ status: 'Acknowledged' });
        await fetchIds({ status: 'Open' });
        for (const type of performanceTypes) {
          await fetchIds({ status: 'Open', type });
        }
      }
      if (keys.has('alertMttrMinutes')) {
        await fetchIds({ status: 'Resolved' });
        await fetchIds({ status: 'Open' });
        for (const type of performanceTypes) {
          await fetchIds({ status: 'Open', type });
        }
      }
      if (keys.has('incidentMttrMinutes')) {
        for (const incident of incidents) {
          for (const id of incident.alertIds ?? []) {
            if (Number.isFinite(id)) ids.add(id);
          }
        }
      }

      return Array.from(ids);
    },
    [incidents, instanceId],
  );

  const createIncidentFromSlo = useCallback(async () => {
    if (!canAdmin) return;
    const slo = opsMetrics?.slo ?? null;
    if (!slo || slo.status === 'met') return;
    setSloIncidentError(null);
    setSloIncidentCreating(true);
    try {
      const severity: AlertSeverity = slo.status === 'breached' ? 'critical' : 'warning';
      const title = `SLO ${sloStatusLabel(slo.status)}`;
      const breachText =
        slo.breaches.length > 0
          ? slo.breaches
              .map(
                (b) =>
                  `${sloLabels[b.key] ?? b.key}: ${formatSloValue(
                    b.key,
                    b.actual,
                  )} > ${formatSloTarget(b.key, b.target)}`,
              )
              .join('; ')
          : 'Missing SLO data';
      const summary = `Instance ${instanceId || 'default'}; ${breachText}`;
      const alertIds = await collectSloAlertIds(slo);
      await fetchApiData<{ ok: true; incident: Incident }>('/api/oracle/incidents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({
          title,
          severity,
          summary,
          entityType: 'slo',
          entityId: instanceId || 'default',
          alertIds: alertIds.length > 0 ? alertIds : undefined,
        }),
      });
      await reloadIncidents();
      scrollToIncidents();
    } catch (error: unknown) {
      setSloIncidentError(getErrorCode(error));
    } finally {
      setSloIncidentCreating(false);
    }
  }, [
    adminHeaders,
    canAdmin,
    collectSloAlertIds,
    instanceId,
    opsMetrics,
    reloadIncidents,
    scrollToIncidents,
  ]);

  const patchIncidentStatus = useCallback(
    async (id: number, status: Incident['status']) => {
      if (!canAdmin) return;
      await fetchApiData<{ ok: true; incident: Incident }>(`/api/oracle/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ status }),
      });
      await reloadIncidents();
    },
    [canAdmin, adminHeaders, reloadIncidents],
  );

  const incidentAction = useCallback(
    async (id: number, action: 'ack_alerts' | 'resolve_alerts') => {
      if (!canAdmin) return;
      await fetchApiData<{ ok: true; incident: Incident }>(`/api/oracle/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ action }),
      });
      await refresh();
    },
    [canAdmin, adminHeaders, refresh],
  );

  const startEditIncident = useCallback(
    (i: IncidentWithAlerts) => {
      if (!canAdmin) return;
      setEditingIncidentId(i.id);
      setIncidentDraft({
        title: i.title ?? '',
        severity: i.severity,
        owner: i.owner ?? '',
        rootCause: i.rootCause ?? '',
        runbook: i.runbook ?? '',
        entityType: i.entityType ?? '',
        entityId: i.entityId ?? '',
        summary: i.summary ?? '',
      });
    },
    [canAdmin],
  );

  const cancelEditIncident = useCallback(() => {
    setEditingIncidentId(null);
    setIncidentDraft(null);
  }, []);

  const saveIncidentEdit = useCallback(async () => {
    if (!canAdmin) return;
    if (!incidentDraft) return;
    if (editingIncidentId === null) return;

    const patch = {
      title: incidentDraft.title.trim(),
      severity: incidentDraft.severity,
      owner: incidentDraft.owner.trim() ? incidentDraft.owner.trim() : null,
      rootCause: incidentDraft.rootCause.trim() ? incidentDraft.rootCause.trim() : null,
      runbook: incidentDraft.runbook.trim() ? incidentDraft.runbook.trim() : null,
      entityType: incidentDraft.entityType.trim() ? incidentDraft.entityType.trim() : null,
      entityId: incidentDraft.entityId.trim() ? incidentDraft.entityId.trim() : null,
      summary: incidentDraft.summary.trim() ? incidentDraft.summary : null,
    };

    await fetchApiData<{ ok: true; incident: Incident }>(
      `/api/oracle/incidents/${editingIncidentId}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify(patch),
      },
    );
    cancelEditIncident();
    await reloadIncidents();
  }, [
    canAdmin,
    incidentDraft,
    editingIncidentId,
    adminHeaders,
    cancelEditIncident,
    reloadIncidents,
  ]);

  const applyQuery = useCallback((value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const resetFilters = useCallback(() => {
    setFilterStatus('All');
    setFilterSeverity('All');
    setFilterType('All');
    setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const alertTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rules ?? []) {
      if (r.event) set.add(r.event);
    }
    for (const a of items ?? []) {
      if (a.type) set.add(a.type);
    }
    return Array.from(set).sort();
  }, [items, rules]);

  const handleSloBreachClick = useCallback(
    (key: string) => {
      if (key === 'openCriticalAlerts') {
        focusOpenCritical();
        return;
      }
      if (key === 'openAlerts') {
        focusOpenAlerts();
        return;
      }
      if (key === 'incidentMttrMinutes') {
        scrollToIncidents();
        return;
      }
      if (key === 'alertMttaMinutes' || key === 'alertMttrMinutes') {
        focusOpenAlerts();
        return;
      }
      if (key === 'lagBlocks') {
        setFilterType('sync_backlog');
        setFilterStatus('Open');
        setFilterSeverity('All');
        setQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (key === 'syncStalenessMinutes') {
        setFilterType('stale_sync');
        setFilterStatus('Open');
        setFilterSeverity('All');
        setQuery('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setFilterType('All');
      applyQuery(key);
    },
    [applyQuery, focusOpenAlerts, focusOpenCritical, scrollToIncidents],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAlerts(null, controller.signal);
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
      } catch (error: unknown) {
        if (!cancelled) setError(getErrorCode(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timeout = window.setTimeout(run, 200);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [fetchAlerts]);

  const loadMore = useCallback(async () => {
    if (nextCursor === null) return;
    try {
      const data = await fetchAlerts(nextCursor);
      setItems((prev) => prev.concat(data.items ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (error: unknown) {
      setError(getErrorCode(error));
    }
  }, [nextCursor, fetchAlerts]);

  const updateAlert = useCallback(
    async (alertId: number, status: AlertStatus) => {
      await fetchApiData<Alert>(`/api/oracle/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ status }),
      });
      await refresh();
    },
    [adminHeaders, refresh],
  );

  const setRuleSilenceMinutes = useCallback(
    async (ruleId: string, minutes: number | null) => {
      if (!canAdmin) return;
      if (!rules) return;
      if (
        minutes !== null &&
        (!Number.isFinite(minutes) ||
          !Number.isInteger(minutes) ||
          minutes <= 0 ||
          minutes > 60 * 24 * 30)
      ) {
        return;
      }
      setRulesSaving(true);
      try {
        const silencedUntil = minutes
          ? new Date(Date.now() + minutes * 60_000).toISOString()
          : null;
        const nextRules = rules.map((r) => (r.id === ruleId ? { ...r, silencedUntil } : r));
        const data = await fetchApiData<{ rules: AlertRule[] }>('/api/oracle/alert-rules', {
          method: 'PUT',
          headers: { 'content-type': 'application/json', ...adminHeaders },
          body: JSON.stringify({ rules: nextRules }),
        });
        setRules(data.rules ?? nextRules);
      } catch (error: unknown) {
        setError(getErrorCode(error));
      } finally {
        setRulesSaving(false);
      }
    },
    [canAdmin, rules, adminHeaders],
  );

  const slo = opsMetrics?.slo ?? null;
  const sloEntries = getSloEntries();
  const opsSeriesChartData = useMemo<OpsSeriesPoint[]>(() => {
    if (!opsMetricsSeries || opsMetricsSeries.length === 0) return [];
    return opsMetricsSeries.map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [locale, opsMetricsSeries]);
  const hasOpsSeries = opsSeriesChartData.length >= 2;

  // 获取刷新策略配置
  const alertsStrategy = getRefreshStrategy('alerts-list');

  // 计算最后更新时间（基于 loading 状态变化）
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading]);

  // 计算告警统计
  const alertStats = useMemo(() => {
    const critical = items.filter((a) => a.severity === 'critical').length;
    const warning = items.filter((a) => a.severity === 'warning').length;
    const info = items.filter((a) => a.severity === 'info').length;
    const open = items.filter((a) => a.status === 'Open').length;
    return { critical, warning, info, open, total: items.length };
  }, [items]);

  return (
    <div className="space-y-4 pb-16 sm:space-y-6">
      <PageHeader
        title={t('alerts.title')}
        description={isMobile ? undefined : t('alerts.description')}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 时间范围选择器 */}
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          {/* 刷新状态指示器 */}
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            strategy={alertsStrategy}
            onRefresh={refresh}
          />
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="text-primary-darker ring-primary100 flex items-center gap-1.5 rounded-xl bg-white/60 px-3 py-2 text-sm font-semibold shadow-sm ring-1 hover:bg-white disabled:opacity-50 sm:gap-2 sm:px-4"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('alerts.refresh')}</span>
          </button>
        </div>
      </PageHeader>

      {/* 关键指标卡片 */}
      <DashboardSection title="Alert Overview" description="Real-time alert statistics">
        <DashboardGrid columns={4}>
          <MetricCard
            title="Critical"
            value={alertStats.critical}
            status={alertStats.critical > 0 ? 'critical' : 'healthy'}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <MetricCard
            title="Warning"
            value={alertStats.warning}
            status={alertStats.warning > 0 ? 'warning' : 'healthy'}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <MetricCard
            title="Info"
            value={alertStats.info}
            status="healthy"
            icon={<Info className="h-5 w-5" />}
          />
          <MetricCard
            title="Open"
            value={alertStats.open}
            status={alertStats.open > 5 ? 'warning' : 'healthy'}
            icon={<Clock className="h-5 w-5" />}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* 错误提示 - 使用统一的 ErrorBanner */}
      {error && (
        <ErrorBanner
          error={new Error(getUiErrorMessage(error, t))}
          onRetry={refresh}
          title="Failed to load alerts"
          isRetrying={loading}
        />
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <Card className="border-primary/10 bg-white/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center justify-between">
                <div className="text-primary-dark/70 flex items-center gap-2 text-sm">
                  <ShieldAlert size={16} />
                  <span>{t('alerts.title')}</span>
                </div>
                {/* 移动端筛选按钮 */}
                {isMobile && (
                  <button
                    type="button"
                    className="text-primary-dark ring-primary100 flex h-8 items-center gap-1 rounded-lg bg-white/50 px-2 text-xs font-medium shadow-sm ring-1"
                    onClick={() => {
                      const filters = document.getElementById('mobile-alert-filters');
                      if (filters) {
                        filters.classList.toggle('hidden');
                      }
                    }}
                  >
                    <Filter size={14} />
                    {t('alerts.filter')}
                  </button>
                )}
              </div>
              <div
                id="mobile-alert-filters"
                className={`flex flex-col gap-2 sm:flex-row sm:items-center ${isMobile ? 'hidden' : ''}`}
              >
                <select
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="focus:ring-primary500/20 h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm focus:ring-2"
                >
                  {(() => {
                    const list = (instances ?? []).filter((i) => i.enabled || i.id === instanceId);
                    if (list.length === 0) {
                      return <option value={instanceId}>{instanceId || 'default'}</option>;
                    }
                    return list.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.id})
                      </option>
                    ));
                  })()}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'All')}
                  className="focus:ring-primary500/20 h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm focus:ring-2"
                >
                  <option value="All">{t('common.all')}</option>
                  <option value="Open">Open</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'All')}
                  className="focus:ring-primary500/20 h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm focus:ring-2"
                >
                  <option value="All">{t('common.all')}</option>
                  <option value="critical">critical</option>
                  <option value="warning">warning</option>
                  <option value="info">info</option>
                </select>

                {!isMobile && (
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="focus:ring-primary500/20 h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm focus:ring-2"
                  >
                    <option value="All">{t('common.all')}</option>
                    {filterType !== 'All' && !alertTypeOptions.includes(filterType) ? (
                      <option value={filterType}>{filterType}</option>
                    ) : null}
                    {alertTypeOptions.map((event) => (
                      <option key={event} value={event}>
                        {event}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('alerts.searchPlaceholder')}
                  className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2 sm:w-48 lg:w-64"
                />
                {filterStatus !== 'All' ||
                filterSeverity !== 'All' ||
                filterType !== 'All' ||
                query.trim() ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-primary-dark ring-primary100 h-9 rounded-lg bg-white/50 px-3 text-sm font-semibold shadow-sm ring-1 hover:bg-white"
                  >
                    {t('audit.clear')}
                  </button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="text-primary-dark/70 rounded-2xl border border-primary/10 bg-white/50 p-6 text-sm shadow-sm">
                {t('common.loading')}
              </div>
            )}

            {!loading && items.length === 0 && (
              <EmptyAlertsState
                onSetAlertRules={() => {
                  // Scroll to alert rules section
                  const rulesSection = document.getElementById('alert-rules-panel');
                  if (rulesSection) {
                    rulesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />
            )}

            {!loading &&
              items.map((alert) => {
                const ruleId = alert.fingerprint.split(':')[0] ?? '';
                const rule = rulesById.get(ruleId);
                const silencedUntilRaw = (rule?.silencedUntil ?? '').trim();
                const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
                const isSilenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > Date.now();
                const isSloRelated = sloAlertTypes.some((t) => t.value === alert.type);
                return (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    rule={rule}
                    isSilenced={isSilenced}
                    silencedUntilMs={silencedUntilMs}
                    locale={locale}
                    canAdmin={canAdmin}
                    rulesSaving={rulesSaving}
                    isSloRelated={isSloRelated}
                    t={t}
                    onScrollToSlo={scrollToSlo}
                    onCreateIncident={() => createIncidentFromAlert(alert, rule)}
                    onUpdateAlert={updateAlert}
                    onSetRuleSilenceMinutes={setRuleSilenceMinutes}
                    attachInstanceId={attachInstanceId}
                  />
                );
              })}

            {!loading && nextCursor !== null && (
              <button
                type="button"
                onClick={loadMore}
                className="text-primary-darker ring-primary100 w-full rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold shadow-sm ring-1 hover:bg-white"
              >
                {t('common.loadMore')}
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="text-sm font-semibold text-[var(--foreground)]">
              {t('alerts.rules')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <OpsMetricsCard
              opsMetrics={opsMetrics}
              opsMetricsError={opsMetricsError}
              opsMetricsLoading={opsMetricsLoading}
              locale={locale}
              t={t}
              hasOpsSeries={hasOpsSeries}
              opsSeriesChartData={opsSeriesChartData}
              slo={slo}
              sloEntries={sloEntries}
              onHandleSloBreachClick={handleSloBreachClick}
              onCreateIncidentFromSlo={createIncidentFromSlo}
              sloIncidentError={sloIncidentError}
              sloIncidentCreating={sloIncidentCreating}
              canAdmin={canAdmin}
              onFocusOpenCritical={focusOpenCritical}
              onFocusOpenAlerts={focusOpenAlerts}
              onScrollToIncidents={scrollToIncidents}
            />

            <div
              id="incidents-panel"
              className="rounded-xl border border-primary/10 bg-white/50 p-3"
            >
              <div className="text-sm font-semibold text-[var(--foreground)]">Incidents</div>
              {incidentsError ? (
                <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {getUiErrorMessage(incidentsError, t)}
                </div>
              ) : null}
              {incidentsLoading ? (
                <div className="text-primary-dark/70 mt-2 text-xs">{t('common.loading')}</div>
              ) : incidents.length === 0 ? (
                <div className="text-primary-dark/70 mt-2 text-xs">{t('common.noData')}</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {incidents.map((incident) => {
                    const incidentQuery =
                      incident.entityId?.trim() ||
                      (incident.alerts ?? [])
                        .map((alert: Alert) => alert.entityId ?? '')
                        .find((x: string) => x.trim()) ||
                      '';
                    const isSloIncident =
                      incident.entityType === 'slo' ||
                      (incident.alerts ?? []).some((alert: Alert) =>
                        sloAlertTypes.some((t) => t.value === alert.type),
                      );
                    return (
                      <IncidentCard
                        key={incident.id}
                        incident={incident}
                        isSloIncident={isSloIncident}
                        incidentQuery={incidentQuery}
                        canAdmin={canAdmin}
                        editingIncidentId={editingIncidentId}
                        incidentDraft={incidentDraft}
                        setIncidentDraft={setIncidentDraft}
                        rootCauseOptions={rootCauseOptions}
                        locale={locale}
                        onStartEditIncident={startEditIncident}
                        onCancelEditIncident={cancelEditIncident}
                        onSaveIncidentEdit={saveIncidentEdit}
                        onPatchIncidentStatus={patchIncidentStatus}
                        onIncidentAction={incidentAction}
                        onApplyQuery={applyQuery}
                        onScrollToSlo={scrollToSlo}
                        attachInstanceId={attachInstanceId}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-primary/10 bg-white/50 p-3">
              <div className="text-sm font-semibold text-[var(--foreground)]">
                {t('oracle.alerts.topRisks')}
              </div>
              {risksError ? (
                <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {getUiErrorMessage(risksError, t)}
                </div>
              ) : null}
              {risksLoading ? (
                <div className="text-primary-dark/70 mt-2 text-xs">{t('common.loading')}</div>
              ) : risks.length === 0 ? (
                <div className="text-primary-dark/70 mt-2 text-xs">{t('common.noData')}</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {risks.map((r, idx) => {
                    const alertsQuery = (r.assertionId?.trim() ? r.assertionId : r.entityId).trim();
                    const assertionHrefRaw = r.assertionId?.trim()
                      ? (`/oracle/${r.assertionId}` as Route)
                      : r.entityType === 'assertion'
                        ? (`/oracle/${r.entityId}` as Route)
                        : null;
                    const assertionHref = assertionHrefRaw
                      ? (attachInstanceId(assertionHrefRaw) as Route)
                      : null;
                    const disputeHrefRaw = r.disputeId?.trim()
                      ? (`/disputes?q=${encodeURIComponent(r.disputeId)}` as Route)
                      : null;
                    const disputeHref = disputeHrefRaw
                      ? (attachInstanceId(disputeHrefRaw) as Route)
                      : null;
                    const reasons = (r.reasons ?? []).filter(Boolean);
                    return (
                      <div
                        key={`${r.entityType}:${r.entityId}:${idx}`}
                        className="rounded-xl border border-primary/10 bg-white/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {r.severity}
                              </span>
                              <span className="rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                {Math.round(r.score)}
                              </span>
                              <span className="rounded-full border bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                {r.chain}
                              </span>
                              <span className="truncate text-sm font-semibold text-[var(--foreground)]">
                                {r.market}
                              </span>
                            </div>
                            {reasons.length ? (
                              <div className="text-primary-darker/80 mt-2 space-y-1 text-xs">
                                {reasons.map((reason, i) => (
                                  <div key={`${idx}:${i}`} className="leading-snug">
                                    {reason}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {alertsQuery ? (
                              <button
                                type="button"
                                onClick={() => applyQuery(alertsQuery)}
                                className="text-primary-dark ring-primary100 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ring-1 hover:bg-primary/5"
                              >
                                Alerts
                              </button>
                            ) : null}
                            {assertionHref ? (
                              <Link
                                href={assertionHref}
                                className="text-primary-dark ring-primary100 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ring-1 hover:bg-primary/5"
                              >
                                Assertion
                              </Link>
                            ) : null}
                            {disputeHref ? (
                              <Link
                                href={disputeHref}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50"
                              >
                                Dispute
                              </Link>
                            ) : (
                              <Link
                                href={attachInstanceId('/disputes') as Route}
                                className="text-primary-dark ring-primary100 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ring-1 hover:bg-primary/5"
                              >
                                Disputes
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {rulesError ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-700">
                {getUiErrorMessage(rulesError, t)}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="alerts-admin-token" className="text-xs font-semibold text-gray-500">
                {t('alerts.adminToken')}
              </label>
              <input
                id="alerts-admin-token"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder={t('alerts.adminTokenHint')}
                type="password"
                autoComplete="off"
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2"
              />
              {!canAdmin && (
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700">
                  {t('alerts.adminTokenWarning')}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="alerts-admin-actor" className="text-xs font-semibold text-gray-500">
                {t('alerts.adminActor')}
              </label>
              <input
                id="alerts-admin-actor"
                value={adminActor}
                onChange={(e) => setAdminActor(e.target.value)}
                placeholder={t('alerts.adminActorPlaceholder')}
                className="focus:ring-primary500/20 h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-[var(--foreground)] shadow-sm placeholder:text-primary/30 focus:ring-2"
              />
            </div>
            <div id="alert-rules-panel">
              <AlertRulesManager
                showTitle={false}
                showAdminTokenInput={false}
                showAdminActorInput={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
