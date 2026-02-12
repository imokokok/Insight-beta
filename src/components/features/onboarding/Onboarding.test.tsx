import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding, STORAGE_KEY } from './Onboarding';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { LANG_STORAGE_KEY } from '@/i18n/translations';

vi.mock('@/shared/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
  getStorageItem: vi.fn(async () => null),
  setStorageItem: vi.fn(async () => {}),
  removeStorageItem: vi.fn(async () => {}),
}));

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

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  mockLocalStorage.clear();
  localStorage.setItem(LANG_STORAGE_KEY, 'en');
  vi.clearAllMocks();
});

describe('Onboarding Component', () => {
  it('should render welcome screen by default', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Welcome to OracleMonitor')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should have continue button', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Continue as General User')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should show role selection on initial load', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Select your role to get started')).toBeInTheDocument();
        expect(screen.getByText('Developer')).toBeInTheDocument();
        expect(screen.getByText('Protocol Team')).toBeInTheDocument();
        expect(screen.getByText('General User')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should select role and show role-specific steps', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Developer')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    await waitFor(
      () => {
        expect(screen.getByText('API Integration')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should navigate through steps', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Developer')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    await waitFor(
      () => {
        expect(screen.getByText('API Integration')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const nextButton = screen.getByText('Next');
    await userEvent.click(nextButton);

    await waitFor(
      () => {
        expect(screen.getByText('Quick Integration')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should skip onboarding', async () => {
    const { setStorageItem } = await import('@/shared/utils');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Skip Tour')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const skipButtons = screen.getAllByText('Skip Tour');
    if (skipButtons[0]) {
      await userEvent.click(skipButtons[0]);
    }

    await waitFor(
      () => {
        expect(setStorageItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
      },
      { timeout: 3000 },
    );
  });

  it('should complete onboarding', async () => {
    const { setStorageItem } = await import('@/shared/utils');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Developer')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    await waitFor(
      () => {
        expect(screen.getByText('API Integration')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    for (let i = 0; i < 2; i++) {
      const nextButton = screen.getByText('Next');
      await userEvent.click(nextButton);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const completeButton = screen.getByText('Complete');
    await userEvent.click(completeButton);

    await waitFor(
      () => {
        expect(setStorageItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
      },
      { timeout: 3000 },
    );
  });

  it('should show onboarding when forceOpen is true', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding forceOpen />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Welcome to OracleMonitor')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it('should have skip button with aria-label', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        const skipButtons = screen.getAllByRole('button', { name: 'Skip Tour' });
        expect(skipButtons.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });
});
