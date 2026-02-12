import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const colors = {
  primary: {
    DEFAULT: 'var(--primary)',
    foreground: 'var(--primary-foreground)',
    light: 'var(--primary-light)',
    dark: 'var(--primary-dark)',
    darker: 'var(--primary-darker)',
    darkest: 'var(--primary-darkest)',
    lightest: 'var(--primary-lightest)',
  },
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  card: {
    DEFAULT: 'var(--card)',
    foreground: 'var(--card-foreground)',
  },
  popover: {
    DEFAULT: 'var(--popover)',
    foreground: 'var(--popover-foreground)',
  },
  secondary: {
    DEFAULT: 'var(--secondary)',
    foreground: 'var(--secondary-foreground)',
  },
  muted: {
    DEFAULT: 'var(--muted)',
    foreground: 'var(--muted-foreground)',
  },
  accent: {
    DEFAULT: 'var(--accent)',
    foreground: 'var(--accent-foreground)',
  },
  destructive: {
    DEFAULT: 'var(--destructive)',
    foreground: 'var(--destructive-foreground)',
  },
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
  success: {
    DEFAULT: 'var(--success)',
    light: 'var(--success-light)',
    dark: 'var(--success-dark)',
  },
  warning: {
    DEFAULT: 'var(--warning)',
    light: 'var(--warning-light)',
    dark: 'var(--warning-dark)',
  },
  error: {
    DEFAULT: 'var(--error)',
    light: 'var(--error-light)',
    dark: 'var(--error-dark)',
  },
  info: {
    DEFAULT: 'var(--info)',
    light: 'var(--info-light)',
    dark: 'var(--info-dark)',
  },
} as const;

export type ColorKeys = keyof typeof colors;
