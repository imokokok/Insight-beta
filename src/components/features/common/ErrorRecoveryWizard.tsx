import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Activity, BarChart2, ChevronRight, ExternalLink, HelpCircle, X } from 'lucide-react';

export interface ErrorContext {
  errorId: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  check?: () => boolean | Promise<boolean>;
  nextStep?: string;
}

export interface ErrorRecoveryWorkflow {
  errorKind: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  steps: ErrorStep[];
  automaticRecovery?: boolean;
  estimatedTime?: string;
  documentationUrl?: string;
  videoTutorialUrl?: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByKind: Record<string, number>;
  errorsByHour: Record<string, number>;
  averageResolutionTime: number;
  topErrors: Array<{ kind: string; count: number; lastOccurrence: number }>;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ErrorInsight {
  type: 'tip' | 'warning' | 'insight';
  title: string;
  description: string;
  action?: string;
}

class ErrorRecoveryManager {
  private workflows: Map<string, ErrorRecoveryWorkflow> = new Map();
  private errorHistory: Array<{ context: ErrorContext; error: unknown; timestamp: number }> = [];
  private maxHistorySize = 100;

  constructor() {
    this.initializeWorkflows();
  }

  private initializeWorkflows(): void {
    const workflows: ErrorRecoveryWorkflow[] = [
      {
        errorKind: 'WALLET_NOT_FOUND',
        title: 'Wallet Not Detected',
        description: 'No cryptocurrency wallet was found in your browser. You need to install a wallet to interact with the blockchain.',
        severity: 'error',
        estimatedTime: '5-10 minutes',
        documentationUrl: 'https://docs.insight.oracle/getting-started/wallet-setup',
        steps: [
          {
            id: 'step1',
            title: 'Choose a Wallet',
            description: 'Select a wallet that supports your browser and network. MetaMask is recommended for most users.',
            action: 'Choose MetaMask, Rabby, or Coinbase Wallet',
          },
          {
            id: 'step2',
            title: 'Install the Wallet',
            description: 'Download and install the wallet extension from the official website.',
            action: 'Visit metamask.io/download',
          },
          {
            id: 'step3',
            title: 'Create or Import Wallet',
            description: 'Set up a new wallet or import an existing one using your seed phrase.',
            action: 'Follow wallet setup instructions',
          },
          {
            id: 'step4',
            title: 'Refresh the Page',
            description: 'After installation, refresh this page to detect the new wallet.',
            action: 'Click refresh or press F5',
          },
        ],
      },
      {
        errorKind: 'WRONG_NETWORK',
        title: 'Incorrect Network',
        description: 'You are connected to the wrong blockchain network. Please switch to a supported network.',
        severity: 'warning',
        estimatedTime: '1-2 minutes',
        documentationUrl: 'https://docs.insight.oracle/troubleshooting/network-issues',
        steps: [
          {
            id: 'step1',
            title: 'Open Wallet Network Selector',
            description: 'Click on the network dropdown in your wallet extension (usually top right corner).',
            action: 'Click network dropdown',
          },
          {
            id: 'step2',
            title: 'Select Correct Network',
            description: 'Choose the network required by Insight (Polygon, Arbitrum, or Optimism).',
            action: 'Select Polygon, Arbitrum, or Optimism',
          },
          {
            id: 'step3',
            title: 'Confirm Switch',
            description: 'Confirm the network switch in your wallet if prompted.',
            action: 'Confirm in wallet popup',
          },
        ],
      },
      {
        errorKind: 'INSUFFICIENT_FUNDS',
        title: 'Insufficient Balance',
        description: 'You don\'t have enough funds to complete this transaction. You need more native tokens for gas fees.',
        severity: 'error',
        estimatedTime: '5-15 minutes',
        documentationUrl: 'https://docs.insight.oracle/troubleshooting/insufficient-funds',
        steps: [
          {
            id: 'step1',
            title: 'Check Current Balance',
            description: 'Open your wallet and check your balance for the current network.',
            action: 'Check wallet balance',
          },
          {
            id: 'step2',
            title: 'Get Native Tokens',
            description: 'Bridge tokens to the target network or use a faucet for testnets.',
            action: 'Bridge tokens or use faucet',
          },
          {
            id: 'step3',
            title: 'Ensure Minimum Balance',
            description: 'Keep at least 0.01-0.05 ETH (or equivalent) for gas fees.',
            action: 'Maintain minimum balance',
          },
        ],
      },
      {
        errorKind: 'USER_REJECTED',
        title: 'Transaction Rejected',
        description: 'You rejected the transaction in your wallet. You can retry once you\'re ready.',
        severity: 'info',
        estimatedTime: '1 minute',
        steps: [
          {
            id: 'step1',
            title: 'Review Transaction',
            description: 'Check the transaction details in the wallet popup before confirming.',
            action: 'Review transaction details',
          },
          {
            id: 'step2',
            title: 'Confirm Transaction',
            description: 'Click "Confirm" or "Sign" to proceed with the transaction.',
            action: 'Confirm in wallet',
          },
        ],
      },
      {
        errorKind: 'NETWORK_ERROR',
        title: 'Connection Error',
        description: 'Unable to connect to the blockchain network. This could be a temporary network issue.',
        severity: 'warning',
        estimatedTime: '2-5 minutes',
        documentationUrl: 'https://docs.insight.oracle/troubleshooting/connection-issues',
        steps: [
          {
            id: 'step1',
            title: 'Check Internet Connection',
            description: 'Ensure you have a stable internet connection.',
            action: 'Test internet connectivity',
          },
          {
            id: 'step2',
            title: 'Try Different RPC',
            description: 'The RPC endpoint might be temporarily unavailable. Try again later or switch networks.',
            action: 'Wait and retry',
          },
          {
            id: 'step3',
            title: 'Clear Browser Cache',
            description: 'Clear your browser cache and cookies, then refresh.',
            action: 'Clear cache and refresh',
          },
        ],
      },
      {
        errorKind: 'TRANSACTION_FAILED',
        title: 'Transaction Failed',
        description: 'The transaction failed to execute. This could be due to various reasons including contract state or timing.',
        severity: 'error',
        estimatedTime: '5-10 minutes',
        documentationUrl: 'https://docs.insight.oracle/troubleshooting/transaction-failed',
        steps: [
          {
            id: 'step1',
            title: 'Check Contract State',
            description: 'Verify the contract state and whether all preconditions are met.',
            action: 'Review transaction requirements',
          },
          {
            id: 'step2',
            title: 'Wait and Retry',
            description: 'Some failures are temporary. Wait a few minutes and try again.',
            action: 'Wait 2-3 minutes',
          },
          {
            id: 'step3',
            title: 'Contact Support',
            description: 'If the issue persists, contact the support team with the transaction hash.',
            action: 'Open support ticket',
          },
        ],
      },
      {
        errorKind: 'CONTRACT_NOT_FOUND',
        title: 'Contract Not Found',
        description: 'The smart contract address is invalid or not deployed on this network.',
        severity: 'critical',
        estimatedTime: 'Contact support',
        documentationUrl: 'https://docs.insight.oracle/troubleshooting/contract-not-found',
        steps: [
          {
            id: 'step1',
            title: 'Verify Network',
            description: 'Ensure you are on the correct network where the contract is deployed.',
            action: 'Check network selection',
          },
          {
            id: 'step2',
            title: 'Check Contract Address',
            description: 'Verify the contract address is correct and valid.',
            action: 'Verify address format',
          },
          {
            id: 'step3',
            title: 'Contact Development Team',
            description: 'If the issue persists, the contract may need to be redeployed.',
            action: 'Contact developers',
          },
        ],
      },
      {
        errorKind: 'TIMEOUT',
        title: 'Request Timeout',
        description: 'The request took too long to complete. The server may be overloaded or experiencing issues.',
        severity: 'warning',
        estimatedTime: '2-5 minutes',
        steps: [
          {
            id: 'step1',
            title: 'Wait and Retry',
            description: 'The issue might be temporary. Wait a moment and try again.',
            action: 'Wait 1-2 minutes',
          },
          {
            id: 'step2',
            title: 'Refresh Page',
            description: 'Refresh the page to establish a new connection.',
            action: 'Refresh page',
          },
          {
            id: 'step3',
            title: 'Try Later',
            description: 'If the issue persists, the server might be under high load. Try again later.',
            action: 'Come back later',
          },
        ],
      },
    ];

    workflows.forEach((workflow) => {
      this.workflows.set(workflow.errorKind, workflow);
    });
  }

  getWorkflow(errorKind: string): ErrorRecoveryWorkflow | undefined {
    return this.workflows.get(errorKind);
  }

  getAllWorkflows(): ErrorRecoveryWorkflow[] {
    return Array.from(this.workflows.values());
  }

  logError(error: unknown, context: ErrorContext): string {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.errorHistory.push({
      context: { ...context, errorId },
      error,
      timestamp: Date.now(),
    });

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    return errorId;
  }

  getErrorHistory(): Array<{ context: ErrorContext; error: unknown; timestamp: number }> {
    return [...this.errorHistory];
  }

  getStatistics(): ErrorStatistics {
    const errorsByKind: Record<string, number> = {};
    const errorsByHour: Record<string, number> = {};
    let totalErrors = 0;

    this.errorHistory.forEach((entry) => {
      totalErrors++;
      
      const errorDetail = this.normalizeError(entry.error);
      errorsByKind[errorDetail.kind] = (errorsByKind[errorDetail.kind] || 0) + 1;

      const hour = new Date(entry.timestamp).toISOString().slice(0, 13);
      errorsByHour[hour] = (errorsByHour[hour] || 0) + 1;
    });

    const topErrors = Object.entries(errorsByKind)
      .map(([kind, count]) => ({
        kind,
        count,
        lastOccurrence: this.getLastOccurrence(kind),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const trend = this.calculateTrend(errorsByHour);

    return {
      totalErrors,
      errorsByKind,
      errorsByHour,
      averageResolutionTime: 0,
      topErrors,
      trend,
    };
  }

  private normalizeError(error: unknown): { kind: string } {
    if (error && typeof error === 'object' && 'kind' in error) {
      return { kind: (error as { kind: string }).kind };
    }
    return { kind: 'UNKNOWN' };
  }

  private getLastOccurrence(kind: string): number {
    const recent = this.errorHistory
      .filter((e) => this.normalizeError(e.error).kind === kind)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return recent[0]?.timestamp || 0;
  }

  private calculateTrend(errorsByHour: Record<string, number>): 'increasing' | 'stable' | 'decreasing' {
    const hours = Object.keys(errorsByHour).sort();
    if (hours.length < 2) return 'stable';

    const recentHours = hours.slice(-6);
    const olderHours = hours.slice(-12, -6);

    if (olderHours.length === 0) return 'stable';

    const recentAvg = recentHours.reduce((sum, h) => sum + (errorsByHour[h] || 0), 0) / recentHours.length;
    const olderAvg = olderHours.reduce((sum, h) => sum + (errorsByHour[h] || 0), 0) / olderHours.length;

    if (olderAvg === 0) return 'stable';
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  generateInsights(): ErrorInsight[] {
    const insights: ErrorInsight[] = [];
    const stats = this.getStatistics();

    if (stats.totalErrors > 10) {
      const topKind = stats.topErrors[0];
      if (topKind) {
        insights.push({
          type: 'warning',
          title: 'High Error Frequency',
          description: `We've noticed ${topKind.count} occurrences of "${topKind.kind}" errors recently. Consider reviewing the recovery steps.`,
          action: 'View recovery guide',
        });
      }
    }

    if (stats.trend === 'increasing') {
      insights.push({
        type: 'warning',
        title: 'Error Trend Increasing',
        description: 'Error frequency is trending upward. This might indicate a systemic issue.',
        action: 'Check system status',
      });
    }

    insights.push({
      type: 'tip',
      title: 'Pro Tip',
      description: 'Most errors can be resolved by checking your network connection and wallet settings first.',
    });

    return insights;
  }
}

export const errorRecoveryManager = new ErrorRecoveryManager();

interface ErrorRecoveryWizardProps {
  error: unknown;
  onClose: () => void;
  onContactSupport?: () => void;
  onWatchTutorial?: () => void;
}

export function ErrorRecoveryWizard({ error, onClose, onContactSupport, onWatchTutorial: _onWatchTutorial }: ErrorRecoveryWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [allCompleted, setAllCompleted] = useState(false);

  const errorDetail = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { normalizeWalletError } = require('@/lib/errors/walletErrors');
    return normalizeWalletError(error);
  }, [error]);

  const workflow = useMemo(() => {
    return errorRecoveryManager.getWorkflow(errorDetail.kind);
  }, [errorDetail.kind]);

  const insights = useMemo(() => {
    return errorRecoveryManager.generateInsights();
  }, []);

  const handleStepComplete = useCallback(async (stepId: string) => {
    setIsChecking(true);
    
    const workflow = errorRecoveryManager.getWorkflow(errorDetail.kind);
    const step = workflow?.steps.find(s => s.id === stepId);
    
    if (step?.check) {
      const passed = await step.check();
      if (passed) {
        setCompletedSteps(prev => new Set([...prev, stepId]));
      }
    } else {
      setCompletedSteps(prev => new Set([...prev, stepId]));
    }
    
    setIsChecking(false);
  }, [errorDetail.kind]);

  const handleNext = useCallback(() => {
    if (currentStep < (workflow?.steps.length || 0) - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setAllCompleted(true);
    }
  }, [currentStep, workflow]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleRetry = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setAllCompleted(false);
  }, []);

  if (!workflow) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold">Unknown Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{errorDetail.userMessage}</p>
          <p className="text-sm text-gray-500 mb-6">{errorDetail.recoveryAction}</p>
          <div className="flex gap-3">
            {onContactSupport && (
              <button onClick={onContactSupport} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg">
                Contact Support
              </button>
            )}
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${
                workflow.severity === 'critical' ? 'bg-red-100' :
                workflow.severity === 'error' ? 'bg-red-50' :
                workflow.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
              }`}>
                <Activity className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{workflow.title}</h2>
                <p className="text-sm text-gray-500">{workflow.estimatedTime} • {workflow.steps.length} steps</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600">{workflow.description}</p>

          {workflow.documentationUrl && (
            <a
              href={workflow.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 mt-3"
            >
              <ExternalLink className="h-4 w-4" />
              View Documentation
            </a>
          )}
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Progress</span>
          </div>
          <div className="flex gap-1">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  index < currentStep ? 'bg-green-500' :
                  index === currentStep ? 'bg-purple-500' :
                  completedSteps.has(step.id) ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {allCompleted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recovery Steps Completed!</h3>
              <p className="text-gray-600 mb-6">You've completed all the recovery steps. Try the operation again.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleRetry} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Start Over
                </button>
                <button onClick={onClose} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>Step {currentStep + 1} of {workflow.steps.length}</span>
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-medium text-gray-700">{workflow.steps[currentStep]?.title || 'Current Step'}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {workflow.steps[currentStep]?.title || 'Current Step'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {workflow.steps[currentStep]?.description || ''}
                </p>
                {workflow.steps[currentStep]?.action && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700 font-medium">
                      💡 {workflow.steps[currentStep]?.action || ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex-1" />
                {workflow.steps[currentStep]?.check && (
                  <button
                    onClick={() => handleStepComplete(workflow.steps[currentStep]?.id || '')}
                    disabled={isChecking || completedSteps.has(workflow.steps[currentStep]?.id || '')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      completedSteps.has(workflow.steps[currentStep]?.id || '')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isChecking ? 'Checking...' :
                     completedSteps.has(workflow.steps[currentStep]?.id || '') ? '✓ Completed' : 'Check Status'}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {currentStep === workflow.steps.length - 1 ? 'Complete' : 'Next'}
                </button>
              </div>
            </>
          )}
        </div>

        {insights.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">💡 Insights</h4>
            <div className="space-y-2">
              {insights.slice(0, 2).map((insight, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    insight.type === 'warning' ? 'bg-amber-50 text-amber-800' :
                    insight.type === 'tip' ? 'bg-blue-50 text-blue-800' :
                    'bg-green-50 text-green-800'
                  }`}
                >
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                  {insight.action && (
                    <button className="text-xs font-medium mt-2 underline">
                      {insight.action}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ErrorDashboardProps {
  onErrorClick?: (errorKind: string) => void;
}

export function ErrorDashboard({ onErrorClick }: ErrorDashboardProps) {
  const stats = useMemo(() => errorRecoveryManager.getStatistics(), []);
  const workflows = useMemo(() => errorRecoveryManager.getAllWorkflows(), []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Error Analytics</h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          stats.trend === 'increasing' ? 'bg-red-100 text-red-700' :
          stats.trend === 'decreasing' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          <Activity className="h-4 w-4" />
          {stats.trend === 'increasing' ? 'Trending Up' :
           stats.trend === 'decreasing' ? 'Trending Down' : 'Stable'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Total Errors (24h)</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalErrors}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Unique Error Types</p>
          <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.errorsByKind).length}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-medium text-gray-700">Top Errors</h4>
        {stats.topErrors.map(({ kind, count }) => {
          const workflow = errorRecoveryManager.getWorkflow(kind);
          return (
            <div
              key={kind}
              onClick={() => onErrorClick?.(kind)}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {workflow && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(workflow.severity)}`}>
                    {workflow.severity}
                  </span>
                )}
                <span className="text-sm text-gray-700">{kind.replace(/_/g, ' ')}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{count}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Quick Actions</h4>
        {workflows.slice(0, 3).map((workflow) => (
          <a
            key={workflow.errorKind}
            href={`#recover-${workflow.errorKind}`}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">{workflow.title}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </a>
        ))}
      </div>
    </div>
  );
}
