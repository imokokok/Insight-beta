import type { ReactNode } from 'react';

import { Check, ArrowRight } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  target?: string;
}

interface OnboardingStepsProps {
  currentStep: number;
  steps: OnboardingStep[];
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingSteps({ currentStep, steps, onNext, onSkip }: OnboardingStepsProps) {
  const { t } = useI18n();
  const step = steps[currentStep];
  if (!step) return null;

  return (
    <>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4">{step.icon}</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
        <p className="text-gray-600">{step.description}</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between">
          {steps.map((_, index) => (
            <div
              key={_.id}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                index <= currentStep ? 'bg-purple-600' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t('onboarding.skipTour')}
        </button>
        <button
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          {currentStep === steps.length - 1 ? (
            <>
              <Check className="h-4 w-4" />
              {t('onboarding.getStarted')}
            </>
          ) : (
            <>
              {t('onboarding.next')}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </>
  );
}
