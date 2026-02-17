'use client';

import { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
  AlertTriangle,
  Filter,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

const STORAGE_KEY = 'deviation-analytics-guide-completed';

interface GuideStep {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
}

const guideSteps: GuideStep[] = [
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
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }, [currentStep, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const currentStepData = guideSteps[currentStep];

  if (!currentStepData) return null;

  const Icon = currentStepData.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleSkip}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="mx-4 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
              <div className="relative p-6">
                <button
                  onClick={handleSkip}
                  className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    <h3 className="mb-2 text-lg font-semibold">
                      {t(currentStepData.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(currentStepData.descriptionKey)}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 flex justify-center gap-1.5">
                  {guideSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'h-2 w-2 rounded-full transition-all',
                        index === currentStep
                          ? 'bg-primary w-4'
                          : 'bg-muted hover:bg-muted-foreground/50'
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  {t('analytics.deviation.guide.skip')}
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {t('common.previous')}
                  </Button>
                  <Button size="sm" onClick={handleNext}>
                    {currentStep === guideSteps.length - 1
                      ? t('analytics.deviation.guide.finish')
                      : t('common.next')}
                    {currentStep < guideSteps.length - 1 && (
                      <ChevronRight className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useWelcomeGuide() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    setShouldShow(!completed);
  }, []);

  const resetGuide = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setShouldShow(true);
  }, []);

  return { shouldShow, resetGuide };
}
