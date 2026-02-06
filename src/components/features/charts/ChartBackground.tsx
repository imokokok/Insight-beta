'use client';

import { cn } from '@/lib/utils';

import type { TabKey } from './types';

function ChartBackground({ activeTab }: { activeTab: TabKey }) {
  return (
    <>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          activeTab === 'activity' ? 'opacity-20' : 'opacity-0',
        )}
      >
        <div className="absolute -left-[10%] -top-[10%] h-[150%] w-[50%] rounded-full bg-gradient-to-br from-purple-200/30 via-indigo-100/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[60%] w-[40%] rounded-full bg-gradient-to-tl from-blue-100/20 via-transparent to-transparent blur-2xl" />
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          activeTab === 'tvs' ? 'opacity-20' : 'opacity-0',
        )}
      >
        <div className="absolute -right-[10%] -top-[10%] h-[150%] w-[50%] rounded-full bg-gradient-to-bl from-pink-200/30 via-rose-100/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[60%] w-[40%] rounded-full bg-gradient-to-tr from-purple-100/20 via-transparent to-transparent blur-2xl" />
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          activeTab === 'sync' ? 'opacity-20' : 'opacity-0',
        )}
      >
        <div className="absolute -bottom-[10%] -left-[10%] h-[150%] w-[50%] rounded-full bg-gradient-to-tr from-blue-200/30 via-cyan-100/10 to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-[60%] w-[40%] rounded-full bg-gradient-to-bl from-indigo-100/20 via-transparent to-transparent blur-2xl" />
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          activeTab === 'markets' ? 'opacity-20' : 'opacity-0',
        )}
      >
        <div className="absolute -top-[10%] right-[20%] h-[120%] w-[60%] rounded-full bg-gradient-to-b from-orange-200/30 via-amber-100/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[50%] w-[40%] rounded-full bg-gradient-to-tr from-red-100/20 via-transparent to-transparent blur-2xl" />
      </div>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          activeTab === 'accuracy' ? 'opacity-20' : 'opacity-0',
        )}
      >
        <div className="absolute -top-[10%] left-[20%] h-[120%] w-[60%] rounded-full bg-gradient-to-b from-green-200/30 via-emerald-100/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[50%] w-[40%] rounded-full bg-gradient-to-tr from-teal-100/20 via-transparent to-transparent blur-2xl" />
      </div>
    </>
  );
}

export { ChartBackground };
