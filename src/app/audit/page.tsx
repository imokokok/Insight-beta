"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/LanguageProvider";
import { AuditLogViewer } from "@/components/AuditLogViewer";

export default function AuditPage() {
  const { t } = useI18n();
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("insight_admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => {
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem("insight_admin_token", trimmed);
    else window.sessionStorage.removeItem("insight_admin_token");
  }, [adminToken]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t("audit.title")}
        description={t("audit.description")}
      />
      <div className="max-w-3xl">
        <AuditLogViewer adminToken={adminToken} setAdminToken={setAdminToken} />
      </div>
    </div>
  );
}
