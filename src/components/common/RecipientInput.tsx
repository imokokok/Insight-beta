'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CheckCircle2, AlertCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { logger } from '@/shared/logger';
import type { AlertRule } from '@/types/oracleTypes';

interface RecipientInputProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => Promise<void>;
  t: (key: string) => string;
}

const MAX_RETRIES = 3;
const DEBOUNCE_DELAY = 300;
const MAX_LENGTH = 200;
const SUCCESS_MESSAGE_DURATION = 2000;
const MAX_RETRY_DELAY = 10000;
const INITIAL_RETRY_DELAY = 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RecipientInputComponent({ rule, onPatchRule, t }: RecipientInputProps) {
  const [localValue, setLocalValue] = useState(rule.recipient ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<number>(0);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(rule.recipient ?? '');
  }, [rule.id, rule.recipient]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const validateEmail = useCallback((value: string): boolean => {
    return EMAIL_REGEX.test(value);
  }, []);

  const showSuccess = useCallback(() => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setIsSuccess(true);
    successTimeoutRef.current = setTimeout(() => {
      setIsSuccess(false);
      successTimeoutRef.current = null;
    }, SUCCESS_MESSAGE_DURATION);
  }, []);

  const executeUpdate = useCallback(
    async (value: string, requestId: number, attempt: number = 1) => {
      if (requestId !== requestIdRef.current) return;

      try {
        await onPatchRule(rule.id, { recipient: value });
        setRetryCount(0);
        showSuccess();
      } catch (error: unknown) {
        logger.error('Failed to update recipient', { error });
        if (requestId !== requestIdRef.current) return;

        if (attempt < MAX_RETRIES) {
          setRetryCount(attempt);
          const nextAttempt = attempt + 1;
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, nextAttempt), MAX_RETRY_DELAY);
          debounceRef.current = setTimeout(() => {
            executeUpdate(value, requestId, nextAttempt);
          }, delay);
        } else {
          setError(t('oracle.alerts.updateFailedWithRetry'));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsUpdating(false);
          debounceRef.current = null;
        }
      }
    },
    [rule.id, onPatchRule, t, showSuccess],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value.length > MAX_LENGTH) {
        setError(null);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);

      setLocalValue(value);
      setError(null);

      if (!value.trim()) {
        setError(t('oracle.alerts.recipientRequired'));
        return;
      }

      if (!validateEmail(value)) {
        setError(t('oracle.alerts.recipientInvalidEmail'));
        return;
      }

      setIsUpdating(true);
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      debounceRef.current = setTimeout(() => {
        executeUpdate(value, currentRequestId, 1);
      }, DEBOUNCE_DELAY);
    },
    [validateEmail, executeUpdate, t],
  );

  const inputClassName = useMemo(() => {
    const baseClass =
      'h-10 rounded-xl bg-white/70 ring-1 border-transparent focus-visible:ring-2 focus-visible:ring-primary500/20 transition-all duration-200';
    if (error) return `${baseClass} ring-red-500 focus-visible:ring-red-500/20`;
    if (isSuccess) return `${baseClass} ring-green-500 focus-visible:ring-green-500/20`;
    return `${baseClass} ring-black/5`;
  }, [error, isSuccess]);

  const characterCountColor = useMemo(() => {
    const percentage = (localValue.length / MAX_LENGTH) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-amber-500';
    return 'text-gray-400';
  }, [localValue.length]);

  return (
    <div className="md:col-span-12">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.recipient')}
          </div>
          {retryCount > 0 && (
            <div className="animate-pulse text-xs text-amber-500">
              {t('oracle.alerts.retryAttempt')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSuccess && (
            <div
              className="flex animate-fade-in items-center gap-1 text-xs font-medium text-green-600"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="h-3 w-3" />
              {t('oracle.alerts.saved')}
            </div>
          )}
          <div className={`text-xs ${characterCountColor}`} aria-hidden="true">
            {localValue.length}/{MAX_LENGTH}
          </div>
        </div>
      </div>

      {isUpdating ? (
        <div className="h-10 animate-pulse rounded-xl bg-gray-100" aria-hidden="true" />
      ) : (
        <Input
          value={localValue}
          onChange={handleChange}
          placeholder={t('oracle.alerts.recipientPlaceholder')}
          maxLength={MAX_LENGTH}
          aria-invalid={!!error}
          aria-describedby={error ? 'recipient-error' : 'recipient-hint'}
          aria-label={t('oracle.alerts.recipient')}
          className={inputClassName}
        />
      )}

      <div id="recipient-hint" className="sr-only">
        {t('oracle.alerts.recipientHint')}
      </div>

      {error && (
        <div
          id="recipient-error"
          className="mt-1 flex animate-fade-in items-center gap-1 text-sm text-red-500"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

export const RecipientInput = memo(RecipientInputComponent);
