import "./globals.css";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { ToastProvider } from "@/components/ui/toast";
import { WalletProvider } from "@/contexts/WalletContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SyncStatus } from "@/components/SyncStatus";
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
          <WalletProvider>
            <ToastProvider>
              {/* Base bright gradient */}
              <div className="fixed inset-0 -z-30 bg-[#fafafa]" />
              <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-yellow-100/60 via-pink-100/60 to-cyan-100/60 opacity-80 pointer-events-none" />
              
              {/* Colorful animated orbs for rainbow feel */}
              <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-yellow-300/30 to-orange-300/30 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute top-[10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-br from-cyan-300/30 to-blue-300/30 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[60%] rounded-full bg-gradient-to-br from-pink-300/30 to-purple-300/30 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute bottom-[-20%] right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-lime-300/30 to-emerald-300/30 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '9s' }} />
              </div>

              <div className="fixed inset-0 pointer-events-none opacity-[0.02] -z-10 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 transition-all duration-300 md:ml-64">
                  <div className="container mx-auto p-4 md:p-8 max-w-7xl">
                    <div className="sticky top-0 z-20 mb-6 flex justify-end">
                      <div className="flex items-center gap-3">
                        <SyncStatus />
                        <LanguageSwitcher />
                      </div>
                    </div>
                    {children}
                  </div>
                </main>
              </div>
            </ToastProvider>
          </WalletProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
