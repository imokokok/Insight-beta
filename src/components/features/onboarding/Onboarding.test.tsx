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

vi.mock('@/i18n/LanguageProvider', () => ({
  LanguageProvider: ({ children, initialLang }: { children: React.ReactNode; initialLang: string }) => (
    <div>{children}</div>
  ),
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'onboarding.title': 'Welcome to OracleMonitor',
        'onboarding.subtitle': 'Your universal oracle monitoring platform',
        'onboarding.selectRole': 'Select your role to get started',
        'onboarding.roles.developer.title': 'Developer',
        'onboarding.roles.developer.description': 'Build applications using oracle data',
        'onboarding.roles.protocol.title': 'Protocol Team',
        'onboarding.roles.protocol.description': 'Manage oracle integration and node operations',
        'onboarding.roles.general.title': 'General User',
        'onboarding.roles.general.description': 'Monitor and analyze oracle data',
        'onboarding.skipTour': 'Skip Tour',
        'onboarding.continueAsGeneral': 'Continue as General User',
        'onboarding.steps.developer.api.title': 'API Integration',
        'onboarding.steps.developer.api.description': 'Learn how to integrate our oracle API',
        'onboarding.steps.developer.integration.title': 'Quick Integration',
        'onboarding.steps.developer.integration.description': 'Use our SDK to integrate',
        'onboarding.steps.developer.monitoring.title': 'Real-time Monitoring',
        'onboarding.steps.developer.monitoring.description': 'Track oracle performance',
        'onboarding.steps.protocol.monitoring.title': 'Oracle Monitoring',
        'onboarding.steps.protocol.disputes.title': 'Dispute Management',
        'onboarding.steps.protocol.alerts.title': 'Smart Alerts',
        'onboarding.steps.general.exploration.title': 'Data Exploration',
        'onboarding.steps.general.comparison.title': 'Protocol Comparison',
        'onboarding.steps.general.alerts.title': 'Price Alerts',
        'onboarding.button.next': 'Next',
        'onboarding.button.back': 'Back',
        'onboarding.button.complete': 'Complete',
        'onboarding.stepOf': 'Step {{current}} of {{total}}',
      };
      return translations[key] || key;
    },
  }),
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
        expect(screen.getAllByText('Welcome to OracleMonitor').length).toBeGreaterThan(0);
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
        expect(screen.getAllByText('Developer').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const developerRole = screen.getAllByText('Developer')[0];
    await userEvent.click(developerRole);

    await waitFor(
      () => {
        expect(screen.getAllByText('API Integration').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const nextButton = screen.getAllByText(/Next/i)[0];
    await userEvent.click(nextButton);

    await waitFor(
      () => {
        expect(screen.getAllByText('Quick Integration').length).toBeGreaterThan(0);
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

  it.skip('should complete onboarding', async () => {
    const { setStorageItem } = await import('@/shared/utils');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getAllByText('Developer').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const developerRole = screen.getAllByText('Developer')[0];
    await userEvent.click(developerRole);

    await waitFor(
      () => {
        expect(screen.getAllByText('API Integration').length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    for (let i = 0; i < 2; i++) {
      const nextButton = screen.getAllByText(/Next/i)[0];
      await userEvent.click(nextButton);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await waitFor(
      () => {
        const completeButtons = screen.getAllByText(/Complete/i);
        expect(completeButtons.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    const completeButton = screen.getAllByText(/Complete/i)[0];
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
        expect(screen.getAllByText('Welcome to OracleMonitor').length).toBeGreaterThan(0);
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
