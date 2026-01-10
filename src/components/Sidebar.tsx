"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  ShieldAlert, 
  Activity, 
  Menu,
  X,
  User,
  ScrollText,
  KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/i18n/LanguageProvider";
import { ConnectWallet } from "@/components/ConnectWallet";

const navItems = [
  { key: "nav.oracle" as const, href: "/oracle", icon: Activity },
  { key: "nav.disputes" as const, href: "/disputes", icon: ShieldAlert },
  { key: "nav.alerts" as const, href: "/alerts", icon: ShieldAlert },
  { key: "nav.audit" as const, href: "/audit", icon: ScrollText },
  { key: "nav.adminTokens" as const, href: "/admin/tokens", icon: KeyRound },
  { key: "nav.myAssertions" as const, href: "/my-assertions", icon: User },
  { key: "nav.myDisputes" as const, href: "/my-disputes", icon: ShieldAlert }
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
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/40 bg-white/70 backdrop-blur-xl shadow-2xl shadow-purple-500/10 transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white font-bold text-xl ring-2 ring-white/50">
              I
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 tracking-tight">Insight</h1>
              <p className="text-xs text-gray-500 font-medium">{t("app.subtitle")}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
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
                      ? "bg-white shadow-md shadow-purple-500/5 ring-1 ring-white/60 text-purple-700"
                      : "text-gray-600 hover:bg-white/40 hover:text-purple-700 hover:shadow-sm"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-purple-600" : "text-gray-400 group-hover:text-purple-500"
                    )}
                  />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/20 pt-4">
             <div className="w-full">
               <ConnectWallet />
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}
