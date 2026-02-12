import type { ReactNode } from 'react';

import { motion } from 'framer-motion';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

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
  onBack: () => void;
  onSkip: () => void;
  canGoBack?: boolean;
}

export function OnboardingSteps({
  currentStep,
  steps,
  onNext,
  onBack,
  onSkip,
  canGoBack = false,
}: OnboardingStepsProps) {
  const { t } = useI18n();
  const step = steps[currentStep];
  if (!step) return null;

  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mb-6 flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-4"
          aria-hidden="true"
        >
          {step.icon}
        </motion.div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{step.title}</h3>
        <p className="text-gray-600">{step.description}</p>
      </motion.div>

      {/* Progress */}
      <div className="mb-6">
        <div
          className="mb-2 flex justify-between"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
        >
          {steps.map((s, index) => (
            <motion.div
              key={s.id}
              initial={false}
              animate={{
                scale: index === currentStep ? 1.2 : 1,
                backgroundColor: index <= currentStep ? '#9333ea' : '#d1d5db',
              }}
              transition={{ duration: 0.2 }}
              className={cn('h-2 w-2 rounded-full')}
              aria-label={`Step ${index + 1} ${index <= currentStep ? 'completed' : 'pending'}`}
            />
          ))}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full bg-purple-600 will-change-transform"
            initial={false}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">
          {t('onboarding.stepOf', { current: currentStep + 1, total: steps.length })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {canGoBack && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            aria-label={t('onboarding.back')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">{t('onboarding.back')}</span>
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t('onboarding.skipTour')}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          aria-label={isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
        >
          {isLastStep ? (
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
        </motion.button>
      </div>
    </>
  );
}
