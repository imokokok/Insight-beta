import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { detectLangFromAcceptLanguage, isLang, langToHtmlLang, LANG_STORAGE_KEY, translations } from "@/i18n/translations";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const h = await headers();
  const lang = isLang(cookieLang) ? cookieLang : detectLangFromAcceptLanguage(h.get("accept-language"));
  return {
    title: translations[lang].app.title,
    description: translations[lang].app.description
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const cookieLang = c.get(LANG_STORAGE_KEY)?.value;
  const h = await headers();
  const lang = isLang(cookieLang) ? cookieLang : detectLangFromAcceptLanguage(h.get("accept-language"));
  return (
    <html lang={langToHtmlLang[lang]}>
      <body className={cn("min-h-screen bg-[var(--background)] font-sans antialiased text-purple-950")}>
        <LanguageProvider initialLang={lang}>
          <ToastProvider>
            <div className="fixed inset-0 -z-20 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 opacity-60 pointer-events-none" />
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/40 blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-rose-300/40 to-pink-300/40 blur-[120px]" />
            </div>
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] -z-10 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 transition-all duration-300 md:ml-64">
                <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                  <div className="sticky top-0 z-20 mb-6 flex justify-end">
                    <LanguageSwitcher />
                  </div>
                  {children}
                </div>
              </main>
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
