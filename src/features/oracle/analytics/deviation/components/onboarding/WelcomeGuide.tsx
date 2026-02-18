'use client';

import { Activity, TrendingUp, AlertTriangle, Filter, BarChart3 } from 'lucide-react';

import {
  WelcomeGuideBase,
  useWelcomeGuide as useWelcomeGuideBase,
  type GuideStepConfig,
} from '@/features/oracle/components/shared';

const STORAGE_KEY = 'deviation-analytics-guide-completed';

const guideSteps: GuideStepConfig[] = [
  {
    id: 'overview',
    icon: Activity,
    titleKey: 'analytics.deviation.guide.steps.overview.title',
    descriptionKey: 'analytics.deviation.guide.steps.overview.description',
  },
  {
    id: 'trends',
    icon: TrendingUp,
    titleKey: 'analytics.deviation.guide.steps.trends.title',
    descriptionKey: 'analytics.deviation.guide.steps.trends.description',
  },
  {
    id: 'anomalies',
    icon: AlertTriangle,
    titleKey: 'analytics.deviation.guide.steps.anomalies.title',
    descriptionKey: 'analytics.deviation.guide.steps.anomalies.description',
  },
  {
    id: 'filters',
    icon: Filter,
    titleKey: 'analytics.deviation.guide.steps.filters.title',
    descriptionKey: 'analytics.deviation.guide.steps.filters.description',
  },
  {
    id: 'stats',
    icon: BarChart3,
    titleKey: 'analytics.deviation.guide.steps.stats.title',
    descriptionKey: 'analytics.deviation.guide.steps.stats.description',
  },
];

interface WelcomeGuideProps {
  onComplete?: () => void;
}

export function WelcomeGuide({ onComplete }: WelcomeGuideProps) {
  return (
    <WelcomeGuideBase
      storageKey={STORAGE_KEY}
      steps={guideSteps}
      skipTextKey="analytics.deviation.guide.skip"
      finishTextKey="analytics.deviation.guide.finish"
      onComplete={onComplete}
    />
  );
}

export function useWelcomeGuide() {
  return useWelcomeGuideBase(STORAGE_KEY);
}
