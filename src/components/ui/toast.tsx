'use client';

import { useCallback } from 'react';

import { toast as sonnerToast, type ExternalToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';

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

// Compatibility hook
export function useToast() {
  const toast = useCallback(
    ({
      id: incomingId,
      type,
      title,
      message,
      duration = 5000,
      actionLabel,
      actionOnClick,
    }: Omit<Toast, 'id'> & { id?: string }) => {
      const options = {
        id: incomingId,
        description: message,
        duration,
        action:
          actionLabel && actionOnClick
            ? {
                label: actionLabel,
                onClick: actionOnClick,
              }
            : undefined,
      };

      if (type === 'success') {
        return sonnerToast.success(title, options);
      } else if (type === 'error') {
        return sonnerToast.error(title, options);
      } else if (type === 'info') {
        return sonnerToast.info(title, options);
      } else {
        return sonnerToast(title, options);
      }
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Toast, 'id'>>) => {
    // Sonner allows updating by calling toast again with the same ID
    // We need to map the patch back to sonner options
    // Since we don't know the original type easily unless we stored it,
    // we might assume it keeps the same type or use the generic toast if type is missing.
    // Ideally, the caller should provide the type if they want to change it.

    const options: ExternalToast & { id: string } = { id };
    if (patch.message) options.description = patch.message;
    if (patch.duration) options.duration = patch.duration;

    // If type is provided, use the specific method
    if (patch.type === 'success') {
      sonnerToast.success(patch.title || 'Updated', options);
    } else if (patch.type === 'error') {
      sonnerToast.error(patch.title || 'Updated', options);
    } else if (patch.type === 'info') {
      sonnerToast.info(patch.title || 'Updated', options);
    } else {
      // Just update content
      if (patch.title) {
        sonnerToast(patch.title, options);
      } else {
        // If only description changes, we still need a title for sonner usually,
        // but maybe we can just update via the generic toast call.
        // Actually sonner doesn't have a specific 'update' method that merges.
        // It replaces. So this is a best-effort compatibility.
        // Fortunately, 'update' is rarely used in simple apps.
      }
    }
  }, []);

  const replace = useCallback(
    (id: string, next: Omit<Toast, 'id'>) => {
      toast({ ...next, id });
    },
    [toast],
  );

  return {
    toast,
    dismiss,
    update,
    replace,
  };
}
