'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, BarChart2, FileText, Users, ArrowLeft } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn, getStorageItem, setStorageItem, removeStorageItem } from '@/shared/utils';

import { OnboardingSteps } from './Onboarding/OnboardingSteps';
import { RoleSelection } from './Onboarding/RoleSelection';

export type UserRole = 'developer' | 'protocol' | 'general';

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
const ROLE_STORAGE_KEY = 'oracle-monitor-user-role';
const PROGRESS_STORAGE_KEY = 'oracle-monitor-onboarding-progress';

interface OnboardingProgress {
  currentStep: number;
  selectedRole: UserRole | null;
  showRoleSelection: boolean;
  timestamp: number;
}

export function Onboarding({ onComplete, onSkip, className, forceOpen }: OnboardingProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(true);

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
          // Check if progress is not too old (7 days)
          const isRecent = Date.now() - savedProgress.timestamp < 7 * 24 * 60 * 60 * 1000;

          if (isRecent) {
            setSelectedRole(savedProgress.selectedRole);
            setShowRoleSelection(savedProgress.showRoleSelection);
            setCurrentStep(savedProgress.currentStep);
          } else {
            // Clear old progress
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
      selectedRole,
      showRoleSelection,
      timestamp: Date.now(),
    };

    setStorageItem(PROGRESS_STORAGE_KEY, progress);
  }, [isOpen, currentStep, selectedRole, showRoleSelection]);

  // Current steps based on role selection
  const getCurrentSteps = useCallback((): OnboardingStep[] => {
    // Common welcome step
    const welcomeStep: OnboardingStep = {
      id: 'welcome',
      title: t('onboarding.welcome'),
      description: t('onboarding.welcomeDesc'),
      icon: <AlertCircle className="h-10 w-10 text-primary" />,
    };

    if (showRoleSelection) {
      return [welcomeStep];
    }
    if (!selectedRole) {
      return [welcomeStep];
    }

    // Role-specific steps with translations (3 roles: developer, protocol, general)
    const roleStepsConfig: Record<UserRole, OnboardingStep[]> = {
      developer: [
        {
          id: 'dev_api',
          title: t('onboarding.steps.developer.api.title'),
          description: t('onboarding.steps.developer.api.description'),
          icon: <FileText className="h-10 w-10 text-blue-600" />,
        },
        {
          id: 'dev_integration',
          title: t('onboarding.steps.developer.integration.title'),
          description: t('onboarding.steps.developer.integration.description'),
          icon: <BarChart2 className="h-10 w-10 text-green-600" />,
        },
        {
          id: 'dev_monitoring',
          title: t('onboarding.steps.developer.monitoring.title'),
          description: t('onboarding.steps.developer.monitoring.description'),
          icon: <AlertCircle className="h-10 w-10 text-primary" />,
        },
      ],
      protocol: [
        {
          id: 'proto_monitoring',
          title: t('onboarding.steps.protocol.monitoring.title'),
          description: t('onboarding.steps.protocol.monitoring.description'),
          icon: <BarChart2 className="h-10 w-10 text-blue-600" />,
        },
        {
          id: 'proto_disputes',
          title: t('onboarding.steps.protocol.disputes.title'),
          description: t('onboarding.steps.protocol.disputes.description'),
          icon: <Users className="h-10 w-10 text-amber-600" />,
        },
        {
          id: 'proto_alerts',
          title: t('onboarding.steps.protocol.alerts.title'),
          description: t('onboarding.steps.protocol.alerts.description'),
          icon: <AlertCircle className="h-10 w-10 text-primary" />,
        },
      ],
      general: [
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
      ],
    };

    return roleStepsConfig[selectedRole] || [];
  }, [selectedRole, showRoleSelection, t]);

  const steps = getCurrentSteps();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setShowRoleSelection(false);
    setCurrentStep(0);
    setStorageItem(ROLE_STORAGE_KEY, role);
    // Progress will be saved by the useEffect
  };

  const handleBackToRoleSelection = useCallback(() => {
    setShowRoleSelection(true);
    setCurrentStep(0);
  }, []);

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

  // Handle keyboard navigation - must be after handler definitions
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && !showRoleSelection) {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (!showRoleSelection && currentStep > 0) {
          handleBack();
        } else if (!showRoleSelection && currentStep === 0) {
          handleBackToRoleSelection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    showRoleSelection,
    currentStep,
    handleSkip,
    handleNext,
    handleBack,
    handleBackToRoleSelection,
  ]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
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
            {!showRoleSelection && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={currentStep === 0 ? handleBackToRoleSelection : handleBack}
                className="mr-2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('onboarding.back')}
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
            aria-label={t('onboarding.skipTour')}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            {showRoleSelection ? (
              <motion.div
                key="role-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <RoleSelection onRoleSelect={handleRoleSelect} onSkip={handleSkip} />
              </motion.div>
            ) : (
              <motion.div
                key="onboarding-steps"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <OnboardingSteps
                  currentStep={currentStep}
                  steps={steps}
                  onNext={handleNext}
                  onBack={handleBack}
                  onSkip={handleSkip}
                  canGoBack={currentStep > 0}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Export reset function for external use
export { STORAGE_KEY, ROLE_STORAGE_KEY, PROGRESS_STORAGE_KEY };
export type { OnboardingProgress };
