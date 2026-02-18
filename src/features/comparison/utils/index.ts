export function calculateDeviation(price1: number, price2: number): number {
  if (price1 === 0 || price2 === 0) return 0;
  return Math.abs(((price1 - price2) / price2) * 100);
}

export function formatDeviation(deviation: number): string {
  return `${deviation.toFixed(2)}%`;
}
