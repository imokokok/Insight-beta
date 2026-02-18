'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseFullscreenOptions {
  onClose?: () => void;
  escapeKey?: boolean;
}

interface UseFullscreenReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isBrowserFullscreen: boolean;
  enterBrowserFullscreen: () => void;
  exitBrowserFullscreen: () => void;
  toggleBrowserFullscreen: () => void;
}

export function useFullscreen(options: UseFullscreenOptions = {}): UseFullscreenReturn {
  const { onClose, escapeKey = true } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        onClose?.();
      }
      return !prev;
    });
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !escapeKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, escapeKey, close]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterBrowserFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, []);

  const exitBrowserFullscreen = useCallback(async () => {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  const toggleBrowserFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await exitBrowserFullscreen();
    } else {
      await enterBrowserFullscreen();
    }
  }, [enterBrowserFullscreen, exitBrowserFullscreen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    isBrowserFullscreen,
    enterBrowserFullscreen,
    exitBrowserFullscreen,
    toggleBrowserFullscreen,
  };
}
