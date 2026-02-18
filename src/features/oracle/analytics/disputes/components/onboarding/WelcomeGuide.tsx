'use client';

import { Gavel, Filter, Eye, Download } from 'lucide-react';

import { WelcomeGuideBase, type GuideStepConfig } from '@/features/oracle/components/shared';

const STORAGE_KEY = 'disputes_guide_completed';

const guideSteps: GuideStepConfig[] = [
  {
    id: 'disputes-overview',
    icon: Gavel,
    iconClassName: 'text-purple-600',
    titleKey: 'analytics:disputes.guide.step1Title',
    descriptionKey: 'analytics:disputes.guide.step1Desc',
  },
  {
    id: 'filters',
    icon: Filter,
    iconClassName: 'text-blue-600',
    titleKey: 'analytics:disputes.guide.step2Title',
    descriptionKey: 'analytics:disputes.guide.step2Desc',
  },
  {
    id: 'details',
    icon: Eye,
    iconClassName: 'text-green-600',
    titleKey: 'analytics:disputes.guide.step3Title',
    descriptionKey: 'analytics:disputes.guide.step3Desc',
  },
  {
    id: 'export',
    icon: Download,
    iconClassName: 'text-orange-600',
    titleKey: 'analytics:disputes.guide.step4Title',
    descriptionKey: 'analytics:disputes.guide.step4Desc',
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
      skipTextKey="common.skip"
      finishTextKey="common.finish"
      onComplete={onComplete}
    />
  );
}
