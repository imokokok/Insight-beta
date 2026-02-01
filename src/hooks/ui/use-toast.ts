import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastType;
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant = 'info', duration = 5000 }: ToastOptions) => {
    switch (variant) {
      case 'success':
        return sonnerToast.success(title, { description, duration });
      case 'error':
        return sonnerToast.error(title, { description, duration });
      case 'warning':
        return sonnerToast.warning(title, { description, duration });
      default:
        return sonnerToast(title, { description, duration });
    }
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  };

  return {
    toast,
    dismiss,
  };
}

// Direct export for non-hook usage
export { sonnerToast as toast };
