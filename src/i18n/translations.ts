import { enTranslations } from './locales/en';
import { esTranslations } from './locales/es';
import { zhTranslations } from './locales/zh';

import type { Lang } from './types';

// Re-export types and constants from types.ts to avoid duplication
export type { Lang };
export {
  languages,
  LANG_STORAGE_KEY,
  isLang,
  detectLangFromAcceptLanguage,
  langToHtmlLang,
  langToLocale,
} from './types';

// Export all translations
export const translations = {
  en: enTranslations,
  zh: zhTranslations,
  es: esTranslations,
} as const;

// Type for translation keys - using string for flexibility
export type TranslationKey = string;

// Helper function to get error messages
export function getUiErrorMessage(errorCode: string, t: (key: TranslationKey) => string) {
  if (errorCode === 'unknown_error') return t('errors.unknownError');
  if (errorCode.startsWith('http_')) return `${t('errors.httpError')} (${errorCode.slice(5)})`;
  if (errorCode === 'invalid_json') return t('errors.invalidJson');
  if (errorCode === 'invalid_json_response') return t('errors.invalidJson');
  if (errorCode === 'api_error') return t('errors.apiError');
  if (errorCode === 'invalid_api_response') return t('errors.invalidApiResponse');
  if (errorCode === 'api_unknown_error') return t('errors.unknownError');
  if (errorCode === 'missing_config') return t('errors.missingConfig');
  if (errorCode === 'invalid_rpc_url') return t('errors.invalidRpcUrl');
  if (errorCode === 'invalid_contract_address') return t('errors.invalidContractAddress');
  if (errorCode === 'invalid_chain') return t('errors.invalidChain');
  if (errorCode === 'invalid_request_body') return t('errors.invalidRequestBody');
  if (errorCode === 'invalid_address') return t('errors.invalidAddress');
  if (errorCode === 'invalid_max_block_range') return t('errors.invalidMaxBlockRange');
  if (errorCode === 'invalid_voting_period_hours') return t('errors.invalidVotingPeriodHours');
  if (errorCode === 'forbidden') return t('errors.forbidden');
  if (errorCode === 'rpc_unreachable') return t('errors.rpcUnreachable');
  if (errorCode === 'contract_not_found') return t('errors.contractNotFound');
  if (errorCode === 'sync_failed') return t('errors.syncFailed');
  if (errorCode === 'wallet_not_connected') return t('errors.walletNotConnected');
  if (errorCode === 'user_rejected') return t('errors.userRejected');
  if (errorCode === 'request_pending') return t('errors.requestPending');
  if (errorCode === 'chain_not_added') return t('errors.chainNotAdded');
  if (errorCode === 'wrong_network') return t('errors.wrongNetwork');
  if (errorCode === 'insufficient_funds') return t('errors.insufficientFunds');
  return errorCode;
}
