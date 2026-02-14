'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { motion } from 'framer-motion';
import { X, AlertCircle, BarChart2, FileText, ArrowLeft } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn, getStorageItem, setStorageItem, removeStorageItem } from '@/shared/utils';

import { OnboardingSteps } from './Onboarding/OnboardingSteps';

export type UserRole = 'general';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

interface OnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
  forceOpen?: boolean;
}

const STORAGE_KEY = 'oracle-monitor-onboarding-completed';
const PROGRESS_STORAGE_KEY = 'oracle-monitor-onboarding-progress';

interface OnboardingProgress {
  currentStep: number;
  timestamp: number;
}

export function Onboarding({ onComplete, onSkip, className, forceOpen }: OnboardingProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Check if user has completed onboarding and restore progress
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    const loadProgress = async () => {
      const hasCompleted = await getStorageItem<string | null>(STORAGE_KEY, null);
      const savedProgress = await getStorageItem<OnboardingProgress | null>(
        PROGRESS_STORAGE_KEY,
        null,
      );

      if (!hasCompleted) {
        setIsOpen(true);

        // Restore progress if exists
        if (savedProgress) {
          const isRecent = Date.now() - savedProgress.timestamp < 7 * 24 * 60 * 60 * 1000;

          if (isRecent) {
            setCurrentStep(savedProgress.currentStep);
          } else {
            removeStorageItem(PROGRESS_STORAGE_KEY);
          }
        }
      }
    };

    loadProgress();
  }, [forceOpen]);

  // Save progress whenever it changes
  useEffect(() => {
    if (!isOpen) return;

    const progress: OnboardingProgress = {
      currentStep,
      timestamp: Date.now(),
    };

    setStorageItem(PROGRESS_STORAGE_KEY, progress);
  }, [isOpen, currentStep]);

  // Current steps - always use general role for all users
  const getCurrentSteps = useCallback((): OnboardingStep[] => {
    return [
      {
        id: 'general_explore',
        title: t('onboarding.steps.general.exploration.title'),
        description: t('onboarding.steps.general.exploration.description'),
        icon: <BarChart2 className="h-10 w-10 text-blue-600" />,
      },
      {
        id: 'general_compare',
        title: t('onboarding.steps.general.comparison.title'),
        description: t('onboarding.steps.general.comparison.description'),
        icon: <FileText className="h-10 w-10 text-green-600" />,
      },
      {
        id: 'general_alerts',
        title: t('onboarding.steps.general.alerts.title'),
        description: t('onboarding.steps.general.alerts.description'),
        icon: <AlertCircle className="h-10 w-10 text-primary" />,
      },
    ];
  }, [t]);

  const steps = getCurrentSteps();

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onSkip?.();
    handleComplete();
  }, [onSkip]);

  const handleComplete = useCallback(() => {
    setStorageItem(STORAGE_KEY, 'true');
    removeStorageItem(PROGRESS_STORAGE_KEY);
    setIsOpen(false);
    onComplete?.();
  }, [onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, handleSkip, handleNext, handleBack]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 sm:p-6">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="mr-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
            )}
            <h2 id="onboarding-title" className="text-lg font-bold text-gray-900 sm:text-xl">
              {t('onboarding.title')}
            </h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSkip}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <OnboardingSteps
            currentStep={currentStep}
            steps={steps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={currentStep > 0}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Export reset function for external use
export { STORAGE_KEY, PROGRESS_STORAGE_KEY };
export type { OnboardingProgress };
