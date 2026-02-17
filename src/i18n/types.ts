export type Lang = 'zh' | 'en';

export const languages: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

export const LANG_STORAGE_KEY = 'oracle-monitor_lang';

export function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en';
}

export const langToHtmlLang: Record<Lang, string> = {
  en: 'en',
  zh: 'zh-CN',
};

export const langToLocale: Record<Lang, string> = {
  en: 'en-US',
  zh: 'zh-CN',
};

export interface ParsedLanguage {
  lang: string;
  q: number;
}

export function parseAcceptLanguage(header: string): ParsedLanguage[] {
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
  }

  return 'en';
}

export type InterpolationValues = Record<string, string | number>;

export type PluralRule = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export interface PluralOptions {
  count: number;
  forms: Record<PluralRule, string> | { one: string; other: string };
}

export interface FormatOptions {
  date?: Intl.DateTimeFormatOptions;
  number?: Intl.NumberFormatOptions;
  currency?: Intl.NumberFormatOptions & { currency: string };
  relative?: Intl.RelativeTimeFormatOptions;
}

export type TranslationValue =
  | string
  | { plural: PluralOptions }
  | { format: 'date' | 'number' | 'currency' | 'relative'; value: unknown; options?: FormatOptions }
  | TranslationValue[]
  | { [key: string]: TranslationValue };

export type TranslationNamespace = Record<string, TranslationValue>;

export type Translations = Record<Lang, TranslationNamespace>;
