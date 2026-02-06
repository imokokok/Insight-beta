'use client';

import React from 'react';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ComposedChart,
  Line,
  Bar,
} from 'recharts';

import { OracleHealthScore } from '@/components/features/oracle/OracleHealthScore';

import type {
  TabKey,
  Translator,
  ChartDataItem,
  MarketStat,
  SyncChartItem,
  AccuracyChartItem,
} from './types';

interface ChartsContentProps {
  activeTab: TabKey;
  t: Translator;
  chartData: ChartDataItem[];
  hasAssertionsData: boolean;
  marketsLoading: boolean;
  marketStats: MarketStat[];
  accuracyLoading: boolean;
  hasAccuracyData: boolean;
  healthScore: number;
  accuracyChartData: AccuracyChartItem[];
  syncLoading: boolean;
  hasSyncData: boolean;
  syncChartData: SyncChartItem[];
}

const COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#a855f7',
  '#6366f1',
  '#3b82f6',
  '#0ea5e9',
  '#10b981',
];

// ============================================================================
// 图表渲染器组件
// ============================================================================

type ChartRendererProps = ChartsContentProps;

// 活动图表
const ActivityChart: React.FC<ChartRendererProps> = ({ chartData, hasAssertionsData, t }) => {
  if (!hasAssertionsData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('oracle.charts.waitingData')}
      </div>
    );
  }

  return (
    <AreaChart data={chartData}>
      <defs>
        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" strokeOpacity={0.5} />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 12, fill: '#9ca3af' }}
        axisLine={false}
        tickLine={false}
        dy={10}
      />
      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} dx={-10} />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
        itemStyle={{ color: '#4b5563', fontSize: '12px' }}
        labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
      />
      <Area
        type="monotone"
        dataKey="count"
        stroke="#8b5cf6"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#colorCount)"
        animationDuration={1500}
      />
    </AreaChart>
  );
};

// TVS 图表
const TVSChart: React.FC<ChartRendererProps> = ({ chartData, hasAssertionsData, t }) => {
  if (!hasAssertionsData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('oracle.charts.waitingData')}
      </div>
    );
  }

  return (
    <AreaChart data={chartData}>
      <defs>
        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fce7f3" />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 12, fill: '#9ca3af' }}
        axisLine={false}
        tickLine={false}
        dy={10}
      />
      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} dx={-10} />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '12px',
        }}
        itemStyle={{ color: '#4b5563', fontSize: '12px', fontWeight: 500 }}
        labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}
        cursor={{ stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '4 4' }}
      />
      <Area
        type="monotone"
        dataKey="cumulativeVolume"
        stroke="#ec4899"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#colorVolume)"
        activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }}
        animationDuration={1500}
      />
    </AreaChart>
  );
};

// 市场图表
const MarketsChart: React.FC<ChartRendererProps> = ({ marketsLoading, marketStats, t }) => {
  if (marketsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (marketStats.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('oracle.charts.waitingData')}
      </div>
    );
  }

  return (
    <RechartsPieChart>
      <Pie
        data={marketStats}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={5}
        dataKey="count"
      >
        {marketStats.map((_entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip
        formatter={(value: unknown, _name: unknown, props: { payload?: MarketStat }) => {
          const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
          const market = props.payload?.market ?? '';
          return [`${numericValue} disputes`, market];
        }}
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
        itemStyle={{ color: '#4b5563', fontSize: '12px' }}
      />
      <Legend
        layout="vertical"
        align="right"
        verticalAlign="middle"
        wrapperStyle={{ fontSize: '12px', maxWidth: '40%' }}
      />
    </RechartsPieChart>
  );
};

// 准确度图表
const AccuracyChart: React.FC<ChartRendererProps> = ({
  accuracyLoading,
  hasAccuracyData,
  healthScore,
  accuracyChartData,
  t,
}) => {
  if (accuracyLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!hasAccuracyData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('oracle.charts.waitingData')}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="absolute right-0 top-0 z-20">
        <OracleHealthScore score={healthScore} isLoading={accuracyLoading} />
      </div>
      <div className="h-full w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={accuracyChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcfce7" />
            <XAxis
              dataKey="label"
              scale="point"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar
              yAxisId="right"
              dataKey="deviationPct"
              name={t('oracle.charts.deviationPercent')}
              barSize={20}
              fill="#f87171"
              opacity={0.5}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="oraclePrice"
              name={t('oracle.charts.oraclePrice')}
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="referencePrice"
              name={t('oracle.charts.referencePrice')}
              stroke="#6b7280"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 同步图表
const SyncChart: React.FC<ChartRendererProps> = ({
  syncLoading,
  hasSyncData,
  syncChartData,
  t,
}) => {
  if (syncLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!hasSyncData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        {t('oracle.charts.waitingData')}
      </div>
    );
  }

  return (
    <AreaChart data={syncChartData}>
      <defs>
        <linearGradient id="colorLagBlocks" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" strokeOpacity={0.6} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 12, fill: '#9ca3af' }}
        axisLine={false}
        tickLine={false}
        dy={10}
      />
      <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} dx={-10} />
      <Tooltip
        contentStyle={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
        formatter={(value: unknown, name: unknown) => {
          const node = typeof value === 'number' ? value : String(value);
          if (name === 'lagBlocks') return [node, t('oracle.charts.syncLagBlocks')];
          return [node, String(name)];
        }}
      />
      <Area
        type="monotone"
        dataKey="lagBlocks"
        stroke="#3b82f6"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#colorLagBlocks)"
        animationDuration={1500}
      />
    </AreaChart>
  );
};

// ============================================================================
// 策略映射
// ============================================================================

const chartRenderers: Record<TabKey, React.FC<ChartRendererProps>> = {
  activity: ActivityChart,
  tvs: TVSChart,
  markets: MarketsChart,
  accuracy: AccuracyChart,
  sync: SyncChart,
};

// ============================================================================
// 主组件
// ============================================================================

function ChartsContent(props: ChartsContentProps) {
  const { activeTab } = props;
  const ChartComponent = chartRenderers[activeTab];

  return (
    <div className="relative z-10 h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent {...props} />
      </ResponsiveContainer>
    </div>
  );
}

export { ChartsContent };
