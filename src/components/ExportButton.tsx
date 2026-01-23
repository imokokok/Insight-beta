"use client";

import { Download, FileSpreadsheet, FileJson } from "lucide-react";
import { useState } from "react";
import { exportData, type ExportFormat } from "@/lib/export";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  filename?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename = "export",
  disabled = false,
  loading = false,
}: ExportButtonProps<T>) {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (exporting || disabled || loading || data.length === 0) return;

    setExporting(true);
    try {
      exportData(data, {
        filename,
        format,
      });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const isDisabled = disabled || loading || data.length === 0 || exporting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="gap-2"
        >
          <Download size={16} />
          {t("common.export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={isDisabled}
          className="gap-2"
        >
          <FileSpreadsheet size={16} />
          <span>CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("xlsx")}
          disabled={isDisabled}
          className="gap-2"
        >
          <FileSpreadsheet size={16} />
          <span>Excel (CSV)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("json")}
          disabled={isDisabled}
          className="gap-2"
        >
          <FileJson size={16} />
          <span>JSON</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}