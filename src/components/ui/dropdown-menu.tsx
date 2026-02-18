'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu compound components must be used within a DropdownMenu');
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { setOpen, open } = useDropdownMenuContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => setOpen(!open),
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button type="button" className={cn('', className)} onClick={() => setOpen(!open)}>
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  onCloseAutoFocus?: boolean;
}

function DropdownMenuContent({
  children,
  className,
  align = 'end',
  onCloseAutoFocus = true,
}: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownMenuContext();

  if (!open) return null;

  return (
    <div
      className={cn(
        'bg-popover text-popover-foreground absolute z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 text-left shadow-md',
        align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        className,
      )}
      onClick={() => {
        if (onCloseAutoFocus) {
          setOpen(false);
        }
      }}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

function DropdownMenuItem({ className, inset, ...props }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} />;
}

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
      {...props}
    />
  );
}

interface DropdownMenuCheckboxItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function DropdownMenuCheckboxItem({
  className,
  checked = false,
  onCheckedChange,
  children,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn(
        'focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
};
