// 这个文件提供类型安全的翻译键
// 通过从英语翻译文件推断所有可能的翻译键

import type { enTranslations } from './locales/en';

// 递归提取所有路径作为类型
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Leaves<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends object
    ? { [K in keyof T]-?: Join<K, Leaves<T[K], Prev[D]>> }[keyof T]
    : '';

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 所有翻译键的类型
export type TranslationKey = Leaves<typeof enTranslations>;

// 命名空间类型
export type TranslationNamespace = keyof typeof enTranslations;

// 获取特定命名空间下的所有键
export type NamespaceKeys<N extends TranslationNamespace> =
  Leaves<(typeof enTranslations)[N]> extends `${N}.${infer R}` ? R : never;

// 辅助函数：提供类型安全的翻译键（开发时使用，运行时不做检查）
export function createTranslationKey<T extends TranslationKey>(key: T): T {
  return key;
}

// 常用翻译键常量（可选使用）
export const TranslationKeys = {
  app: {
    title: 'app.title' as const,
    description: 'app.description' as const,
  },
  common: {
    confirm: 'common.confirm' as const,
    cancel: 'common.cancel' as const,
    loading: 'common.loading' as const,
    success: 'common.success' as const,
    error: 'common.error' as const,
    close: 'common.close' as const,
    search: 'common.search' as const,
    settings: 'common.settings' as const,
  },
  wallet: {
    connect: 'wallet.connect' as const,
    disconnect: 'wallet.disconnect' as const,
    connecting: 'wallet.connecting' as const,
  },
  errors: {
    unknownError: 'errors.unknownError' as const,
    httpError: 'errors.httpError' as const,
    apiError: 'errors.apiError' as const,
  },
} as const;
