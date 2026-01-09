"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  ShieldAlert, 
  Activity, 
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";

const navItems = [
  { key: "nav.oracle" as const, href: "/oracle", icon: Activity },
  { key: "nav.disputes" as const, href: "/disputes", icon: ShieldAlert }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
      className="fixed top-4 left-4 z-50 rounded-xl bg-white/50 p-2 shadow-sm backdrop-blur-md md:hidden text-purple-900"
      aria-label={isOpen ? t("common.closeMenu") : t("common.openMenu")}
      aria-expanded={isOpen}
    >
      {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
    </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-white/40 backdrop-blur-xl border-r border-purple-100 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 text-white font-bold text-xl">
              I
            </div>
            <div>
              <h1 className="text-lg font-bold text-purple-950">Insight</h1>
              <p className="text-xs text-purple-800/60">{t("app.subtitle")}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-purple-100/80 text-purple-900 shadow-sm"
                      : "text-purple-700/70 hover:bg-white/50 hover:text-purple-900"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors",
                      isActive ? "text-purple-600" : "text-purple-400 group-hover:text-purple-600"
                    )}
                  />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-purple-100 pt-4">
            <div className="flex items-center gap-3 rounded-xl bg-white/40 p-3 shadow-sm ring-1 ring-purple-100">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-violet-200 to-pink-200" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-purple-900">{t("sidebar.userWallet")}</p>
                <p className="truncate text-xs text-purple-500">{t("sidebar.notConnected")}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
