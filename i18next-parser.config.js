module.exports = {
  // Input files to scan for translation keys
  input: ['src/**/*.{ts,tsx}'],

  // Output directory for translation files
  output: './src/i18n/locales/$LOCALE/$NAMESPACE.json',

  // Supported languages
  locales: ['en', 'zh', 'es', 'fr', 'ko'],

  // Default namespace
  defaultNamespace: 'common',

  // Namespaces
  namespaces: ['app', 'common', 'chain', 'disputes', 'errors', 'nav', 'oracle', 'wallet'],

  // Key separator
  keySeparator: '.',

  // Namespace separator
  nsSeparator: ':',

  // Use keys as fallback
  useKeysAsDefaultValue: true,

  // Keep removed keys
  keepRemoved: false,

  // Sort keys
  sort: true,

  // Indentation
  indentation: 2,

  // New line at end
  lineEnding: '\n',

  // Lexer options
  lexers: {
    ts: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t', 'tn'],
        namespaceFunctions: ['useI18n'],
      },
    ],
    tsx: [
      {
        lexer: 'JsxLexer',
        functions: ['t', 'tn'],
        namespaceFunctions: ['useI18n'],
      },
    ],
  },
};
