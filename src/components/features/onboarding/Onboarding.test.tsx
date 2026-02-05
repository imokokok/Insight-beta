import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Onboarding } from './Onboarding';
import { Tooltip } from '@/components/features/common/Tooltip';
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

  it('should display next step when Next button is clicked', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Click Continue as General User first
    const continueButton = screen.getByText('Continue as General User');
    fireEvent.click(continueButton);

    // Now click next button
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    // Check if we're on the next step
    expect(screen.getByText('Assertion Tracking')).toBeInTheDocument();
    expect(screen.getByText(/Track oracle assertions/)).toBeInTheDocument();
  });

  it('should complete onboarding when Get Started is clicked', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Click Continue as General User first
    const continueButton = screen.getByText('Continue as General User');
    fireEvent.click(continueButton);

    // Click next button twice to get to the last step
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Click Get Started
    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);

    // Check if onboarding is completed in localStorage
    expect(localStorage.getItem('oracle-monitor-onboarding-completed')).toBe('true');
  });

  it('should skip onboarding when Skip Tour is clicked', () => {
    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Click Skip Tour
    const skipButton = screen.getByText('Skip Tour');
    fireEvent.click(skipButton);

    // Check if onboarding is completed in localStorage
    expect(localStorage.getItem('oracle-monitor-onboarding-completed')).toBe('true');
  });

  it('should not render if onboarding is already completed', () => {
    // Set onboarding as completed in localStorage
    localStorage.setItem('oracle-monitor-onboarding-completed', 'true');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Check if onboarding is not rendered
    expect(screen.queryByText('Welcome to OracleMonitor')).not.toBeInTheDocument();
  });
});

describe('Tooltip Component', () => {
  it('should display tooltip on hover', () => {
    render(
      <Tooltip content="This is a tooltip">
        <button>Hover me</button>
      </Tooltip>,
    );

    const button = screen.getByText('Hover me');

    // Check tooltip is not visible initially
    expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();

    // Hover over button
    fireEvent.mouseEnter(button);

    // Check tooltip is now visible
    expect(screen.getByText('This is a tooltip')).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(button);

    // Check tooltip is hidden
    expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
  });

  it('should display tooltip with info theme', () => {
    render(
      <Tooltip content="This is a tooltip" theme="info">
        <button>Hover me</button>
      </Tooltip>,
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
  });
});
