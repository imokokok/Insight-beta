'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, MapPin, Bell, Layers, Star } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn, getStorageItem, setStorageItem } from '@/shared/utils';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface FirstTimeTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

const TOUR_STORAGE_KEY = 'oracle-monitor-first-tour-completed';

export function FirstTimeTour({ isOpen, onComplete, onSkip, className }: FirstTimeTourProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  // Define tour steps based on the image requirements
  const tourSteps: TourStep[] = [
    {
      id: 'dashboard',
      target: '[data-tour="dashboard"]',
      title: t('onboarding.tour.dashboard.title'),
      description: t('onboarding.tour.dashboard.description'),
      icon: <MapPin className="h-5 w-5 text-primary" />,
      placement: 'right',
    },
    {
      id: 'comparison',
      target: '[data-tour="comparison"]',
      title: t('onboarding.tour.comparison.title'),
      description: t('onboarding.tour.comparison.description'),
      icon: <Layers className="h-5 w-5 text-blue-600" />,
      placement: 'right',
    },
    {
      id: 'alerts',
      target: '[data-tour="alerts"]',
      title: t('onboarding.tour.alerts.title'),
      description: t('onboarding.tour.alerts.description'),
      icon: <Bell className="h-5 w-5 text-amber-600" />,
      placement: 'right',
    },
    {
      id: 'watchlist',
      target: '[data-tour="watchlist"]',
      title: t('onboarding.tour.watchlist.title'),
      description: t('onboarding.tour.watchlist.description'),
      icon: <Star className="h-5 w-5 text-yellow-600" />,
      placement: 'right',
    },
  ];

  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setCurrentStep(0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setStorageItem(TOUR_STORAGE_KEY, 'true');
      onComplete();
    }
  }, [currentStep, tourSteps.length, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setStorageItem(TOUR_STORAGE_KEY, 'true');
    onSkip();
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && !showWelcome) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !showWelcome) {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showWelcome, handleNext, handleBack, handleSkip]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn('fixed inset-0 z-50', className)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {showWelcome ? (
            // Welcome Modal
            <div className="flex h-full w-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md"
              >
                <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">{t('onboarding.guidedTour.title')}</h2>
                      <button
                        onClick={handleSkip}
                        className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="mb-6 text-gray-600">{t('onboarding.guidedTour.description')}</p>

                    {/* Quick preview of tour steps */}
                    <div className="mb-6 space-y-2">
                      {tourSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                            {step.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{step.title}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {index + 1}/{tourSteps.length}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSkip}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        {t('onboarding.guidedTour.skipForNow')}
                      </button>
                      <button
                        onClick={handleStartTour}
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
                      >
                        {t('onboarding.guidedTour.startTour')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            // Tour Step Tooltip
            <TourStepTooltip
              step={tourSteps[currentStep]}
              currentStep={currentStep}
              totalSteps={tourSteps.length}
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkip}
              t={t}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TourStepTooltipProps {
  step: TourStep | undefined;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function TourStepTooltip({
  step,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  t,
}: TourStepTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetFound, setTargetFound] = useState(false);

  // Store step in a ref to avoid dependency issues
  const stepRef = step;

  useEffect(() => {
    if (!stepRef) return;

    const updatePosition = () => {
      const element = document.querySelector(stepRef.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetFound(true);

        // Calculate position based on placement
        let top = 0;
        let left = 0;
        const tooltipWidth = 360;
        const tooltipHeight = 200;
        const offset = 16;

        switch (stepRef.placement) {
          case 'top':
            top = rect.top - tooltipHeight - offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - offset;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + offset;
            break;
          default:
            top = rect.bottom + offset;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // Boundary checks
        const padding = 16;
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

        setPosition({ top, left });

        // Scroll target into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetFound(false);
        // Center on screen if target not found
        setPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 180,
        });
      }
    };

    const timeoutId = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [stepRef]);

  return (
    <>
      {/* Spotlight effect */}
      {targetFound && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                id="tour-target-highlight"
                x={0}
                y={0}
                width={0}
                height={0}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      )}

      {/* Highlight border around target */}
      {step && <TargetHighlight target={step.target} />}

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute w-[calc(100vw-32px)] max-w-sm rounded-xl bg-white p-5 shadow-2xl"
        style={{ top: position.top, left: position.left }}
      >
        {/* Progress bar */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="mb-4 flex items-start justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {step?.icon}
            </div>
            <div>
              <span className="text-xs font-medium text-primary">
                {t('onboarding.guidedTour.progress', {
                  current: currentStep + 1,
                  total: totalSteps,
                })}
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{step?.title}</h3>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mb-6 text-gray-600">{step?.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            disabled={currentStep === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('onboarding.back')}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {t('onboarding.skipTour')}
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('onboarding.guidedTour.finish')}
                </>
              ) : (
                <>
                  {t('onboarding.next')}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Component to highlight the target element with pulse animation
function TargetHighlight({ target }: { target: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const element = document.querySelector(target);
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [target]);

  if (!rect) return null;

  return (
    <>
      {/* Outer pulse ring */}
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: [0, 0.5, 0],
          scale: [1, 1.2, 1.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
        className="pointer-events-none absolute rounded-lg border-2 border-blue-400"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      {/* Main highlight border */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pointer-events-none absolute rounded-lg border-2 border-primary shadow-[0_0_20px_rgba(147,51,234,0.5)]"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
      {/* Inner glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute rounded-lg bg-primary/10"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />
    </>
  );
}

// Hook to check if first time tour should be shown
export function useFirstTimeTour() {
  const [showTour, setShowTour] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkTourStatus = async () => {
      const hasCompleted = await getStorageItem<string | null>(TOUR_STORAGE_KEY, null);
      const hasCompletedOnboarding = await getStorageItem<string | null>(
        'oracle-monitor-onboarding-completed',
        null,
      );

      // Only show tour if user has completed onboarding but hasn't seen the tour
      if (hasCompletedOnboarding && !hasCompleted) {
        setShowTour(true);
      }
      setIsReady(true);
    };

    checkTourStatus();
  }, []);

  const dismissTour = useCallback(() => {
    setStorageItem(TOUR_STORAGE_KEY, 'true');
    setShowTour(false);
  }, []);

  return { showTour, isReady, dismissTour };
}

export { TOUR_STORAGE_KEY };
