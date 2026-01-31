# i18n 国际化系统

本项目使用自定义的国际化解决方案，基于 React Context API 和原生 Intl API 构建。

## 特性

- 🌍 **5 种语言支持**：中文、英语、西班牙语、法语、韩语
- 📝 **TypeScript 完整类型支持**：翻译键类型安全
- 🚀 **懒加载支持**：翻译文件按需加载
- 🧪 **自动化测试**：翻译覆盖率测试
- 📅 **完整的格式化**：日期、数字、货币、相对时间
- 🔢 **复数规则支持**：基于 Intl.PluralRules
- 🔄 **SSR 支持**：Next.js 服务端渲染兼容
- 💾 **语言持久化**：localStorage + cookie

## 目录结构

```
src/i18n/
├── LanguageProvider.tsx    # 语言上下文 Provider
├── LanguageProviderLazy.tsx # 懒加载版本 Provider
├── loader.ts               # 翻译文件加载器
├── translations.ts         # 翻译导出和工具函数
├── types.ts                # 类型定义
├── utils.ts                # 工具函数（插值、复数、格式化）
├── index.ts                # 入口文件
├── README.md               # 本文档
├── __tests__/              # 测试文件
│   └── translations-coverage.test.ts
└── locales/                # 翻译文件
    ├── en/                 # 英语
    ├── zh/                 # 中文
    ├── es/                 # 西班牙语
    ├── fr/                 # 法语
    └── ko/                 # 韩语
```

## 快速开始

### 1. 在组件中使用翻译

```tsx
import { useI18n } from '@/i18n/LanguageProvider';

export function MyComponent() {
  const { t, tn, format, lang, setLang } = useI18n();

  return (
    <div>
      {/* 基础翻译 */}
      <h1>{t('app.title')}</h1>

      {/* 带插值的翻译 */}
      <p>{t('welcome.message', { name: 'John' })}</p>

      {/* 复数 */}
      <span>{tn('items.count', count, { one: '1 item', other: '{{count}} items' })}</span>

      {/* 格式化 */}
      <time>{format.date(new Date())}</time>
      <span>{format.number(1234567.89)}</span>
      <span>{format.currency(100, 'USD')}</span>
      <span>{format.relativeTime(-1, 'day')}</span>
    </div>
  );
}
```

### 2. 切换语言

```tsx
import { useI18n } from '@/i18n/LanguageProvider';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
      <option value="zh">中文</option>
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="ko">한국어</option>
    </select>
  );
}
```

## API 参考

### `useI18n()` Hook

返回以下对象：

| 属性                  | 类型                                                                                                     | 说明           |
| --------------------- | -------------------------------------------------------------------------------------------------------- | -------------- |
| `lang`                | `Lang`                                                                                                   | 当前语言代码   |
| `setLang`             | `(lang: Lang) => void`                                                                                   | 切换语言       |
| `t`                   | `(key: string, values?: Record<string, string \| number>) => string`                                     | 基础翻译       |
| `tn`                  | `(key: string, count: number, forms: PluralForms) => string`                                             | 复数翻译       |
| `format.date`         | `(value: Date \| number \| string, options?: Intl.DateTimeFormatOptions) => string`                      | 日期格式化     |
| `format.number`       | `(value: number, options?: Intl.NumberFormatOptions) => string`                                          | 数字格式化     |
| `format.currency`     | `(value: number, currency: string, options?: Intl.NumberFormatOptions) => string`                        | 货币格式化     |
| `format.relativeTime` | `(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => string` | 相对时间格式化 |

### 翻译键格式

使用点号分隔的命名空间路径：

```
namespace.subNamespace.key
```

例如：

- `app.title` - 应用标题
- `wallet.connect` - 连接钱包
- `errors.unknownError` - 未知错误

## 添加新翻译

### 1. 在英语翻译文件中添加

编辑 `src/i18n/locales/en/[namespace].ts`：

```ts
export const common = {
  // 现有翻译...
  myNewKey: 'My New Translation',
  myInterpolatedKey: 'Hello, {{name}}!',
};
```

### 2. 同步到其他语言

编辑对应语言的文件：

```ts
// src/i18n/locales/zh/common.ts
export const common = {
  // 现有翻译...
  myNewKey: '我的新翻译',
  myInterpolatedKey: '你好，{{name}}！',
};
```

### 3. 运行测试验证

```bash
npm test -- src/i18n/__tests__/translations-coverage.test.ts
```

## 添加新语言

1. 在 `src/i18n/types.ts` 中添加语言代码：

```ts
export type Lang = 'zh' | 'en' | 'es' | 'fr' | 'ko' | 'ja'; // 添加 'ja'
```

2. 在 `languages` 数组中添加语言信息：

```ts
export const languages = [
  // ...
  { code: 'ja', label: '日本語' },
];
```

3. 在 `langToHtmlLang` 和 `langToLocale` 中添加映射：

```ts
export const langToHtmlLang: Record<Lang, string> = {
  // ...
  ja: 'ja',
};

export const langToLocale: Record<Lang, string> = {
  // ...
  ja: 'ja-JP',
};
```

4. 创建翻译目录 `src/i18n/locales/ja/`

5. 复制其他语言的文件结构并翻译

6. 更新 `src/i18n/translations.ts`：

```ts
import { jaTranslations } from './locales/ja';

export const translations = {
  // ...
  ja: jaTranslations,
} as const;
```

7. 更新 `src/i18n/loader.ts`：

```ts
const translationLoaders: Record<Lang, TranslationModule> = {
  // ...
  ja: () =>
    import('./locales/ja').then((m) => ({ default: m.jaTranslations as TranslationNamespace })),
};
```

8. 更新测试文件 `src/i18n/__tests__/translations-coverage.test.ts`

## 最佳实践

### 1. 命名空间组织

按功能模块组织翻译文件：

- `app` - 应用级别（标题、描述等）
- `common` - 通用文本（按钮、状态、操作等）
- `wallet` - 钱包相关
- `oracle` - 预言机功能
- `disputes` - 争议相关
- `chain` - 区块链/网络相关
- `nav` - 导航相关
- `alerts` - 警报相关
- `audit` - 审计相关
- `status` - 状态相关
- `errors` - 错误信息
- `errorPage` - 错误页面

### 2. 翻译键命名

使用驼峰命名法，按层级组织：

```ts
// ✅ 好的命名
connectWallet: 'Connect Wallet',
connectWalletDescription: 'Connect your wallet to continue',

// ❌ 避免
'connect-wallet': 'Connect Wallet',
connect_wallet: 'Connect Wallet',
```

### 3. 复数处理

使用 `tn` 函数处理复数：

```tsx
// 简单复数（两种形式）
{
  tn('items.count', count, { one: '1 item', other: '{{count}} items' });
}

// 完整复数（所有形式）
{
  tn('items.count', count, {
    zero: 'No items',
    one: '1 item',
    two: '2 items',
    few: '{{count}} items',
    many: '{{count}} items',
    other: '{{count}} items',
  });
}
```

### 4. 插值使用

使用双大括号 `{{key}}` 进行变量插值：

```ts
// 翻译定义
welcomeMessage: ('Welcome, {{name}}! You have {{count}} new messages.',
  // 组件中使用
  t('welcomeMessage', { name: 'John', count: 5 }));
```

## 测试

### 运行翻译覆盖率测试

```bash
# 运行所有 i18n 测试
npm test -- src/i18n

# 只运行覆盖率测试
npm test -- src/i18n/__tests__/translations-coverage.test.ts
```

测试会验证：

- 所有语言都包含英语的翻译键
- 报告各语言的翻译覆盖率

## 工具函数

### 语言检测

```ts
import { detectLangFromAcceptLanguage, isLang } from '@/i18n/types';

// 从 Accept-Language Header 检测语言
const lang = detectLangFromAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8');

// 验证语言代码
if (isLang('zh')) {
  // 'zh' 是有效的语言代码
}
```

### 错误消息获取

```ts
import { getUiErrorMessage } from '@/i18n/translations';

const message = getUiErrorMessage('wallet_not_connected', t);
```

## 懒加载

对于大型应用，可以使用懒加载版本：

```tsx
import { LanguageProviderLazy } from '@/i18n/LanguageProviderLazy';

export default function App() {
  return (
    <LanguageProviderLazy initialLang="en">
      <YourApp />
    </LanguageProviderLazy>
  );
}
```

## 注意事项

1. **翻译键必须存在于所有语言中**：运行测试确保没有遗漏
2. **避免在翻译键中使用 HTML**：使用组件组合代替
3. **日期/数字格式化使用 `format` 对象**：确保本地化正确
4. **语言切换会自动持久化**：无需手动处理 localStorage
5. **SSR 时注意 hydration**：确保服务端和客户端初始语言一致
