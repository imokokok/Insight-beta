import { useEffect, type RefObject } from 'react';

const focusableSelector =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function useModalBehavior(
  isOpen: boolean,
  onClose: () => void,
  dialogRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusDialog = () => {
      const dialog = dialogRef?.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (focusable.length > 0) {
        focusable[0]?.focus();
        return;
      }
      dialog.focus();
    };

    requestAnimationFrame(focusDialog);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const dialog = dialogRef?.current;
        if (!dialog) return;

        const focusable = getFocusableElements(dialog);
        if (focusable.length === 0) {
          e.preventDefault();
          focusDialog();
          return;
        }

        const active = document.activeElement as HTMLElement | null;
        const first = focusable[0] ?? document.body;
        const last = focusable[focusable.length - 1] ?? document.body;

        if (!active || !dialog.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }

        if (e.shiftKey) {
          if (active === first) {
            e.preventDefault();
            last.focus();
          }
          return;
        }

        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused) previouslyFocused.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);
}
