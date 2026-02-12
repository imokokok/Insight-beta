export type NormalizedWalletErrorKind =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'REQUEST_PENDING'
  | 'CHAIN_NOT_ADDED'
  | 'WRONG_NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'GAS_ESTIMATION_FAILED'
  | 'TRANSACTION_FAILED'
  | 'CONTRACT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface WalletErrorDetail {
  kind: NormalizedWalletErrorKind;
  code?: number;
  rawMessage?: string;
  userMessage: string;
  recoveryAction?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  documentationLink?: string;
}

function getErrorCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  if (!('code' in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'number' ? code : undefined;
}

function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

function getErrorDetails(err: unknown): WalletErrorDetail {
  const code = getErrorCode(err);
  const rawMessage = getErrorMessage(err);
  const msg = (rawMessage ?? '').toLowerCase();

  if (
    code === 4001 ||
    msg.includes('user rejected') ||
    msg.includes('rejected by user') ||
    msg.includes('request rejected')
  ) {
    return {
      kind: 'USER_REJECTED',
      code,
      rawMessage,
      userMessage: 'Transaction was rejected by you',
      recoveryAction: 'You can review the transaction details and try again',
      severity: 'info',
    };
  }

  if (
    code === -32002 ||
    msg.includes('request already pending') ||
    msg.includes('pending') ||
    msg.includes('try again')
  ) {
    return {
      kind: 'REQUEST_PENDING',
      code,
      rawMessage,
      userMessage: 'A request is already pending',
      recoveryAction: 'Please wait for the pending request to complete',
      severity: 'warning',
    };
  }

  if (
    code === 4902 ||
    msg.includes('add it first') ||
    msg.includes('unrecognized chain') ||
    msg.includes('chain not found')
  ) {
    return {
      kind: 'CHAIN_NOT_ADDED',
      code,
      rawMessage,
      userMessage: 'This network is not added to your wallet',
      recoveryAction:
        'Click "Add Network" to add it automatically, or add it manually in your wallet settings',
      severity: 'warning',
      documentationLink:
        'https://docs.oracle-monitor.foresight.build/troubleshooting/network-issues',
    };
  }

  if (
    msg.includes('wrong network') ||
    msg.includes('network mismatch') ||
    msg.includes('chain mismatch') ||
    msg.includes('switch to')
  ) {
    return {
      kind: 'WRONG_NETWORK',
      code,
      rawMessage,
      userMessage: `You are connected to the wrong network`,
      recoveryAction: 'Click "Switch Network" to connect to the correct chain',
      severity: 'warning',
    };
  }

  if (
    msg.includes('wallet not found') ||
    msg.includes('install metamask') ||
    msg.includes('metamask') ||
    msg.includes('no wallet') ||
    msg.includes('wallet not installed')
  ) {
    return {
      kind: 'WALLET_NOT_FOUND',
      code,
      rawMessage,
      userMessage: 'No wallet detected',
      recoveryAction: 'Please install MetaMask, Rabby, or another compatible wallet',
      severity: 'error',
      documentationLink: 'https://docs.oracle-monitor.foresight.build/getting-started/wallet-setup',
    };
  }

  if (
    msg.includes('insufficient funds') ||
    msg.includes('not enough ether') ||
    msg.includes('balance is lower')
  ) {
    const match = msg.match(/required.*?(\d+\.?\d*)/);
    const required = match ? match[1] : 'unknown';
    return {
      kind: 'INSUFFICIENT_FUNDS',
      code,
      rawMessage,
      userMessage: `Insufficient balance to complete this transaction`,
      recoveryAction: `Add more funds to your wallet or reduce the transaction amount. Required: ${required} ETH`,
      severity: 'error',
    };
  }

  if (
    msg.includes('gas') ||
    msg.includes('intrinsic gas') ||
    msg.includes('gas required exceeds')
  ) {
    return {
      kind: 'GAS_ESTIMATION_FAILED',
      code,
      rawMessage,
      userMessage: 'Unable to estimate gas for this transaction',
      recoveryAction: 'Try increasing the gas limit or try again later',
      severity: 'warning',
    };
  }

  if (
    msg.includes('execution reverted') ||
    msg.includes('transaction failed') ||
    msg.includes('call revert')
  ) {
    let reason = 'Unknown reason';

    const reasonMatch = msg.match(/reverted with reason string ['"](.+?)['"]/);
    if (reasonMatch && reasonMatch[1]) {
      reason = reasonMatch[1];
    } else {
      const executionMatch = msg.match(/execution reverted:? (.+)/i);
      if (executionMatch && executionMatch[1]) {
        reason = executionMatch[1].trim();
      }
    }

    return {
      kind: 'TRANSACTION_FAILED',
      code,
      rawMessage,
      userMessage: `Transaction failed: ${reason}`,
      recoveryAction:
        'Check if all conditions are met and try again. This may require admin intervention.',
      severity: 'error',
    };
  }

  if (
    msg.includes('contract') &&
    (msg.includes('not found') || msg.includes('no code') || msg.includes('could not'))
  ) {
    return {
      kind: 'CONTRACT_NOT_FOUND',
      code,
      rawMessage,
      userMessage: 'Smart contract not found at this address',
      recoveryAction: 'Verify the contract address is correct and the chain is synced',
      severity: 'error',
    };
  }

  if (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('offline') ||
    msg.includes('fetch error')
  ) {
    return {
      kind: 'NETWORK_ERROR',
      code,
      rawMessage,
      userMessage: 'Network connection error',
      recoveryAction:
        'Check your internet connection and try again. If the problem persists, try a different RPC URL.',
      severity: 'warning',
    };
  }

  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline exceeded')) {
    return {
      kind: 'TIMEOUT',
      code,
      rawMessage,
      userMessage: 'Request timed out',
      recoveryAction: 'The server took too long to respond. Please try again.',
      severity: 'warning',
    };
  }

  return {
    kind: 'UNKNOWN',
    code,
    rawMessage,
    userMessage: 'An unexpected error occurred',
    recoveryAction: 'Please try again or contact support if the problem persists',
    severity: 'error',
  };
}

export function normalizeWalletError(err: unknown): WalletErrorDetail {
  return getErrorDetails(err);
}
