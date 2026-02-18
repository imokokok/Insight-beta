export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export interface UserProfile {
  address: string;
  ensName?: string;
  avatar?: string;
}
