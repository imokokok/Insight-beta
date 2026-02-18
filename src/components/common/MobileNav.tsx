'use client';

import React, { useState, useCallback } from 'react';

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
  const { toggle } = useMobileNav();

  return (
    <Button variant="ghost" size="icon" className={cn('lg:hidden', className)} onClick={toggle}>
      <Menu className="h-5 w-5" />
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={close}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-[280px] bg-card shadow-xl lg:hidden',
              'flex flex-col',
            )}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-lg font-bold text-foreground">菜单</span>
              <button
                onClick={close}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
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
