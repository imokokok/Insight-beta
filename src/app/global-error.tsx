'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { translations, type Lang } from '@/i18n/translations';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    } else {
      Sentry.captureException(error, {
        extra: {
          digest: error.digest,
        },
      });
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes('zh')) setLang('zh');
      else if (browserLang.includes('es')) setLang('es');
      else setLang('en');
    }
  }, [error]);

  const t = translations[lang].errorPage;
  const htmlLang = lang === 'zh' ? 'zh-CN' : lang === 'es' ? 'es' : 'en';

  return (
    <html lang={htmlLang}>
      <body className="flex min-h-screen items-center justify-center bg-gray-50 p-4 font-sans text-gray-900 antialiased">
        <div className="w-full max-w-md">
          <div className="space-y-6 rounded-3xl border border-white/50 bg-white/80 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 shadow-sm ring-1 ring-red-100">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.title}</h2>
              <p className="text-sm leading-relaxed text-gray-500">{t.description}</p>
            </div>

            {(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && (
              <div className="max-h-40 overflow-auto rounded-xl border border-red-100/50 bg-red-50/50 p-4 text-left">
                <p className="break-all font-mono text-xs text-red-700">{error.message}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => reset()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 active:scale-[0.98]"
              >
                <RefreshCcw className="h-4 w-4" />
                {t.retry}
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
              >
                <Home className="h-4 w-4" />
                {t.home}
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            {t.digest}: {error.digest || 'N/A'}
          </p>
        </div>
      </body>
    </html>
  );
}
