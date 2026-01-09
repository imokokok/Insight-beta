"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  actionDisabled?: boolean;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionOnClick?: () => void;
  secondaryActionDisabled?: boolean;
}

interface ToastContextType {
  toast: (props: Omit<Toast, "id"> & { id?: string }) => string;
  update: (id: string, patch: Partial<Omit<Toast, "id">>) => void;
  replace: (id: string, next: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }, []);

  const replace = useCallback((id: string, next: Omit<Toast, "id">) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...next, id } : t))
    );
  }, []);

  const toast = useCallback(
    ({
      id: incomingId,
      type,
      title,
      message,
      duration = 5000,
      actionLabel,
      actionHref,
      actionOnClick,
      actionDisabled,
      secondaryActionLabel,
      secondaryActionHref,
      secondaryActionOnClick,
      secondaryActionDisabled
    }: Omit<Toast, "id"> & { id?: string }) => {
      const id = incomingId ?? Math.random().toString(36).substring(2, 9);
      const newToast = {
        id,
        type,
        title,
        message,
        duration,
        actionLabel,
        actionHref,
        actionOnClick,
        actionDisabled,
        secondaryActionLabel,
        secondaryActionHref,
        secondaryActionOnClick,
        secondaryActionDisabled
      };
      
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, update, replace, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-white p-4 shadow-lg transition-all animate-in slide-in-from-right-full",
              t.type === "success" && "border-emerald-200 bg-emerald-50",
              t.type === "error" && "border-rose-200 bg-rose-50",
              t.type === "info" && "border-blue-200 bg-blue-50"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />}
            {t.type === "error" && <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />}
            {t.type === "info" && <Info className="mt-0.5 h-5 w-5 text-blue-600" />}
            
            <div className="flex-1">
              <h4 className={cn("font-medium", 
                t.type === "success" && "text-emerald-900",
                t.type === "error" && "text-rose-900",
                t.type === "info" && "text-blue-900"
              )}>
                {t.title}
              </h4>
              {t.message && (
                <p className={cn("mt-1 text-sm",
                  t.type === "success" && "text-emerald-700",
                  t.type === "error" && "text-rose-700",
                  t.type === "info" && "text-blue-700"
                )}>
                  {t.message}
                </p>
              )}
              {(t.actionLabel || t.secondaryActionLabel) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.actionLabel && t.actionHref && (
                    <a
                      href={t.actionHref}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors",
                        t.type === "success" && "bg-emerald-100 text-emerald-900 ring-emerald-200 hover:bg-emerald-200",
                        t.type === "error" && "bg-rose-100 text-rose-900 ring-rose-200 hover:bg-rose-200",
                        t.type === "info" && "bg-blue-100 text-blue-900 ring-blue-200 hover:bg-blue-200"
                      )}
                    >
                      {t.actionLabel}
                    </a>
                  )}
                  {t.actionLabel && t.actionOnClick && (
                    <button
                      type="button"
                      onClick={t.actionOnClick}
                      disabled={t.actionDisabled}
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors",
                        t.type === "success" && "bg-emerald-100 text-emerald-900 ring-emerald-200 hover:bg-emerald-200",
                        t.type === "error" && "bg-rose-100 text-rose-900 ring-rose-200 hover:bg-rose-200",
                        t.type === "info" && "bg-blue-100 text-blue-900 ring-blue-200 hover:bg-blue-200"
                      )}
                    >
                      {t.actionLabel}
                    </button>
                  )}
                  {t.secondaryActionLabel && t.secondaryActionHref && (
                    <a
                      href={t.secondaryActionHref}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors",
                        t.type === "success" && "bg-emerald-100 text-emerald-900 ring-emerald-200 hover:bg-emerald-200",
                        t.type === "error" && "bg-rose-100 text-rose-900 ring-rose-200 hover:bg-rose-200",
                        t.type === "info" && "bg-blue-100 text-blue-900 ring-blue-200 hover:bg-blue-200"
                      )}
                    >
                      {t.secondaryActionLabel}
                    </a>
                  )}
                  {t.secondaryActionLabel && t.secondaryActionOnClick && (
                    <button
                      type="button"
                      onClick={t.secondaryActionOnClick}
                      disabled={t.secondaryActionDisabled}
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 transition-colors",
                        t.type === "success" && "bg-emerald-100 text-emerald-900 ring-emerald-200 hover:bg-emerald-200",
                        t.type === "error" && "bg-rose-100 text-rose-900 ring-rose-200 hover:bg-rose-200",
                        t.type === "info" && "bg-blue-100 text-blue-900 ring-blue-200 hover:bg-blue-200"
                      )}
                    >
                      {t.secondaryActionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
