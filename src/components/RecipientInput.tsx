"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { AlertRule } from "@/lib/oracleTypes";

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

export function RecipientInput({ rule, onPatchRule, t }: RecipientInputProps) {
  const [localValue, setLocalValue] = useState(rule.recipient ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // 用于防抖延迟更新请求的计时器引用
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // 用于跟踪当前请求ID，防止竞态条件
  const requestIdRef = useRef<number>(0);
  // 用于显示成功消息后自动隐藏的计时器引用
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 当外部 rule props 变化时，同步更新内部状态
  useEffect(() => {
    setLocalValue(rule.recipient ?? "");
  }, [rule.id, rule.recipient]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const validateEmail = useCallback((value: string): boolean => {
    return EMAIL_REGEX.test(value);
  }, []);

  const showSuccess = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    setIsSuccess(true);
    successTimeoutRef.current = setTimeout(() => {
      setIsSuccess(false);
      successTimeoutRef.current = null;
    }, SUCCESS_MESSAGE_DURATION);
  }, []);

  // 执行更新请求的函数，包含重试逻辑和竞态条件处理
  const executeUpdate = useCallback(
    async (value: string, requestId: number, attempt: number = 1) => {
      // 检查请求ID是否是最新的，防止竞态条件
      if (requestId !== requestIdRef.current) {
        return;
      }

      try {
        await onPatchRule(rule.id, { recipient: value });
        setRetryCount(0);
        showSuccess();
      } catch (error) {
        console.error("Failed to update recipient:", error);
        // 再次检查请求ID，确保在重试期间没有新的请求
        if (requestId !== requestIdRef.current) {
          return;
        }

        // 如果还有重试次数，进行指数退避重试
        if (attempt < MAX_RETRIES) {
          setRetryCount(attempt);
          const nextAttempt = attempt + 1;
          // 指数退避：延迟时间翻倍，但不超过最大延迟
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, nextAttempt),
            MAX_RETRY_DELAY,
          );
          debounceRef.current = setTimeout(() => {
            executeUpdate(value, requestId, nextAttempt);
          }, delay);
        } else {
          // 重试次数用完，显示最终错误
          setError(t("oracle.alerts.updateFailedWithRetry"));
        }
      } finally {
        // 只在当前请求是最新的情况下重置状态
        if (requestId === requestIdRef.current) {
          setIsUpdating(false);
          debounceRef.current = null;
        }
      }
    },
    [rule.id, onPatchRule, t, showSuccess],
  );

  // 处理输入变化，包含防抖和验证逻辑
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value.length > MAX_LENGTH) {
        setError(null);
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setLocalValue(value);
      setError(null);

      if (!value.trim()) {
        setError(t("oracle.alerts.recipientRequired"));
        return;
      }

      if (!validateEmail(value)) {
        setError(t("oracle.alerts.recipientInvalidEmail"));
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
      "h-10 rounded-xl bg-white/70 ring-1 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20 transition-all duration-200";
    if (error) {
      return `${baseClass} ring-red-500 focus-visible:ring-red-500/20`;
    }
    if (isSuccess) {
      return `${baseClass} ring-green-500 focus-visible:ring-green-500/20`;
    }
    return `${baseClass} ring-black/5`;
  }, [error, isSuccess]);

  const characterCountColor = useMemo(() => {
    const percentage = (localValue.length / MAX_LENGTH) * 100;
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-orange-500";
    return "text-gray-400";
  }, [localValue.length]);

  return (
    <div className="md:col-span-12">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {t("oracle.alerts.recipient")}
          </div>
          {retryCount > 0 && (
            <div className="text-xs text-orange-500 animate-pulse">
              {t("oracle.alerts.retryAttempt")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSuccess && (
            <div
              className="text-xs text-green-600 font-medium flex items-center gap-1 animate-fade-in"
              role="status"
              aria-live="polite"
            >
              <CheckIcon className="w-3 h-3" />
              {t("oracle.alerts.saved")}
            </div>
          )}
          <div className={`text-xs ${characterCountColor}`} aria-hidden="true">
            {localValue.length}/{MAX_LENGTH}
          </div>
        </div>
      </div>

      {isUpdating ? (
        <div
          className="h-10 rounded-xl bg-gray-100 animate-pulse"
          aria-hidden="true"
        />
      ) : (
        <Input
          value={localValue}
          onChange={handleChange}
          placeholder={t("oracle.alerts.recipientPlaceholder")}
          maxLength={MAX_LENGTH}
          aria-invalid={!!error}
          aria-describedby={error ? "recipient-error" : "recipient-hint"}
          aria-label={t("oracle.alerts.recipient")}
          className={inputClassName}
        />
      )}

      <div id="recipient-hint" className="sr-only">
        {t("oracle.alerts.recipientHint")}
      </div>

      {error && (
        <div
          id="recipient-error"
          className="text-red-500 text-sm mt-1 flex items-center gap-1 animate-fade-in"
          role="alert"
          aria-live="assertive"
        >
          <ErrorIcon className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
