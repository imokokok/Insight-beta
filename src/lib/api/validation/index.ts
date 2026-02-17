import { VALID_SYMBOLS } from '@/config/constants';

export function validateSymbol(symbol: string | null): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const upperSymbol = symbol.toUpperCase().trim();
  if (!VALID_SYMBOLS.includes(upperSymbol)) {
    return null;
  }
  return upperSymbol;
}
