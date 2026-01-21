"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("common.breadcrumb")}
      className={cn("flex items-center text-sm text-gray-500", className)}
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-purple-600 transition-colors"
      >
        <Home size={14} />
        <span className="sr-only">{t("common.home")}</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          {item.href ? (
            <Link
              href={item.href as unknown as URL}
              className="hover:text-purple-600 transition-colors font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-gray-900 truncate max-w-[200px]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
