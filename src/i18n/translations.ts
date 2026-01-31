import type { Lang } from './types';
import { enTranslations } from './locales/en';
import { zhTranslations } from './locales/zh';
import { esTranslations } from './locales/es';
import { frTranslations } from './locales/fr';
import { koTranslations } from './locales/ko';

export type { Lang };

export const languages: Array<{ code: Lang; label: string }> = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
];

export const LANG_STORAGE_KEY = 'oracle-monitor_lang';

export function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en' || value === 'es' || value === 'fr' || value === 'ko';
}

interface ParsedLanguage {
  lang: string;
  q: number;
}

function parseAcceptLanguage(header: string): ParsedLanguage[] {
  const parts = header.split(',');
  const parsed: ParsedLanguage[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    let lang = trimmed;
    let q = 1.0;

    const semicolonIndex = trimmed.indexOf(';');
    if (semicolonIndex >= 0) {
      lang = trimmed.slice(0, semicolonIndex);
      const qParamPart = trimmed.slice(semicolonIndex);
      const qMatch = qParamPart.match(/q=([0-9.]+)/);
      if (qMatch && qMatch[1]) {
        const qValue = parseFloat(qMatch[1]);
        if (!Number.isNaN(qValue)) {
          q = Math.min(1, Math.max(0, qValue));
        }
      }
    }

    const baseLang = lang.split('-')[0]?.split('_')[0]?.toLowerCase() ?? 'en';
    parsed.push({ lang: baseLang, q });
  }

  parsed.sort((a, b) => b.q - a.q);
  return parsed;
}

export function detectLangFromAcceptLanguage(value: string | null | undefined): Lang {
  const header = value ?? '';
  if (!header.trim()) return 'en';

  const parsed = parseAcceptLanguage(header);

  for (const { lang } of parsed) {
    if (lang.startsWith('zh')) return 'zh';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('es')) return 'es';
  }

  return 'en';
}

export const langToHtmlLang: Record<Lang, string> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  ko: 'ko',
  zh: 'zh-CN',
};

export const langToLocale: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ko: 'ko-KR',
  zh: 'zh-CN',
};

// Export all translations
export const translations = {
  en: enTranslations,
  zh: zhTranslations,
  es: esTranslations,
  fr: frTranslations,
  ko: koTranslations,
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
