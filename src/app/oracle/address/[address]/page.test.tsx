import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ address: '0x1234' }),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/oracle/address/0x1234',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/i18n/LanguageProvider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/i18n/translations', () => ({
  getUiErrorMessage: () => 'uiError',
  langToLocale: { en: 'en-US' },
}));

vi.mock('@/hooks/oracle/useOracleData', () => ({
  useOracleData: () => ({
    items: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    error: null,
  }),
}));

vi.mock('@/hooks/user/useUserStats', () => ({
  useUserStats: () => ({
    stats: null,
    loading: false,
  }),
}));

vi.mock('@/features/wallet/components/UserStatsCard', () => ({
  UserStatsCard: () => <div>UserStatsCard</div>,
}));

vi.mock('@/features/assertion/components/AssertionList', () => ({
  AssertionList: () => <div>AssertionList</div>,
}));

vi.mock('@/features/wallet/components/AddressAvatar', () => ({
  AddressAvatar: () => <div>AddressAvatar</div>,
}));

vi.mock('@/components/common/CopyButton', () => ({
  CopyButton: () => <div>CopyButton</div>,
}));

import AddressProfilePage from './page';

describe('AddressProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders address profile page', () => {
    expect(() => render(<AddressProfilePage />)).not.toThrow();
  });
});
