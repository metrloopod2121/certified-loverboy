"use client";

import { useState } from "react";
import { Download, LifeBuoy, Info, Languages } from "lucide-react";
import { apiFetch, downloadWithToken } from "@/lib/apiClient";
import {
  card,
  pageHeading,
  mutedText,
  input,
  buttonPrimary,
  buttonSecondary,
  pillToggle,
  pillToggleActive,
  pillToggleInactive,
} from "@/lib/ui";
import { useLang, useT } from "@/hooks/useLang";
import type { Lang } from "@/lib/i18n";

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export default function ProfileScreen() {
  const { lang, setLang } = useLang();
  const t = useT();
  const [exporting, setExporting] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportAll() {
    setExporting(true);
    try {
      const filename = `certified-loverboy-export-${new Date().toISOString().slice(0, 10)}.zip`;
      await downloadWithToken("/api/export/token", "/api/export", filename);
    } finally {
      setExporting(false);
    }
  }

  async function sendSupport(e: React.FormEvent) {
    e.preventDefault();
    const text = supportText.trim();
    if (!text) return;

    setSending(true);
    setError(null);
    try {
      await apiFetch("/api/support", { method: "POST", body: JSON.stringify({ text }) });
      setSupportText("");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldntSend"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pt-6 pb-6">
      <h1 className={pageHeading}>{t("profileTitle")}</h1>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Languages size={16} />
          {t("languageHeading")}
        </span>
        <p className={mutedText}>{t("languageDescription")}</p>
        <div className="flex gap-2">
          {LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLang(option.value)}
              className={`${pillToggle} ${lang === option.value ? pillToggleActive : pillToggleInactive}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Info size={16} />
          {t("aboutBotHeading")}
        </span>
        <p className={mutedText}>{t("aboutBotText")}</p>
      </div>

      <form onSubmit={sendSupport} className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <LifeBuoy size={16} />
          {t("supportHeading")}
        </span>
        <p className={mutedText}>{t("supportDescription")}</p>
        <textarea
          placeholder={t("supportPlaceholder")}
          value={supportText}
          onChange={(e) => {
            setSupportText(e.target.value);
            setSent(false);
          }}
          className={input}
          rows={3}
        />
        {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}
        {sent && <p className="text-[13px] font-medium text-green-600">{t("sentMsg")}</p>}
        <button
          type="submit"
          disabled={sending || !supportText.trim()}
          className={`${buttonPrimary} self-start disabled:opacity-50`}
        >
          {sending ? t("sendingBtn") : t("sendBtn")}
        </button>
      </form>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="text-[15px] font-semibold">{t("yourDataHeading")}</span>
        <p className={mutedText}>{t("yourDataDescription")}</p>
        <button
          type="button"
          onClick={exportAll}
          disabled={exporting}
          className={`${buttonSecondary} self-start disabled:opacity-50`}
        >
          <Download size={16} />
          {exporting ? t("exportingBtn") : t("exportBtn")}
        </button>
      </div>
    </div>
  );
}
