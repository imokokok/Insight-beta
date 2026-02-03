'use client';

import {
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Info,
  AlertTriangle,
  XCircle,
  LifeBuoy,
} from 'lucide-react';
import { normalizeWalletError } from '@/lib/errors/walletErrors';

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

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeColor}`}
            >
              {errorKindLabels[errorDetail.kind] || errorDetail.kind}
            </span>
          </div>

          <p className="mb-3 text-gray-700">{errorDetail.userMessage}</p>

          {errorDetail.recoveryAction && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-white/60 p-3">
              <LifeBuoy className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Suggested Action</p>
                <p className="mt-0.5 text-sm text-gray-600">{errorDetail.recoveryAction}</p>
              </div>
            </div>
          )}

          {showDetails && errorDetail.rawMessage && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Technical Details
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
                {errorDetail.rawMessage}
                {errorDetail.code && `\nError Code: ${errorDetail.code}`}
              </pre>
            </details>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200/50 pt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:text-purple-800"
              >
                <ExternalLink className="h-4 w-4" />
                View Documentation
              </a>
            )}

            {onContactSupport && (
              <button
                onClick={onContactSupport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800"
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
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${config.iconColor}`} />
        <h4 className="font-medium text-gray-900">{quickFix.title}</h4>
      </div>
      <ol className="space-y-2">
        {quickFix.steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="animate-in fade-in zoom-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-4 flex items-center gap-3">
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
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm font-medium text-gray-900">What happened?</p>
            <p className="text-sm text-gray-600">{errorDetail.userMessage}</p>
          </div>

          {errorDetail.recoveryAction && (
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="mb-1 text-sm font-medium text-blue-900">How to fix it</p>
              <p className="text-sm text-blue-700">{errorDetail.recoveryAction}</p>
            </div>
          )}

          <ErrorRecoveryGuide error={error} />
        </div>

        <div className="mt-6 flex gap-3">
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
