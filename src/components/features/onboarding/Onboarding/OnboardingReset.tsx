'use client';

import { useCallback, useState } from 'react';

import { HelpCircle, RotateCcw } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';

import { STORAGE_KEY, ROLE_STORAGE_KEY, PROGRESS_STORAGE_KEY } from '../Onboarding';

interface OnboardingResetProps {
  onReset?: () => void;
  variant?: 'button' | 'menu' | 'icon';
  className?: string;
}

export function OnboardingReset({ onReset, variant = 'button', className }: OnboardingResetProps) {
  const { t } = useI18n();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    setShowConfirm(false);
    onReset?.();
    // Reload page to show onboarding
    window.location.reload();
  }, [onReset]);

  if (showConfirm) {
    return (
      <div className={`rounded-lg border border-purple-200 bg-purple-50 p-4 ${className}`}>
        <p className="mb-3 text-sm text-gray-700">{t('onboarding.resetConfirm')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-white"
          >
            {t('onboarding.cancel')}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700"
          >
            {t('onboarding.confirm')}
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={`rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 ${className}`}
        aria-label={t('onboarding.viewAgain')}
        title={t('onboarding.viewAgain')}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  if (variant === 'menu') {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 ${className}`}
      >
        <RotateCcw className="h-4 w-4" />
        {t('onboarding.viewAgain')}
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 ${className}`}
    >
      <RotateCcw className="h-4 w-4" />
      {t('onboarding.viewAgain')}
    </button>
  );
}
