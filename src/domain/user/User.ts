/**
 * User 领域模型
 */

export interface User {
  id: string;
  address: string;
  email?: string;
  telegram?: string;
  preferences: UserPreferences;
  watchlist: WatchlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    telegram: boolean;
    webhook: boolean;
  };
  display: {
    theme: 'light' | 'dark';
    language: string;
    timezone: string;
  };
  alerts: {
    defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
    cooldown: number;
  };
}

export interface WatchlistItem {
  id: string;
  oracleId: string;
  symbol: string;
  addedAt: Date;
  notes?: string;
}

export class UserAggregate {
  private user: User;

  constructor(user: User) {
    this.user = user;
  }

  addToWatchlist(item: WatchlistItem): void {
    if (!this.user.watchlist.find(w => w.oracleId === item.oracleId)) {
      this.user.watchlist.push(item);
    }
  }

  removeFromWatchlist(oracleId: string): void {
    this.user.watchlist = this.user.watchlist.filter(w => w.oracleId !== oracleId);
  }

  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.user.preferences = {
      ...this.user.preferences,
      ...preferences,
    };
  }

  isInWatchlist(oracleId: string): boolean {
    return this.user.watchlist.some(w => w.oracleId === oracleId);
  }
}
