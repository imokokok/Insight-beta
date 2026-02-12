/**
 * Enhanced Input Component
 *
 * 增强版输入框组件 - 支持验证反馈、清除按钮、密码可见性切换、搜索建议
 */

'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';

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
          setValidationMessage('验证失败');
          onValidationChange?.({ state: 'invalid', message: '验证失败' });
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

// ==================== 搜索输入框（带建议）====================

interface SearchSuggestion {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SearchInputProps extends Omit<EnhancedInputProps, 'onChange' | 'onSelect'> {
  suggestions?: SearchSuggestion[];
  onSearch?: (value: string) => void;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  onChange?: (value: string) => void;
  loading?: boolean;
  emptyMessage?: string;
  maxSuggestions?: number;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      suggestions = [],
      onSearch,
      onSelectSuggestion,
      onChange,
      loading,
      emptyMessage = '无搜索结果',
      maxSuggestions = 5,
      ...props
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [searchValue, setSearchValue] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredSuggestions = suggestions
      .filter(
        (s) =>
          s.label.toLowerCase().includes(searchValue.toLowerCase()) ||
          s.value.toLowerCase().includes(searchValue.toLowerCase()),
      )
      .slice(0, maxSuggestions);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion: SearchSuggestion) => {
      setSearchValue(suggestion.label);
      onSelectSuggestion?.(suggestion);
      onChange?.(suggestion.value);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
            handleSelect(filteredSuggestions[highlightedIndex]);
          } else {
            onSearch?.(searchValue);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    const handleChange = (value: string) => {
      setSearchValue(value);
      onChange?.(value);
      setIsOpen(true);
      setHighlightedIndex(-1);
    };

    return (
      <div ref={containerRef} className="relative">
        <EnhancedInput
          ref={ref}
          type="search"
          value={searchValue}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          {...props}
        />

        <AnimatePresence>
          {isOpen && (filteredSuggestions.length > 0 || loading) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : filteredSuggestions.length > 0 ? (
                <ul className="max-h-60 overflow-auto py-1">
                  {filteredSuggestions.map((suggestion, index) => (
                    <li
                      key={suggestion.id}
                      onClick={() => handleSelect(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'cursor-pointer px-4 py-2.5 transition-colors',
                        highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {suggestion.icon && (
                          <span className="text-gray-400">{suggestion.icon}</span>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {suggestion.label}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-gray-500">{suggestion.description}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchValue ? (
                <div className="px-4 py-3 text-sm text-gray-500">{emptyMessage}</div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

// ==================== 文本域组件 ====================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      maxLength,
      showCharacterCount = true,
      containerClassName,
      labelClassName,
      textareaClassName,
      className,
      disabled,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [charCount, setCharCount] = useState(String(value || '').length);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className={cn('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            className={cn(
              'mb-1.5 block text-sm font-medium transition-colors',
              errorMessage || isOverLimit
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

        {/* Textarea Container */}
        <motion.div
          className={cn(
            'relative overflow-hidden rounded-lg border-2 bg-white transition-all duration-200',
            errorMessage || isOverLimit
              ? 'border-rose-300 shadow-sm shadow-rose-100'
              : isFocused
                ? 'border-blue-400 shadow-md shadow-blue-100'
                : 'border-gray-200 hover:border-gray-300',
            disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
          )}
          animate={{
            scale: isFocused ? 1.002 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <textarea
            className={cn(
              'w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400',
              textareaClassName,
              className,
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            {...props}
          />
        </motion.div>

        {/* Footer */}
        <div className="mt-1.5 flex items-center justify-between">
          {(errorMessage || helperText) && (
            <span
              className={cn(
                'text-xs',
                errorMessage || isOverLimit ? 'text-rose-600' : 'text-gray-500',
              )}
            >
              {errorMessage || helperText}
            </span>
          )}

          {showCharacterCount && maxLength && (
            <span
              className={cn('ml-auto text-xs', isOverLimit ? 'text-rose-600' : 'text-gray-400')}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);
EnhancedTextarea.displayName = 'EnhancedTextarea';

// ==================== 选择器组件 ====================

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface EnhancedSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: SelectOption) => void;
  disabled?: boolean;
  errorMessage?: string;
  helperText?: string;
  searchable?: boolean;
  clearable?: boolean;
  containerClassName?: string;
  className?: string;
}

const EnhancedSelect = React.forwardRef<HTMLDivElement, EnhancedSelectProps>(
  (
    {
      label,
      placeholder = '请选择...',
      options,
      value,
      defaultValue,
      onChange,
      disabled,
      errorMessage,
      helperText,
      searchable = false,
      clearable = false,
      containerClassName,
      className,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedValue, setSelectedValue] = useState(defaultValue || '');
    const containerRef = useRef<HTMLDivElement>(null);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : selectedValue;

    const selectedOption = options.find((o) => o.value === currentValue);

    const filteredOptions = searchable
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.description?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : options;

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;

      if (!isControlled) {
        setSelectedValue(option.value);
      }
      onChange?.(option.value, option);
      setIsOpen(false);
      setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isControlled) {
        setSelectedValue('');
      }
      onChange?.('', { value: '', label: '' });
    };

    return (
      <div ref={containerRef} className={cn('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            className={cn(
              'mb-1.5 block text-sm font-medium transition-colors',
              errorMessage ? 'text-rose-600' : isFocused ? 'text-blue-600' : 'text-gray-700',
            )}
          >
            {label}
          </label>
        )}

        {/* Select Trigger */}
        <motion.div
          ref={ref}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'relative flex cursor-pointer items-center justify-between rounded-lg border-2 bg-white px-3 py-2.5 transition-all duration-200',
            errorMessage
              ? 'border-rose-300 shadow-sm shadow-rose-100'
              : isFocused || isOpen
                ? 'border-blue-400 shadow-md shadow-blue-100'
                : 'border-gray-200 hover:border-gray-300',
            disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
            className,
          )}
          animate={{
            scale: isOpen ? 1.002 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.icon && <span className="text-gray-500">{selectedOption.icon}</span>}
            <span className={cn('text-sm', selectedOption ? 'text-gray-900' : 'text-gray-400')}>
              {selectedOption?.label || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {clearable && currentValue && (
              <button
                onClick={handleClear}
                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <motion.svg
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </div>
        </motion.div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {/* Search */}
              {searchable && (
                <div className="border-b border-gray-100 p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="w-full rounded-md border border-gray-200 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <ul className="max-h-60 overflow-auto py-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <li
                      key={option.value}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'cursor-pointer px-3 py-2.5 transition-colors',
                        option.disabled && 'cursor-not-allowed opacity-50',
                        option.value === currentValue
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50',
                        option.disabled && 'hover:bg-transparent',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon && (
                          <span
                            className={cn(
                              'text-gray-400',
                              option.value === currentValue && 'text-blue-500',
                            )}
                          >
                            {option.icon}
                          </span>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-xs text-gray-500">{option.description}</div>
                          )}
                        </div>
                        {option.value === currentValue && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-4 text-center text-sm text-gray-500">无匹配选项</li>
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper/Error Text */}
        {(errorMessage || helperText) && (
          <div className={cn('mt-1.5 text-xs', errorMessage ? 'text-rose-600' : 'text-gray-500')}>
            {errorMessage || helperText}
          </div>
        )}
      </div>
    );
  },
);
EnhancedSelect.displayName = 'EnhancedSelect';

export {
  EnhancedInput,
  SearchInput,
  EnhancedTextarea,
  EnhancedSelect,
  type ValidationResult,
  type ValidationState,
  type SearchSuggestion,
  type SelectOption,
};
