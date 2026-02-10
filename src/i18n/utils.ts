import type { InterpolationValues, Lang, PluralOptions, PluralRule } from './types';

const PLURAL_RULES: Record<Lang, Intl.PluralRules> = {} as Record<Lang, Intl.PluralRules>;

const localeMap: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
};

export function getPluralRule(lang: Lang, count: number): PluralRule {
  if (!PLURAL_RULES[lang]) {
    PLURAL_RULES[lang] = new Intl.PluralRules(lang);
  }
  return PLURAL_RULES[lang].select(count) as PluralRule;
}

export function interpolate(template: string, values: InterpolationValues): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    return value !== undefined ? String(value) : match;
  });
}

export function handlePlural(options: PluralOptions, lang: Lang): string {
  const { count, forms } = options;
  const rule = getPluralRule(lang, count);

  if ('one' in forms && 'other' in forms && Object.keys(forms).length === 2) {
    return count === 1 ? forms.one : forms.other;
  }

  return (forms as Record<PluralRule, string>)[rule] ?? forms.other ?? String(count);
}

export function formatDate(
  value: Date | number | string,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(localeMap[lang], options).format(date);
}

export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeMap[lang], options).format(value);
}

export function formatCurrency(
  value: number,
  lang: Lang,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeMap[lang], {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  lang: Lang,
  options?: Intl.RelativeTimeFormatOptions,
): string {
  return new Intl.RelativeTimeFormat(localeMap[lang], options).format(value, unit);
}

export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}
