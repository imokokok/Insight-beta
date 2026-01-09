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
}

interface ToastContextType {
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, duration };
      
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
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
