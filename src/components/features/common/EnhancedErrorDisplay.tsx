'use client';

import { AlertCircle, ExternalLink, RefreshCw, Info, AlertTriangle, XCircle, LifeBuoy } from 'lucide-react';
import { type ReactNode } from 'react';
import { normalizeWalletError, type WalletErrorDetail } from '@/lib/errors/walletErrors';

interface EnhancedErrorDisplayProps {
  error: unknown;
  title?: string;
  showDetails?: boolean;
  onRetry?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

const severityConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-800',
  },
  critical: {
    icon: AlertCircle,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
};

const errorKindLabels: Record<string, string> = {
  WALLET_NOT_FOUND: 'Wallet Not Found',
  USER_REJECTED: 'User Rejected',
  REQUEST_PENDING: 'Request Pending',
  CHAIN_NOT_ADDED: 'Chain Not Added',
  WRONG_NETWORK: 'Wrong Network',
  INSUFFICIENT_FUNDS: 'Insufficient Funds',
  GAS_ESTIMATION_FAILED: 'Gas Estimation Failed',
  TRANSACTION_FAILED: 'Transaction Failed',
  CONTRACT_NOT_FOUND: 'Contract Not Found',
  NETWORK_ERROR: 'Network Error',
  TIMEOUT: 'Request Timeout',
  UNKNOWN: 'Unknown Error',
};

export function EnhancedErrorDisplay({
  error,
  title = 'Something went wrong',
  showDetails = false,
  onRetry,
  onContactSupport,
  className = '',
}: EnhancedErrorDisplayProps) {
  const errorDetail = normalizeWalletError(error);
  const config = severityConfig[errorDetail.severity];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-6 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-2 ${config.bgColor}`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}
            >
              {errorKindLabels[errorDetail.kind] || errorDetail.kind}
            </span>
          </div>

          <p className="text-gray-700 mb-3">{errorDetail.userMessage}</p>

          {errorDetail.recoveryAction && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-white/60 rounded-lg">
              <LifeBuoy className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Suggested Action</p>
                <p className="text-sm text-gray-600 mt-0.5">{errorDetail.recoveryAction}</p>
              </div>
            </div>
          )}

          {showDetails && errorDetail.rawMessage && (
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Technical Details
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 overflow-x-auto">
                {errorDetail.rawMessage}
                {errorDetail.code && `\nError Code: ${errorDetail.code}`}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200/50">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            )}

            {errorDetail.documentationLink && (
              <a
                href={errorDetail.documentationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Documentation
              </a>
            )}

            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LifeBuoy className="h-4 w-4" />
                Contact Support
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorRecoveryGuideProps {
  error: unknown;
}

export function ErrorRecoveryGuide({ error }: ErrorRecoveryGuideProps) {
  const errorDetail = normalizeWalletError(error);
  const config = severityConfig[errorDetail.severity];
  const Icon = config.icon;

  const quickFixes: Record<string, { title: string; steps: string[] }> = {
    WALLET_NOT_FOUND: {
      title: 'Install a Wallet',
      steps: [
        'Install MetaMask from metamask.io',
        'Or try Rabby wallet from rabby.io',
        'Refresh the page after installation',
        'Click "Connect Wallet" again',
      ],
    },
    WRONG_NETWORK: {
      title: 'Switch Network',
      steps: [
        'Look for network selector in your wallet (top right)',
        'Select the correct network (Polygon, Arbitrum, or Optimism)',
        'Confirm the switch if prompted',
        'Refresh the page',
      ],
    },
    INSUFFICIENT_FUNDS: {
      title: 'Add Funds',
      steps: [
        'Open your wallet and check your balance',
        'Bridge funds to the correct network if needed',
        'Ensure you have enough for gas fees + transaction amount',
        'Try the transaction again',
      ],
    },
    USER_REJECTED: {
      title: 'Retry Transaction',
      steps: [
        'Review the transaction details carefully',
        'Click "Confirm" or "Sign" in your wallet',
        'If you accidentally rejected, simply try again',
        'Make sure you have enough balance',
      ],
    },
  };

  const quickFix = quickFixes[errorDetail.kind];

  if (!quickFix) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <h4 className="font-medium text-gray-900">{quickFix.title}</h4>
      </div>
      <ol className="space-y-2">
        {quickFix.steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface TransactionErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: unknown;
  operationName: string;
  onRetry?: () => void;
}

export function TransactionErrorModal({
  isOpen,
  onClose,
  error,
  operationName,
  onRetry,
}: TransactionErrorModalProps) {
  if (!isOpen) return null;

  const errorDetail = normalizeWalletError(error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-red-100 p-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {operationName} Failed
            </h2>
            <p className="text-sm text-gray-500">{errorKindLabels[errorDetail.kind]}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-1">What happened?</p>
            <p className="text-sm text-gray-600">{errorDetail.userMessage}</p>
          </div>

          {errorDetail.recoveryAction && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">How to fix it</p>
              <p className="text-sm text-blue-700">{errorDetail.recoveryAction}</p>
            </div>
          )}

          <ErrorRecoveryGuide error={error} />
        </div>

        <div className="flex gap-3 mt-6">
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const errorDetail = normalizeWalletError(error);
  return errorDetail.userMessage;
}

export function getErrorRecoveryAction(error: unknown): string | undefined {
  const errorDetail = normalizeWalletError(error);
  return errorDetail.recoveryAction;
}

export function getErrorSeverity(error: unknown): 'info' | 'warning' | 'error' | 'critical' {
  const errorDetail = normalizeWalletError(error);
  return errorDetail.severity;
}
