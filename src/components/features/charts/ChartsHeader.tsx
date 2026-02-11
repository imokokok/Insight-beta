'use client';

import { Activity, PieChart, Clock, BarChart3, Target } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { TabKey, Translator } from './types';

interface ChartsHeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  t: Translator;
}

function ChartsHeader({ activeTab, onTabChange, t }: ChartsHeaderProps) {
  return (
    <div className="relative z-10 mb-4 flex flex-col items-start justify-between gap-3 sm:mb-8 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            'rounded-lg p-2 shadow-inner ring-1 backdrop-blur-md transition-colors duration-500 sm:rounded-xl sm:p-3',
            activeTab === 'activity'
              ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 ring-purple-500/20'
              : activeTab === 'tvs'
                ? 'bg-gradient-to-br from-pink-500/10 to-rose-500/10 text-pink-600 ring-pink-500/20'
                : activeTab === 'sync'
                  ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600 ring-blue-500/20'
                  : activeTab === 'markets'
                    ? 'bg-gradient-to-br from-amber-500/10 to-amber-500/10 text-amber-600 ring-amber-500/20'
                    : 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 ring-green-500/20',
          )}
        >
          {activeTab === 'activity' ? (
            <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : activeTab === 'tvs' ? (
            <PieChart className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : activeTab === 'sync' ? (
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : activeTab === 'markets' ? (
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          ) : (
            <Target className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800 sm:text-lg">
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
          <p className="hidden text-xs text-gray-500 sm:block sm:text-sm">
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

      <div className="flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-gray-200/50 bg-gray-100/50 p-0.5 backdrop-blur-sm sm:w-auto sm:gap-1 sm:rounded-xl sm:p-1">
        <button
          onClick={() => onTabChange('activity')}
          className={cn(
            'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-300 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm',
            activeTab === 'activity'
              ? 'bg-white text-purple-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Activity size={12} className="sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('oracle.charts.dailyAssertions')}</span>
          <span className="sm:hidden">Activity</span>
        </button>
        <button
          onClick={() => onTabChange('tvs')}
          className={cn(
            'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-300 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm',
            activeTab === 'tvs'
              ? 'bg-white text-pink-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <PieChart size={12} className="sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('oracle.charts.tvsCumulative')}</span>
          <span className="sm:hidden">TVS</span>
        </button>
        <button
          onClick={() => onTabChange('sync')}
          className={cn(
            'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-300 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm',
            activeTab === 'sync'
              ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Clock size={12} className="sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('oracle.charts.syncHealth')}</span>
          <span className="sm:hidden">Sync</span>
        </button>
        <button
          onClick={() => onTabChange('markets')}
          className={cn(
            'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-300 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm',
            activeTab === 'markets'
              ? 'bg-white text-amber-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <BarChart3 size={12} className="sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('oracle.charts.topMarkets')}</span>
          <span className="sm:hidden">Markets</span>
        </button>
        <button
          onClick={() => onTabChange('accuracy')}
          className={cn(
            'flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-300 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm',
            activeTab === 'accuracy'
              ? 'bg-white text-green-700 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
          )}
        >
          <Target size={12} className="sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{t('oracle.charts.dataQuality')}</span>
          <span className="sm:hidden">Quality</span>
        </button>
      </div>
    </div>
  );
}

export { ChartsHeader };
