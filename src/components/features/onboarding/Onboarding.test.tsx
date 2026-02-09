import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding, STORAGE_KEY, ROLE_STORAGE_KEY, PROGRESS_STORAGE_KEY } from './Onboarding';
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

    expect(screen.getByText('Continue as General User')).toBeInTheDocument();
  });

  it('should show role selection on initial load', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    expect(screen.getByText('Select your role to get started')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Protocol Team')).toBeInTheDocument();
    expect(screen.getByText('General User')).toBeInTheDocument();
  });

  it('should select role and show role-specific steps', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Click on Developer role
    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    // Should show developer-specific steps
    await waitFor(() => {
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });
    expect(screen.getByText(/Learn how to integrate our oracle API/)).toBeInTheDocument();
  });

  it('should navigate through steps', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Select General User role
    const generalUserRole = screen.getByText('General User');
    await userEvent.click(generalUserRole);

    // Wait for first step
    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });

    // Click next
    const nextButton = screen.getByText('Next');
    await userEvent.click(nextButton);

    // Should show second step
    await waitFor(() => {
      expect(screen.getByText('Protocol Comparison')).toBeInTheDocument();
    });
  });

  it('should go back to previous step', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Select General User role
    const generalUserRole = screen.getByText('General User');
    await userEvent.click(generalUserRole);

    // Navigate to second step
    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Protocol Comparison')).toBeInTheDocument();
    });

    // Click back button in content area (not header)
    const backButtons = screen.getAllByLabelText('Back');
    const contentBackButton = backButtons[backButtons.length - 1]!; // Get the last one (in content area)
    await userEvent.click(contentBackButton);

    // Should be back to first step
    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });
  });

  it('should go back to role selection from first step', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Select Developer role
    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    // Wait for first step
    await waitFor(() => {
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });

    // Click back button in header
    const backButton = screen.getByLabelText('Back');
    await userEvent.click(backButton);

    // Should show role selection again
    await waitFor(() => {
      expect(screen.getByText('Select your role to get started')).toBeInTheDocument();
    });
  });

  it('should skip onboarding', async () => {
    const onSkip = vi.fn();
    render(
      <LanguageProvider initialLang="en">
        <Onboarding onSkip={onSkip} />
      </LanguageProvider>,
    );

    const skipButton = screen.getByText('Skip Tour');
    await userEvent.click(skipButton);

    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
    expect(onSkip).toHaveBeenCalled();
  });

  it('should complete onboarding on last step', async () => {
    const onComplete = vi.fn();
    render(
      <LanguageProvider initialLang="en">
        <Onboarding onComplete={onComplete} />
      </LanguageProvider>,
    );

    // Select General User role
    const generalUserRole = screen.getByText('General User');
    await userEvent.click(generalUserRole);

    // Navigate through all steps
    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Protocol Comparison')).toBeInTheDocument();
    });

    // Step 2 -> Step 3
    await userEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Price Alerts')).toBeInTheDocument();
    });

    // Complete onboarding
    await userEvent.click(screen.getByText('Get Started'));

    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, 'true');
    expect(localStorage.removeItem).toHaveBeenCalledWith(PROGRESS_STORAGE_KEY);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should save selected role to localStorage', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    expect(localStorage.setItem).toHaveBeenCalledWith(ROLE_STORAGE_KEY, 'developer');
  });

  it('should restore saved role on reopen', async () => {
    // Pre-set a role and progress
    localStorage.setItem(ROLE_STORAGE_KEY, 'protocol');
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        currentStep: 0,
        selectedRole: 'protocol',
        showRoleSelection: false,
        timestamp: Date.now(),
      }),
    );

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Should skip role selection and show protocol steps
    await waitFor(() => {
      expect(screen.getByText('Oracle Monitoring')).toBeInTheDocument();
    });
  });

  it('should restore progress on reopen', async () => {
    // Pre-set progress at step 1
    localStorage.setItem(ROLE_STORAGE_KEY, 'developer');
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        currentStep: 1,
        selectedRole: 'developer',
        showRoleSelection: false,
        timestamp: Date.now(),
      }),
    );

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Should show step 2 (index 1) - Quick Integration
    await waitFor(() => {
      expect(screen.getByText('Quick Integration')).toBeInTheDocument();
    });
  });

  it('should clear old progress after 7 days', async () => {
    // Pre-set old progress (8 days ago)
    localStorage.setItem(ROLE_STORAGE_KEY, 'developer');
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        currentStep: 1,
        selectedRole: 'developer',
        showRoleSelection: false,
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      }),
    );

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Should show role selection (old progress cleared)
    await waitFor(() => {
      expect(screen.getByText('Select your role to get started')).toBeInTheDocument();
    });
  });

  it('should save progress when navigating steps', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Select Developer role
    const developerRole = screen.getByText('Developer');
    await userEvent.click(developerRole);

    // Wait for first step and navigate
    await waitFor(() => {
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });

    // Click next to go to step 2
    await userEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Quick Integration')).toBeInTheDocument();
    });

    // Check that progress was saved
    expect(localStorage.setItem).toHaveBeenCalledWith(
      PROGRESS_STORAGE_KEY,
      expect.stringContaining('"currentStep":1'),
    );
  });

  it('should not show onboarding if already completed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    expect(screen.queryByText('Welcome to OracleMonitor')).not.toBeInTheDocument();
  });

  it('should show onboarding when forceOpen is true', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding forceOpen />
      </LanguageProvider>,
    );

    // Check for the dialog title specifically
    expect(
      screen.getByRole('heading', { level: 2, name: 'Welcome to OracleMonitor' }),
    ).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Select a role first
    const generalUserRole = screen.getByText('General User');
    await userEvent.click(generalUserRole);

    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });

    // Press ArrowRight to go next
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('Protocol Comparison')).toBeInTheDocument();
    });

    // Press ArrowLeft to go back
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByText('Data Exploration')).toBeInTheDocument();
    });
  });

  it('should close on Escape key', async () => {
    const onSkip = vi.fn();
    render(
      <LanguageProvider initialLang="en">
        <Onboarding onSkip={onSkip} />
      </LanguageProvider>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onSkip).toHaveBeenCalled();
  });

  it('should show step progress indicator', async () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    const generalUserRole = screen.getByText('General User');
    await userEvent.click(generalUserRole);

    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    });

    // Navigate to step 2
    await userEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
    });
  });
});

describe('Onboarding Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Dialog should have proper role
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');

    // Title should be present
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toHaveAttribute('id', 'onboarding-title');
  });

  it('should have accessible buttons', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Skip button should have aria-label
    const skipButton = screen.getByLabelText('Skip Tour');
    expect(skipButton).toBeInTheDocument();
  });
});
