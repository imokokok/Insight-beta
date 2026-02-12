/**
 * Accessibility Provider Component
 *
 * 无障碍支持组件 - 提供减少动画、高对比度、字体大小等无障碍功能
 */

'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Type, Contrast, Volume2, MousePointer2, X, Check, Accessibility } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils';

// ==================== 无障碍设置类型 ====================

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  focusVisible: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => void;
  toggleSetting: (key: keyof AccessibilitySettings) => void;
  resetSettings: () => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReaderOptimized: false,
  focusVisible: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

// ==================== 无障碍 Provider ====================

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 从 localStorage 加载设置
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        console.error('Failed to parse accessibility settings');
      }
    }

    // 检测系统偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    if (prefersReducedMotion || prefersHighContrast) {
      setSettings((prev) => ({
        ...prev,
        reduceMotion: prefersReducedMotion,
        highContrast: prefersHighContrast,
      }));
    }

    setIsInitialized(true);
  }, []);

  // 保存设置到 localStorage
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings, isInitialized]);

  // 应用设置到文档
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;

    // 减少动画
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // 高对比度
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 大字体
    if (settings.largeText) {
      root.classList.add('large-text');
      root.style.fontSize = '120%';
    } else {
      root.classList.remove('large-text');
      root.style.fontSize = '';
    }

    // 焦点可见性
    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  }, [settings, isInitialized]);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleSetting = useCallback((key: keyof AccessibilitySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        updateSetting,
        toggleSetting,
        resetSettings,
        isPanelOpen,
        setIsPanelOpen,
      }}
    >
      {children}
      <AccessibilityPanel />
      <AccessibilityStyles />
    </AccessibilityContext.Provider>
  );
}

// ==================== 使用无障碍 Hook ====================

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// ==================== 无障碍控制面板 ====================

function AccessibilityPanel() {
  const {
    reduceMotion,
    highContrast,
    largeText,
    screenReaderOptimized,
    focusVisible,
    toggleSetting,
    resetSettings,
    isPanelOpen,
    setIsPanelOpen,
  } = useAccessibility();

  const settings = [
    {
      key: 'reduceMotion' as const,
      label: '减少动画',
      description: '减少或禁用页面动画效果',
      icon: Eye,
      value: reduceMotion,
    },
    {
      key: 'highContrast' as const,
      label: '高对比度',
      description: '增强文字和背景的对比度',
      icon: Contrast,
      value: highContrast,
    },
    {
      key: 'largeText' as const,
      label: '大字体',
      description: '增大页面文字尺寸',
      icon: Type,
      value: largeText,
    },
    {
      key: 'focusVisible' as const,
      label: '焦点指示器',
      description: '始终显示焦点轮廓',
      icon: MousePointer2,
      value: focusVisible,
    },
    {
      key: 'screenReaderOptimized' as const,
      label: '屏幕阅读器优化',
      description: '优化屏幕阅读器体验',
      icon: Volume2,
      value: screenReaderOptimized,
    },
  ];

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsPanelOpen(true)}
        className="focus:ring-primary300 fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-4"
        aria-label="打开无障碍设置"
      >
        <Accessibility className="h-6 w-6" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 z-50 bg-black/30"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-auto bg-white shadow-2xl"
              role="dialog"
              aria-label="无障碍设置面板"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Accessibility className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">无障碍设置</h2>
                    <p className="text-xs text-gray-500">自定义您的浏览体验</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="关闭面板"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Settings */}
              <div className="p-6">
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <motion.button
                      key={setting.key}
                      onClick={() => toggleSetting(setting.key)}
                      className={cn(
                        'flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
                        setting.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                          setting.value ? 'bg-primary/50 text-white' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        <setting.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{setting.label}</h3>
                          {setting.value && <Check className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Reset */}
                <div className="mt-8 border-t pt-6">
                  <Button variant="outline" onClick={resetSettings} className="w-full">
                    重置所有设置
                  </Button>
                </div>

                {/* Tips */}
                <div className="mt-6 rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-blue-900">快捷键提示</h4>
                  <ul className="space-y-1 text-sm text-blue-700">
                    <li>• Tab: 在可聚焦元素间移动</li>
                    <li>• Enter/Space: 激活按钮或链接</li>
                    <li>• Escape: 关闭弹窗或菜单</li>
                    <li>• Shift + ?: 显示快捷键帮助</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ==================== 无障碍样式 ====================

function AccessibilityStyles() {
  return (
    <style jsx global>{`
      /* 减少动画 */
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      /* 高对比度 */
      .high-contrast {
        --tw-text-opacity: 1 !important;
        --tw-bg-opacity: 1 !important;
      }

      .high-contrast * {
        border-color: #000 !important;
      }

      .high-contrast button,
      .high-contrast a {
        outline: 2px solid transparent;
        outline-offset: 2px;
      }

      .high-contrast button:focus,
      .high-contrast a:focus {
        outline: 3px solid #000 !important;
        outline-offset: 2px !important;
      }

      /* 焦点可见性 */
      .focus-visible *:focus {
        outline: 3px solid #8b5cf6 !important;
        outline-offset: 2px !important;
      }

      .focus-visible *:focus:not(:focus-visible) {
        outline: none !important;
      }

      .focus-visible *:focus-visible {
        outline: 3px solid #8b5cf6 !important;
        outline-offset: 2px !important;
      }

      /* 大字体 */
      .large-text {
        line-height: 1.6;
      }

      .large-text h1 {
        font-size: 2.5rem;
      }

      .large-text h2 {
        font-size: 2rem;
      }

      .large-text h3 {
        font-size: 1.75rem;
      }

      .large-text p,
      .large-text span,
      .large-text a,
      .large-text button {
        font-size: 1.125rem;
      }

      /* 屏幕阅读器专用 */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      .sr-only-focusable:active,
      .sr-only-focusable:focus {
        position: static;
        width: auto;
        height: auto;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }

      /* 跳过链接 */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        z-index: 100;
      }

      .skip-link:focus {
        top: 0;
      }
    `}</style>
  );
}

// ==================== 跳过导航链接 ====================

export function SkipLink({ href = '#main-content' }: { href?: string }) {
  return (
    <a href={href} className="skip-link">
      跳转到主要内容
    </a>
  );
}

// ==================== 焦点陷阱组件 ====================

interface FocusTrapProps {
  children: ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
      }

      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);

  return <>{children}</>;
}

// ==================== 实时区域组件（屏幕阅读器）====================

interface LiveRegionProps {
  children: ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  className,
}: LiveRegionProps) {
  return (
    <div aria-live={politeness} aria-atomic={atomic} className={cn('sr-only', className)}>
      {children}
    </div>
  );
}

// ==================== 无障碍按钮 ====================

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  description?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function AccessibleButton({
  label,
  description,
  isLoading,
  loadingText = '加载中...',
  children,
  'aria-label': ariaLabel,
  ...props
}: AccessibleButtonProps) {
  return (
    <button
      aria-label={ariaLabel || label}
      aria-describedby={description ? `${props.id}-desc` : undefined}
      aria-busy={isLoading}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">{loadingText}</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
      {description && (
        <span id={`${props.id}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </button>
  );
}

// ==================== 图片无障碍组件 ====================

interface AccessibleImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  decorative?: boolean;
}

export function AccessibleImage({ alt, decorative, ...props }: AccessibleImageProps) {
  return (
    <img {...props} alt={decorative ? '' : alt} role={decorative ? 'presentation' : undefined} />
  );
}
