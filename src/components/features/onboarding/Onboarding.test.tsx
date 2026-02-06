import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Onboarding } from './Onboarding';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { LANG_STORAGE_KEY } from '@/i18n/translations';

// Mock localStorage
const mockLocalStorage = {
  storage: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.storage[key] = value;
  }),
  clear: vi.fn(() => {
    mockLocalStorage.storage = {};
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.storage[key];
  }),
  key: vi.fn(),
  length: 0,
};

// Apply the mock
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  mockLocalStorage.clear();
  localStorage.setItem(LANG_STORAGE_KEY, 'en');
});

describe('Onboarding Component', () => {
  it('should render welcome screen by default', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Welcome to OracleMonitor');
    expect(screen.getByText(/Your universal oracle monitoring platform/)).toBeInTheDocument();
  });

  it('should have continue button', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Check for Continue button
    expect(screen.getByText('Continue as General User')).toBeInTheDocument();
  });
});
