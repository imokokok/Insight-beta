'use client';

import React, { useState, useCallback } from 'react';

import { Eye, EyeOff, ChevronDown, Check, X, Search } from 'lucide-react';

import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

import { Input } from './input';
import { Label } from './label';

/**
 * 移动端优化的输入框
 */
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      clearable,
      onClear,
      className,
      containerClassName,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isMobile = useIsMobile();

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <Label className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </Label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            type={inputType}
            className={cn(
              'transition-all',
              icon && 'pl-10',
              (clearable || type === 'password') && 'pr-10',
              error && 'border-red-500 focus-visible:ring-red-500',
              isMobile && 'h-12 text-base', // 移动端增大触摸区域
              className
            )}
            {...props}
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {clearable && props.value && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
MobileInput.displayName = 'MobileInput';

/**
 * 移动端搜索输入框
 */
interface MobileSearchInputProps extends Omit<MobileInputProps, 'icon' | 'type'> {
  onSearch?: (value: string) => void;
  loading?: boolean;
}

export function MobileSearchInput({
  onSearch,
  loading,
  className,
  ...props
}: MobileSearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(e.currentTarget.value);
    }
  };

  return (
    <div className="relative">
      <MobileInput
        type="search"
        icon={<Search className="h-4 w-4" />}
        className={cn('pr-10', className)}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
        </div>
      )}
    </div>
  );
}

/**
 * 移动端选择器
 */
interface MobileSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function MobileSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '请选择',
  error,
  disabled,
  className,
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
        </Label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-left text-sm transition-all',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0',
            error && 'border-red-500',
            disabled && 'cursor-not-allowed bg-gray-50 text-gray-400'
          )}
        >
          <span className={cn(!selectedOption && 'text-gray-400')}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                    value === option.value
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-50',
                    option.disabled && 'cursor-not-allowed text-gray-400'
                  )}
                >
                  {option.label}
                  {value === option.value && (
                    <Check className="h-4 w-4 text-purple-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * 移动端标签输入
 */
interface MobileTagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  error?: string;
  className?: string;
}

export function MobileTagInput({
  label,
  tags,
  onChange,
  placeholder = '添加标签...',
  maxTags = 10,
  error,
  className,
}: MobileTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onChange([...tags, trimmed]);
      setInputValue('');
    }
  }, [inputValue, tags, maxTags, onChange]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      const lastTag = tags[tags.length - 1];
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          <span className="ml-1 text-xs text-gray-400">
            ({tags.length}/{maxTags})
          </span>
        </Label>
      )}
      <div
        className={cn(
          'flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2',
          error && 'border-red-500'
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-purple-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * 移动端滑块
 */
interface MobileSliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  className?: string;
}

export function MobileSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  showValue = true,
  className,
}: MobileSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        {label && <Label className="text-sm font-medium text-gray-700">{label}</Label>}
        {showValue && (
          <span className="text-sm font-medium text-purple-700">
            {value}
            {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600"
          style={{
            background: `linear-gradient(to right, #8b5cf6 ${percentage}%, #e5e7eb ${percentage}%)`,
          }}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>
            {min}
            {unit}
          </span>
          <span>
            {max}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 移动端开关
 */
interface MobileSwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function MobileSwitch({
  label,
  checked,
  onChange,
  disabled,
  className,
}: MobileSwitchProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {label && <span className="text-sm text-gray-700">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-purple-600' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  );
}

/**
 * 移动端表单分组
 */
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-base font-semibold text-gray-800">{title}</h3>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * 移动端表单操作栏
 */
interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function FormActions({
  children,
  className,
  sticky = false,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4',
        sticky && 'sticky bottom-0 border-t border-gray-100 bg-white/95 py-4 backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}
