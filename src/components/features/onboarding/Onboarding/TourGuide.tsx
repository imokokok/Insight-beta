'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
  storageKey?: string;
}

interface TourProgress {
  currentStep: number;
  timestamp: number;
}

const DEFAULT_STORAGE_KEY = 'oracle-monitor-tour-progress';

export function TourGuide({
  steps,
  isOpen,
  onComplete,
  onSkip,
  className,
  storageKey,
}: TourGuideProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [targetNotFound, setTargetNotFound] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const progressKey = storageKey || DEFAULT_STORAGE_KEY;

  const step = steps[currentStep];

  // Restore progress when tour opens
  useEffect(() => {
    if (!isOpen) return;

    const savedProgress = localStorage.getItem(progressKey);
    if (savedProgress) {
      try {
        const progress: TourProgress = JSON.parse(savedProgress);
        // Check if progress is not too old (7 days) and step is valid
        const isRecent = Date.now() - progress.timestamp < 7 * 24 * 60 * 60 * 1000;
        const isValidStep = progress.currentStep >= 0 && progress.currentStep < steps.length;

        if (isRecent && isValidStep) {
          setCurrentStep(progress.currentStep);
        } else {
          localStorage.removeItem(progressKey);
          setCurrentStep(0);
        }
      } catch {
        localStorage.removeItem(progressKey);
        setCurrentStep(0);
      }
    } else {
      setCurrentStep(0);
    }
  }, [isOpen, steps.length, progressKey]);

  // Save progress whenever step changes
  useEffect(() => {
    if (!isOpen) return;

    const progress: TourProgress = {
      currentStep,
      timestamp: Date.now(),
    };

    localStorage.setItem(progressKey, JSON.stringify(progress));
  }, [isOpen, currentStep, progressKey]);

  // Find and track target element
  useEffect(() => {
    if (!isOpen || !step) return;

    const updateTarget = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        setTargetNotFound(false);
        calculateTooltipPosition(rect, step.placement || 'bottom');

        // Scroll target into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Target element not found
        setTargetNotFound(true);
        setTargetRect(null);
        // Center the tooltip when target is not found
        setTooltipPosition({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
        });
        console.warn(`[TourGuide] Target element not found: ${step.target}`);
      }
    };

    // Delay slightly to ensure DOM is ready
    const timeoutId = setTimeout(updateTarget, 100);

    // Update on resize
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, step, currentStep]);

  const calculateTooltipPosition = useCallback((rect: DOMRect, placement: string) => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 16;

    let top = 0;
    let left = 0;

    // Calculate initial position based on placement
    switch (placement) {
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

    // Smart placement adjustment if tooltip goes off-screen
    const padding = 16;
    const minVisibleWidth = 200; // Minimum visible width
    const minVisibleHeight = 100; // Minimum visible height

    // Horizontal boundary checks with smart flip
    if (left < padding) {
      // If placed on left and goes off-screen, try right
      if (
        placement === 'left' &&
        rect.right + offset + tooltipWidth < window.innerWidth - padding
      ) {
        left = rect.right + offset;
      } else {
        left = padding;
      }
    } else if (left + tooltipWidth > window.innerWidth - padding) {
      // If placed on right and goes off-screen, try left
      if (placement === 'right' && rect.left - offset - tooltipWidth > padding) {
        left = rect.left - tooltipWidth - offset;
      } else {
        left = window.innerWidth - tooltipWidth - padding;
      }
    }

    // Vertical boundary checks with smart flip
    if (top < padding) {
      // If placed on top and goes off-screen, try bottom
      if (
        placement === 'top' &&
        rect.bottom + offset + tooltipHeight < window.innerHeight - padding
      ) {
        top = rect.bottom + offset;
      } else {
        top = padding;
      }
    } else if (top + tooltipHeight > window.innerHeight - padding) {
      // If placed on bottom and goes off-screen, try top
      if (placement === 'bottom' && rect.top - offset - tooltipHeight > padding) {
        top = rect.top - tooltipHeight - offset;
      } else {
        top = window.innerHeight - tooltipHeight - padding;
      }
    }

    // Ensure minimum visibility
    left = Math.max(padding, Math.min(left, window.innerWidth - minVisibleWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - minVisibleHeight - padding));

    setTooltipPosition({ top, left });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      localStorage.removeItem(progressKey);
      onComplete();
    }
  }, [currentStep, steps.length, onComplete, progressKey]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    // Keep progress when skipping, so user can resume later
    onSkip();
  }, [onSkip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handleBack, onSkip]);

  if (!isOpen || !step) return null;

  return (
    <div className={cn('fixed inset-0 z-50', className)}>
      {/* Backdrop with spotlight - only show when target is found */}
      {!targetNotFound && (
        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.7)" mask="url(#spotlight-mask)" />
        </svg>
      )}

      {/* Full backdrop when target not found */}
      {targetNotFound && <div className="absolute inset-0 bg-black/70" />}

      {/* Highlight border around target */}
      {targetRect && !targetNotFound && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute rounded-lg border-2 border-purple-500"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tooltipRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'absolute rounded-lg bg-white p-6 shadow-2xl',
            'w-[calc(100vw-32px)] max-w-xs sm:max-w-sm md:w-80',
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
        >
          {/* Target not found warning */}
          {targetNotFound && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">
                {t('onboarding.targetNotFound') || 'Target element not found'}
              </p>
            </div>
          )}

          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <h3 id="tour-title" className="text-lg font-semibold text-gray-900">
              {step.title}
            </h3>
            <button
              onClick={handleSkip}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('onboarding.skipTour')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <p className="mb-6 text-gray-600">{step.description}</p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>
                {t('onboarding.stepOf', { current: currentStep + 1, total: steps.length })}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-purple-600 transition-all duration-300 will-change-transform"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('onboarding.back')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              {t('onboarding.skipTour')}
            </button>
            <button
              onClick={handleNext}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('onboarding.complete')}
                </>
              ) : (
                <>
                  {t('onboarding.next')}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
