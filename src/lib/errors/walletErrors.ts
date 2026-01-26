type NormalizedWalletErrorKind =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'REQUEST_PENDING'
  | 'CHAIN_NOT_ADDED'
  | 'WRONG_NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'UNKNOWN';

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

export function normalizeWalletError(err: unknown): {
  kind: NormalizedWalletErrorKind;
  code?: number;
  rawMessage?: string;
} {
  const code = getErrorCode(err);
  const rawMessage = getErrorMessage(err);
  const msg = (rawMessage ?? '').toLowerCase();

  if (code === 4001 || msg.includes('user rejected') || msg.includes('rejected')) {
    return { kind: 'USER_REJECTED', code, rawMessage };
  }
  if (code === -32002 || msg.includes('request already pending')) {
    return { kind: 'REQUEST_PENDING', code, rawMessage };
  }
  if (code === 4902 || msg.includes('add it first')) {
    return { kind: 'CHAIN_NOT_ADDED', code, rawMessage };
  }
  if (
    msg.includes('wrong network') ||
    msg.includes('network mismatch') ||
    msg.includes('chain mismatch')
  ) {
    return { kind: 'WRONG_NETWORK', code, rawMessage };
  }
  if (
    msg.includes('wallet not found') ||
    msg.includes('install metamask') ||
    msg.includes('metamask')
  ) {
    return { kind: 'WALLET_NOT_FOUND', code, rawMessage };
  }
  if (msg.includes('insufficient funds')) {
    return { kind: 'INSUFFICIENT_FUNDS', code, rawMessage };
  }
  return { kind: 'UNKNOWN', code, rawMessage };
}
