import { validateSymbol as validateSymbolCore } from '@/lib/blockchain/security/inputValidation';

export function validateSymbol(symbol: string | null): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const result = validateSymbolCore(symbol);
  if (!result.valid) {
    return null;
  }
  return result.sanitized as string;
}
