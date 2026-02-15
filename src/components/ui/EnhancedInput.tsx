/**
 * Enhanced Input Component
 *
 * 增强版输入框组件 - 支持验证反馈、清除按钮、密码可见性切换、搜索建议
 */

'use client';

import * as React from 'react';
import { useState, useRef, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import { cn } from '@/shared/utils';

// ==================== 验证状态类型 ====================

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidationResult {
  state: ValidationState;
  message?: string;
}

// ==================== 增强版 Input 组件 ====================

export interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  validation?: (value: string) => ValidationResult | Promise<ValidationResult>;
  debounceMs?: number;
  clearable?: boolean;
  showValidationIcon?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (result: ValidationResult) => void;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      validation,
      debounceMs = 300,
      clearable = true,
      showValidationIcon = true,
      containerClassName,
      labelClassName,
      inputClassName,
      className,
      onChange,
      onValidationChange,
      disabled,
      value,
      defaultValue,
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState((defaultValue as string) || '');
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [validationMessage, setValidationMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? (value as string) : internalValue;
    const isPassword = type === 'password';

    // Validation handler
    const validate = useCallback(
      async (val: string) => {
        if (!validation) return;

        setValidationState('validating');
        try {
          const result = await validation(val);
          setValidationState(result.state);
          setValidationMessage(result.message || '');
          onValidationChange?.(result);
        } catch {
          setValidationState('invalid');
          setValidationMessage('common.validationFailed');
          onValidationChange?.({ state: 'invalid', message: 'common.validationFailed' });
        }
      },
      [validation, onValidationChange],
    );

    // Debounced validation
    const debouncedValidate = useCallback(
      (val: string) => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
          validate(val);
        }, debounceMs);
      },
      [validate, debounceMs],
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);

      if (validation) {
        debouncedValidate(newValue);
      }
    };

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue('');
      }
      onChange?.('');
      setValidationState('idle');
      setValidationMessage('');
    };

    // Validation icon
    const ValidationIcon = () => {
      switch (validationState) {
        case 'validating':
          return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
        case 'valid':
          return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        case 'invalid':
          return <AlertCircle className="h-4 w-4 text-rose-500" />;
        default:
          return null;
      }
    };

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={cn('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            className={cn(
              'mb-1.5 block text-sm font-medium transition-colors',
              validationState === 'invalid'
                ? 'text-rose-600'
                : isFocused
                  ? 'text-blue-600'
                  : 'text-gray-700',
              labelClassName,
            )}
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <motion.div
            className={cn(
              'relative flex items-center overflow-hidden rounded-lg border-2 bg-white transition-all duration-200',
              validationState === 'invalid'
                ? 'border-rose-300 shadow-sm shadow-rose-100'
                : validationState === 'valid'
                  ? 'border-emerald-300 shadow-sm shadow-emerald-100'
                  : isFocused
                    ? 'border-blue-400 shadow-md shadow-blue-100'
                    : 'border-gray-200 hover:border-gray-300',
              disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
            )}
            animate={{
              scale: isFocused ? 1.005 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {/* Search Icon */}
            {type === 'search' && (
              <div className="pointer-events-none absolute left-3 flex items-center">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {/* Input */}
            <input
              type={inputType}
              className={cn(
                'w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400',
                type === 'search' && 'pl-10',
                (clearable || showValidationIcon || isPassword) && 'pr-10',
                inputClassName,
                className,
              )}
              ref={ref}
              value={currentValue}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              {...props}
            />

            {/* Right Actions */}
            <div className="absolute right-2 flex items-center gap-1">
              {/* Clear Button */}
              {clearable && currentValue && !disabled && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClear}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              )}

              {/* Password Toggle */}
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {/* Validation Icon */}
              {showValidationIcon && validation && (
                <div className="flex h-6 w-6 items-center justify-center">
                  <ValidationIcon />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Helper/Error Text */}
        <AnimatePresence mode="wait">
          {(validationMessage || errorMessage || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={cn(
                'mt-1.5 flex items-center gap-1.5 text-xs',
                validationState === 'invalid' || errorMessage
                  ? 'text-rose-600'
                  : validationState === 'valid'
                    ? 'text-emerald-600'
                    : 'text-gray-500',
              )}
            >
              {validationState === 'invalid' && <AlertCircle className="h-3 w-3" />}
              {validationState === 'valid' && <CheckCircle className="h-3 w-3" />}
              <span>{errorMessage || validationMessage || helperText}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
EnhancedInput.displayName = 'EnhancedInput';

export { EnhancedInput, type ValidationResult, type ValidationState };
