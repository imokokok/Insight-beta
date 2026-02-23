export { truncateAddress } from '@/shared/utils/format/number';

export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
