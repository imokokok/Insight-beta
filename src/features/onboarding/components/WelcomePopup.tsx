'use client';

import React, { useEffect, useCallback } from 'react';

import { motion } from 'framer-motion';
import { X, Rocket, Sparkles } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn, getStorageItem, setStorageItem } from '@/shared/utils';

interface WelcomePopupProps {
  isOpen: boolean;
  onComplete: () => void;
  className?: string;
}

const WELCOME_STORAGE_KEY = 'oracle-monitor-welcome-shown';

export function useWelcomePopup() {
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const checkWelcomeStatus = async () => {
      const hasShown = await getStorageItem<string | null>(WELCOME_STORAGE_KEY, null);
      if (!hasShown) {
        setShowWelcome(true);
      }
      setIsReady(true);
    };

    checkWelcomeStatus();
  }, []);

  const dismissWelcome = useCallback(() => {
    setStorageItem(WELCOME_STORAGE_KEY, 'true');
    setShowWelcome(false);
  }, []);

  return { showWelcome, isReady, dismissWelcome };
}

export function WelcomePopup({ isOpen, onComplete, className }: WelcomePopupProps) {
  const { t } = useI18n();

  const handleDismiss = useCallback(() => {
    setStorageItem(WELCOME_STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative">
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-8 pb-8 pt-10">
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
              >
                <Rocket className="h-10 w-10 text-white" />
              </motion.div>
            </div>
          </div>

          <div className="px-8 pb-8 text-center -mt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary"
            >
              <Sparkles className="h-4 w-4" />
              {t('onboarding.welcomeBadge') || 'Welcome'}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-3 text-2xl font-bold text-gray-900"
            >
              {t('onboarding.welcomeTitle') || 'Welcome to Insight'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6 text-gray-600"
            >
              {t('onboarding.welcomeDesc') ||
                'Your universal oracle monitoring platform. Monitor real-time data across multiple oracle protocols.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={handleDismiss}
                className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700"
              >
                {t('onboarding.getStarted') || 'Get Started'}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {t('onboarding.exploreFeatures') || 'Explore Features'}
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { WELCOME_STORAGE_KEY };
