"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { translations, type Lang } from "@/i18n/translations";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    } else {
      Sentry.captureException(error, {
        extra: {
          digest: error.digest,
        },
      });
    }

    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes("zh")) setLang("zh");
      else if (browserLang.includes("es")) setLang("es");
      else setLang("en");
    }
  }, [error]);

  const t = translations[lang].errorPage;
  const htmlLang = lang === "zh" ? "zh-CN" : lang === "es" ? "es" : "en";

  return (
    <html lang={htmlLang}>
      <body className="bg-gray-50 min-h-screen flex items-center justify-center p-4 font-sans text-gray-900 antialiased">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-red-100 shadow-sm">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {t.title}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t.description}
              </p>
            </div>

            {(process.env.NODE_ENV === "development" ||
              process.env.NODE_ENV === "test") && (
              <div className="bg-red-50/50 rounded-xl p-4 text-left overflow-auto max-h-40 border border-red-100/50">
                <p className="font-mono text-xs text-red-700 break-all">
                  {error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => reset()}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20"
              >
                <RefreshCcw className="w-4 h-4" />
                {t.retry}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                {t.home}
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            {t.digest}: {error.digest || "N/A"}
          </p>
        </div>
      </body>
    </html>
  );
}
