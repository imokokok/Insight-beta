"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext =
  React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error(
      "DropdownMenu compound components must be used within a DropdownMenu",
    );
  }
  return context;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({
  children,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
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
}

function DropdownMenuTrigger({
  children,
  className,
}: DropdownMenuTriggerProps) {
  const { setOpen, open } = useDropdownMenuContext();

  return (
    <button
      type="button"
      className={cn("", className)}
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
}

function DropdownMenuContent({
  children,
  className,
  align = "end",
}: DropdownMenuContentProps) {
  const { open, setOpen } = useDropdownMenuContext();

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        align === "start"
          ? "left-0"
          : align === "end"
            ? "right-0"
            : "left-1/2 -translate-x-1/2",
        className,
      )}
      onClick={() => setOpen(false)}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean;
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
};
