'use client';

import { cn } from '@/lib/utils';
import { Activity, PieChart, Clock, BarChart3, Target } from 'lucide-react';
import type { TabKey, Translator } from './types';

interface ChartsHeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  t: Translator;
}

function ChartsHeader({ activeTab, onTabChange, t }: ChartsHeaderProps) {
  return (
    <div className="relative z-10 mb-8 flex flex-col items-center justify-between gap-6 sm:flex-row">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'rounded-xl p-3 shadow-inner ring-1 backdrop-blur-md transition-colors duration-500',
            activeTab === 'activity'
              ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 ring-purple-500/20'
              : activeTab === 'tvs'
                ? 'bg-gradient-to-br from-pink-500/10 to-rose-500/10 text-pink-600 ring-pink-500/20'
                : activeTab === 'sync'
                  ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600 ring-blue-500/20'
                  : activeTab === 'markets'
                    ? 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-orange-600 ring-orange-500/20'
                    : 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 ring-green-500/20',
          )}
        >
          {activeTab === 'activity' ? (
            <Activity className="h-6 w-6" />
          ) : activeTab === 'tvs' ? (
            <PieChart className="h-6 w-6" />
          ) : activeTab === 'sync' ? (
            <Clock className="h-6 w-6" />
          ) : activeTab === 'markets' ? (
            <BarChart3 className="h-6 w-6" />
          ) : (
            <Target className="h-6 w-6" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {activeTab === 'activity'
              ? t('oracle.charts.dailyAssertions')
              : activeTab === 'tvs'
                ? t('oracle.charts.tvsCumulative')
                : activeTab === 'sync'
                  ? t('oracle.charts.syncHealth')
                  : activeTab === 'markets'
                    ? t('oracle.charts.topMarkets')
                    : t('oracle.charts.dataQuality')}
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'activity'
              ? t('oracle.charts.activityDesc')
              : activeTab === 'tvs'
                ? t('oracle.charts.tvsDesc')
                : activeTab === 'sync'
                  ? t('oracle.charts.syncDesc')
                  : activeTab === 'markets'
                    ? t('oracle.charts.marketsDesc')
                    : t('oracle.charts.dataQualityDesc')}
          </p>
        </div>
      </div>

      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-gray-200/50 bg-gray-100/50 p-1 backdrop-blur-sm">
        <button
          onClick={() => onTabChange('activity')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300',
            activeTab === 'activity'
              ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Activity size={14} />
          {t('oracle.charts.dailyAssertions')}
        </button>
        <button
          onClick={() => onTabChange('tvs')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300',
            activeTab === 'tvs'
              ? 'bg-white text-pink-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <PieChart size={14} />
          {t('oracle.charts.tvsCumulative')}
        </button>
        <button
          onClick={() => onTabChange('sync')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300',
            activeTab === 'sync'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Clock size={14} />
          {t('oracle.charts.syncHealth')}
        </button>
        <button
          onClick={() => onTabChange('markets')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300',
            activeTab === 'markets'
              ? 'bg-white text-orange-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <BarChart3 size={14} />
          {t('oracle.charts.topMarkets')}
        </button>
        <button
          onClick={() => onTabChange('accuracy')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300',
            activeTab === 'accuracy'
              ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Target size={14} />
          {t('oracle.charts.dataQuality')}
        </button>
      </div>
    </div>
  );
}

export { ChartsHeader };
