'use client';

import { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { LucideIcon } from 'lucide-react';

export interface GuideStepConfig {
  id: string;
  icon: LucideIcon;
  iconClassName?: string;
  titleKey: string;
  descriptionKey: string;
}

export interface WelcomeGuideBaseProps {
  storageKey: string;
  steps: GuideStepConfig[];
  skipTextKey: string;
  finishTextKey: string;
  onComplete?: () => void;
}

export function WelcomeGuideBase({
  storageKey,
  steps,
  skipTextKey,
  finishTextKey,
  onComplete,
}: WelcomeGuideBaseProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      setIsOpen(true);
    }
  }, [storageKey]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(storageKey, 'true');
    onComplete?.();
  }, [onComplete, storageKey]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }, [currentStep, steps.length, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const currentStepData = steps[currentStep];

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
                    <Icon className={cn('h-8 w-8 text-primary', currentStepData.iconClassName)} />
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
                    <h3 className="mb-2 text-lg font-semibold">{t(currentStepData.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t(currentStepData.descriptionKey)}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 flex justify-center gap-1.5">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'h-2 w-2 rounded-full transition-all',
                        index === currentStep
                          ? 'w-4 bg-primary'
                          : 'bg-muted hover:bg-muted-foreground/50',
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
                  {t(skipTextKey)}
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
                    {currentStep === steps.length - 1 ? t(finishTextKey) : t('common.next')}
                    {currentStep < steps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
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

export function useWelcomeGuide(storageKey: string) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    setShouldShow(!completed);
  }, [storageKey]);

  const resetGuide = useCallback(() => {
    localStorage.removeItem(storageKey);
    setShouldShow(true);
  }, [storageKey]);

  return { shouldShow, resetGuide };
}
