'use client';

import React, { useState, useCallback, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils';

interface MobileNavContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileNavContext = React.createContext<MobileNavContextType | null>(null);

export function useMobileNav() {
  const context = React.useContext(MobileNavContext);
  if (!context) {
    throw new Error('useMobileNav must be used within MobileNavProvider');
  }
  return context;
}

interface MobileNavProviderProps {
  children: React.ReactNode;
}

export function MobileNavProvider({ children }: MobileNavProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <MobileNavContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </MobileNavContext.Provider>
  );
}

interface MobileMenuButtonProps {
  className?: string;
}

export function MobileMenuButton({ className }: MobileMenuButtonProps) {
  const { toggle, isOpen } = useMobileNav();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative lg:hidden', className)}
      onClick={toggle}
    >
      <motion.div animate={isOpen ? { rotate: 90 } : { rotate: 0 }} transition={{ duration: 0.2 }}>
        <Menu className="h-5 w-5" />
      </motion.div>
    </Button>
  );
}

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const { isOpen, close } = useMobileNav();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={close}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 320,
              mass: 0.8,
            }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-[290px] bg-card shadow-2xl lg:hidden',
              'flex flex-col',
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <span className="text-xl font-bold text-foreground">导航菜单</span>
              <button
                onClick={close}
                className="group rounded-full p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
              >
                <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={close}>
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
