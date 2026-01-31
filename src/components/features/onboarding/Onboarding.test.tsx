import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Onboarding } from './Onboarding';
import { HelpTooltip } from '@/components/features/common/HelpTooltip';
import { FeatureCallout } from '@/components/features/common/FeatureCallout';
import { AlertCircle } from 'lucide-react';
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

    expect(screen.getByText('Welcome to OracleMonitor')).toBeInTheDocument();
    expect(screen.getByText(/OracleMonitor is your gateway to Universal Oracle monitoring/)).toBeInTheDocument();
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
    expect(screen.getByText('Assertion Creation')).toBeInTheDocument();
    expect(screen.getByText(/Create and track assertions/)).toBeInTheDocument();
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
    expect(localStorage.getItem('insight-onboarding-completed')).toBe('true');
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
    expect(localStorage.getItem('insight-onboarding-completed')).toBe('true');
  });

  it('should not render if onboarding is already completed', () => {
    // Set onboarding as completed in localStorage
    localStorage.setItem('insight-onboarding-completed', 'true');

    render(
      <LanguageProvider initialLang="en">
        <Onboarding />
      </LanguageProvider>,
    );

    // Check if onboarding is not rendered
    expect(screen.queryByText('Welcome to OracleMonitor')).not.toBeInTheDocument();
  });
});

describe('HelpTooltip Component', () => {
  it('should display tooltip on hover', () => {
    render(
      <HelpTooltip content="This is a tooltip">
        <button>Hover me</button>
      </HelpTooltip>,
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

  it('should display tooltip with title', () => {
    render(
      <HelpTooltip content="This is a tooltip" title="Tooltip Title">
        <button>Hover me</button>
      </HelpTooltip>,
    );

    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);

    expect(screen.getByText('Tooltip Title')).toBeInTheDocument();
    expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
  });
});

describe('FeatureCallout Component', () => {
  it('should render feature callout with title and description', () => {
    render(
      <FeatureCallout
        title="Feature Title"
        description="Feature description text"
        icon={<AlertCircle />}
      />,
    );

    expect(screen.getByText('Feature Title')).toBeInTheDocument();
    expect(screen.getByText('Feature description text')).toBeInTheDocument();
  });
});
