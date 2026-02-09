/**
 * ============================================================================
 * Icon Interaction Hook
 * ============================================================================
 *
 * 提供完整的图标交互功能：
 * - 悬停效果 (缩放、旋转、颜色变化)
 * - 点击反馈 (涟漪、弹跳)
 * - 状态动画 (加载、成功、错误)
 * - 无障碍支持
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type IconAnimation =
  | 'none'
  | 'pulse'
  | 'bounce'
  | 'spin'
  | 'shake'
  | 'heartbeat'
  | 'flash'
  | 'float'
  | 'wobble'
  | 'flip';

export type IconInteractionState =
  | 'idle'
  | 'hover'
  | 'active'
  | 'loading'
  | 'success'
  | 'error'
  | 'disabled';

export interface IconInteractionOptions {
  /** 是否启用悬停效果 */
  enableHover?: boolean;
  /** 是否启用点击效果 */
  enableClick?: boolean;
  /** 是否启用涟漪效果 */
  enableRipple?: boolean;
  /** 悬停时的缩放比例 */
  hoverScale?: number;
  /** 悬停时的旋转角度 */
  hoverRotate?: number;
  /** 点击时的缩放比例 */
  activeScale?: number;
  /** 动画持续时间 (ms) */
  duration?: number;
  /** 成功状态持续时间 (ms) */
  successDuration?: number;
  /** 错误状态持续时间 (ms) */
  errorDuration?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义动画 */
  customAnimation?: IconAnimation;
  /** 颜色变化 */
  colorTransition?: boolean;
}

export interface IconInteractionReturn {
  /** 当前状态 */
  state: IconInteractionState;
  /** 是否正在动画 */
  isAnimating: boolean;
  /** 涟漪效果配置 */
  ripple: {
    show: boolean;
    x: number;
    y: number;
  };
  /** 事件处理器 */
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onClick: (e: React.MouseEvent) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  /** 样式配置 */
  styles: {
    transform: string;
    transition: string;
    cursor: string;
    opacity: number;
  };
  /** 状态控制 */
  setLoading: (loading: boolean) => void;
  setSuccess: () => void;
  setError: () => void;
  reset: () => void;
}

const defaultOptions: Required<IconInteractionOptions> = {
  enableHover: true,
  enableClick: true,
  enableRipple: true,
  hoverScale: 1.15,
  hoverRotate: 0,
  activeScale: 0.9,
  duration: 200,
  successDuration: 1500,
  errorDuration: 1500,
  disabled: false,
  customAnimation: 'none',
  colorTransition: true,
};

export function useIconInteraction(options: IconInteractionOptions = {}): IconInteractionReturn {
  const opts = { ...defaultOptions, ...options };

  const [state, setState] = useState<IconInteractionState>(opts.disabled ? 'disabled' : 'idle');
  const [isAnimating, setIsAnimating] = useState(false);
  const [ripple, setRipple] = useState({ show: false, x: 0, y: 0 });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
    };
  }, []);

  // 更新禁用状态
  useEffect(() => {
    setState(opts.disabled ? 'disabled' : 'idle');
  }, [opts.disabled]);

  const handleMouseEnter = useCallback(() => {
    if (opts.disabled || state === 'loading') return;
    setState('hover');
  }, [opts.disabled, state]);

  const handleMouseLeave = useCallback(() => {
    if (opts.disabled || state === 'loading') return;
    setState('idle');
  }, [opts.disabled, state]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (opts.disabled || state === 'loading') return;

      setState('active');

      // 涟漪效果
      if (opts.enableRipple) {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setRipple({ show: true, x, y });

        if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
        rippleTimeoutRef.current = setTimeout(() => {
          setRipple({ show: false, x: 0, y: 0 });
        }, 600);
      }
    },
    [opts.disabled, opts.enableRipple, state],
  );

  const handleMouseUp = useCallback(() => {
    if (opts.disabled || state === 'loading') return;
    setState('hover');
  }, [opts.disabled, state]);

  const handleClick = useCallback(
    (_e: React.MouseEvent) => {
      if (opts.disabled || state === 'loading') return;

      // 触发自定义动画
      if (opts.customAnimation !== 'none') {
        setIsAnimating(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setIsAnimating(false);
        }, opts.duration);
      }
    },
    [opts.customAnimation, opts.disabled, opts.duration, state],
  );

  const handleFocus = useCallback(() => {
    if (opts.disabled || state === 'loading') return;
    setState('hover');
  }, [opts.disabled, state]);

  const handleBlur = useCallback(() => {
    if (opts.disabled || state === 'loading') return;
    setState('idle');
  }, [opts.disabled, state]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (opts.disabled || state === 'loading') return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setState('active');
        setTimeout(() => setState('hover'), 150);
      }
    },
    [opts.disabled, state],
  );

  // 状态控制方法
  const setLoading = useCallback((loading: boolean) => {
    setState(loading ? 'loading' : 'idle');
  }, []);

  const setSuccess = useCallback(() => {
    setState('success');
    setIsAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState('idle');
      setIsAnimating(false);
    }, opts.successDuration);
  }, [opts.successDuration]);

  const setError = useCallback(() => {
    setState('error');
    setIsAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState('idle');
      setIsAnimating(false);
    }, opts.errorDuration);
  }, [opts.errorDuration]);

  const reset = useCallback(() => {
    setState(opts.disabled ? 'disabled' : 'idle');
    setIsAnimating(false);
    setRipple({ show: false, x: 0, y: 0 });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (rippleTimeoutRef.current) clearTimeout(rippleTimeoutRef.current);
  }, [opts.disabled]);

  // 计算样式
  const getTransform = useCallback(() => {
    const transforms: string[] = [];

    if (state === 'hover' && opts.enableHover) {
      if (opts.hoverScale !== 1) transforms.push(`scale(${opts.hoverScale})`);
      if (opts.hoverRotate !== 0) transforms.push(`rotate(${opts.hoverRotate}deg)`);
    }

    if (state === 'active' && opts.enableClick) {
      transforms.push(`scale(${opts.activeScale})`);
    }

    // 自定义动画
    if (isAnimating && opts.customAnimation !== 'none') {
      switch (opts.customAnimation) {
        case 'spin':
          transforms.push('rotate(360deg)');
          break;
        case 'flip':
          transforms.push('rotateY(360deg)');
          break;
        case 'bounce':
          transforms.push('translateY(-5px)');
          break;
      }
    }

    return transforms.join(' ') || 'none';
  }, [state, isAnimating, opts]);

  const styles = {
    transform: getTransform(),
    transition: `all ${opts.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    cursor: opts.disabled ? 'not-allowed' : 'pointer',
    opacity: opts.disabled ? 0.5 : 1,
  };

  return {
    state,
    isAnimating,
    ripple,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onClick: handleClick,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    },
    styles,
    setLoading,
    setSuccess,
    setError,
    reset,
  };
}

export default useIconInteraction;
