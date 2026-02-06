'use client';

/* eslint-disable no-restricted-syntax */

import type { ReactNode } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipTheme = 'default' | 'info' | 'warning' | 'error' | 'success';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  theme?: TooltipTheme;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  children,
  content,
  position = 'top',
  theme = 'default',
  delay = 300,
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [positionState, setPositionState] = useState<TooltipPosition>(position);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!tooltipRef.current) return;

    const rect = tooltipRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current
      .querySelector('.tooltip-content')
      ?.getBoundingClientRect();

    if (!tooltipRect) return;

    const positions: TooltipPosition[] = ['top', 'bottom', 'left', 'right'];
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let bestPosition = position;

    for (const pos of positions) {
      let fits = true;

      switch (pos) {
        case 'top':
          fits = rect.top > tooltipRect.height + 10;
          break;
        case 'bottom':
          fits = viewport.height - rect.bottom > tooltipRect.height + 10;
          break;
        case 'left':
          fits = rect.left > tooltipRect.width + 10;
          break;
        case 'right':
          fits = viewport.width - rect.right > tooltipRect.width + 10;
          break;
      }

      if (fits) {
        bestPosition = pos;
        break;
      }
    }

    setPositionState(bestPosition);
  }, [position]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible && tooltipRef.current) {
        updatePosition();
      }
    };

    const handleScroll = () => {
      if (isVisible) {
        setIsVisible(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, updatePosition]);

  const showTooltip = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-current',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-current',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-current',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-current',
  };

  const themeClasses = {
    default: 'bg-gray-900 text-white border-gray-700',
    info: 'bg-blue-600 text-white border-blue-500',
    warning: 'bg-yellow-500 text-black border-yellow-400',
    error: 'bg-red-600 text-white border-red-500',
    success: 'bg-green-600 text-white border-green-500',
  };

  return (
    <div
      ref={tooltipRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && (
        <div
          className={cn(
            'tooltip-content absolute z-50 max-w-xs rounded-lg border px-3 py-2 text-sm shadow-xl',
            'animate-fade-in',
            positionClasses[positionState],
            themeClasses[theme],
          )}
          role="tooltip"
        >
          <div className="relative z-10">{content}</div>
          <div
            className={cn(
              'absolute h-0 w-0 border-4 border-transparent',
              arrowClasses[positionState],
            )}
          />
        </div>
      )}
    </div>
  );
}

interface ContextualHelpProps {
  children: ReactNode;
  helpId: string;
  title?: string;
  className?: string;
}

export function ContextualHelp({ children, helpId, title, className }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative inline-flex items-center gap-2', className)}>
      {children}

      <Tooltip content="Click for help" position="right">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Help"
        >
          <svg
            className="h-4 w-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </Tooltip>

      {isOpen && (
        <ContextualHelpPanel helpId={helpId} title={title} onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}

interface ContextualHelpPanelProps {
  helpId: string;
  title?: string;
  onClose: () => void;
  className?: string;
}

export function ContextualHelpPanel({
  helpId,
  title,
  onClose,
  className,
}: ContextualHelpPanelProps) {
  const helpContent = getHelpContent(helpId);

  return (
    <div
      className={cn(
        'dark:bg-dark-800 dark:border-dark-700 absolute z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-2xl',
        'animate-slide-down',
        className,
      )}
      style={{ top: '100%', right: 0, marginTop: '8px' }}
    >
      <div className="dark:border-dark-700 flex items-center justify-between border-b border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {title || helpContent?.title || 'Help'}
        </h3>
        <button
          onClick={onClose}
          className="dark:hover:bg-dark-700 rounded-lg p-1 transition-colors hover:bg-gray-100"
        >
          <svg
            className="h-4 w-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {helpContent ? (
          <>
            <p className="dark:text-dark-300 mb-4 text-sm text-gray-600">
              {helpContent.description}
            </p>

            {helpContent.examples && helpContent.examples.length > 0 && (
              <div className="mb-4">
                <h4 className="dark:text-dark-400 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Examples
                </h4>
                <ul className="space-y-2">
                  {helpContent.examples.map((example, index) => (
                    <li key={index} className="dark:text-dark-200 text-sm text-gray-700">
                      <code className="dark:bg-dark-700 rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                        {example}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {helpContent.tips && helpContent.tips.length > 0 && (
              <div className="mb-4">
                <h4 className="dark:text-dark-400 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tips
                </h4>
                <ul className="space-y-1">
                  {helpContent.tips.map((tip, index) => (
                    <li
                      key={index}
                      className="dark:text-dark-200 flex items-start gap-2 text-sm text-gray-700"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {helpContent.relatedTopics && helpContent.relatedTopics.length > 0 && (
              <div>
                <h4 className="dark:text-dark-400 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Related Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {helpContent.relatedTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="dark:bg-dark-700 dark:text-dark-300 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="dark:text-dark-400 text-sm text-gray-500">
            No help content available for this topic.
          </p>
        )}
      </div>

      <div className="dark:border-dark-700 dark:bg-dark-900 flex items-center justify-between rounded-b-xl border-t border-gray-200 bg-gray-50 p-3">
        <span className="dark:text-dark-400 text-xs text-gray-500">
          Press ? for keyboard shortcuts
        </span>
        <a href="/docs" className="text-xs text-primary-600 hover:underline dark:text-primary-400">
          View full documentation →
        </a>
      </div>
    </div>
  );
}

interface HelpContent {
  title: string;
  description: string;
  examples?: string[];
  tips?: string[];
  relatedTopics?: string[];
}

const helpContentDatabase: Record<string, HelpContent> = {
  'oracle-health-score': {
    title: 'Oracle Health Score',
    description:
      'The Health Score is a composite metric (0-100) that measures the overall reliability and performance of the oracle. Scores above 90 indicate excellent health, while scores below 60 suggest potential issues requiring attention.',
    examples: [
      'Health Score: 95 - Excellent performance',
      'Health Score: 72 - Minor issues detected',
      'Health Score: 45 - Critical attention needed',
    ],
    tips: [
      'Check the individual metrics breakdown for specific issues',
      'Review recent disputes for accuracy concerns',
      'Monitor the trend over time for early warning signs',
    ],
    relatedTopics: ['assertion-accuracy', 'dispute-rate', 'uptime-metrics'],
  },
  'assertion-lifecycle': {
    title: 'Assertion Lifecycle',
    description:
      'An assertion goes through several stages: Created → Disputed (optional) → Resolved. Understanding this lifecycle helps you track the status and outcome of each data claim submitted to the oracle.',
    examples: [
      'New assertion submitted for BTC/USD price',
      'Assertion disputed due to price deviation',
      'Assertion resolved with incorrect vote outcome',
    ],
    tips: [
      'Assertions are typically resolved within 2-4 hours',
      'Disputed assertions require community voting',
      'Larger bonds increase the cost of disputing your assertion',
    ],
    relatedTopics: ['bond-amount', 'dispute-process', 'voting-mechanism'],
  },
  'dispute-resolution': {
    title: 'Dispute Resolution Process',
    description:
      "When an assertion is disputed, UMA's Data Verification Mechanism (DVM) enables token holders to vote on the correct outcome. The DVM is designed to be maximally decentralized and resistant to manipulation.",
    examples: [
      'Price disagreement leads to dispute',
      'Community votes on the correct price',
      'Winning side receives the bond',
    ],
    tips: [
      'Vote on disputes to earn rewards',
      'Review the evidence before voting',
      'Delegated voting is available for passive participants',
    ],
    relatedTopics: ['dvm-mechanism', 'voting-rewards', 'delegation'],
  },
  'bond-management': {
    title: 'Bond Management',
    description:
      'Bonds are required when submitting assertions. They serve as collateral that can be forfeited if your assertion is proven wrong. Higher bonds make it more expensive for others to dispute your claim.',
    examples: [
      'Submit assertion with 1000 USDC bond',
      'Disputer posts matching bond',
      "Losing side's bond is paid to the winner",
    ],
    tips: [
      'Larger bonds deter frivolous disputes',
      'Consider market conditions when setting bond size',
      'Bond economics are designed to incentivize accuracy',
    ],
    relatedTopics: ['assertion-costs', 'dispute-incentives', 'economic-security'],
  },
  'sync-status': {
    title: 'Sync Status',
    description:
      "The sync status indicates whether the oracle's on-chain data is current. An out-of-sync oracle may indicate network issues or backend problems requiring investigation.",
    examples: [
      'Synced - Data is current',
      'Syncing - Updating data',
      'Out of Sync - Data is stale',
    ],
    tips: [
      'Check your network connection if sync fails',
      'Recent block number should match the latest on-chain',
      'Contact support if issues persist',
    ],
    relatedTopics: ['network-health', 'blockchain-sync', 'data-latency'],
  },
  'prediction-analysis': {
    title: 'Prediction Analysis',
    description:
      'The predictive analytics engine analyzes historical patterns to forecast future oracle behavior. Predictions are probabilistic and should be used as one input in decision-making.',
    examples: [
      'High probability of accurate assertion predicted',
      'Potential volatility spike expected',
      'Trend indicates improving reliability',
    ],
    tips: [
      'Predictions become more accurate with more data',
      'Review confidence intervals before making decisions',
      'Use predictions as guidance, not guarantees',
    ],
    relatedTopics: ['anomaly-detection', 'trend-analysis', 'machine-learning'],
  },
};

function getHelpContent(helpId: string): HelpContent | null {
  return helpContentDatabase[helpId] || null;
}

export function HelpIcon({ helpId, className }: { helpId: string; className?: string }) {
  return (
    <ContextualHelp helpId={helpId} className={className}>
      <svg
        className="dark:hover:text-dark-300 h-4 w-4 cursor-help text-gray-400 hover:text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </ContextualHelp>
  );
}
