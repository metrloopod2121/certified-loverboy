"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LifeBuoy, Info, Languages, Link as LinkIcon } from "lucide-react";
import { apiFetch, downloadWithToken } from "@/lib/apiClient";
import {
  card,
  pageHeading,
  mutedText,
  input,
} from "@/lib/ui";
import { useLang, useT } from "@/hooks/useLang";
import { trackClientEvent } from "@/lib/clientAnalytics";
import type { Lang } from "@/lib/i18n";

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

const compactPrimaryButton =
  "inline-flex w-full min-h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--app-ink)] px-5 py-2 text-[14px] font-semibold text-[var(--app-canvas)] disabled:opacity-50 active:scale-[0.98] transition";

const compactSecondaryButton =
  "inline-flex w-full min-h-10 items-center justify-center gap-1.5 rounded-full border border-[var(--app-outline)]/20 bg-[var(--app-surface)] px-5 py-2 text-[14px] font-semibold text-[var(--app-ink)] disabled:opacity-50 active:scale-[0.98] transition";

export default function ProfileScreen() {
  const { lang, setLang } = useLang();
  const t = useT();
  const [linkImportsRemaining, setLinkImportsRemaining] = useState<number | null | "loading">("loading");
  const [exporting, setExporting] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supportStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/profile/import-quota")
      .then((data) => {
        if (!cancelled) setLinkImportsRemaining(typeof data.remaining === "number" ? data.remaining : null);
      })
      .catch(() => {
        if (!cancelled) setLinkImportsRemaining(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remainingText =
    linkImportsRemaining === "loading" ? "..." : linkImportsRemaining === null ? "∞" : String(linkImportsRemaining);

  async function exportAll() {
    trackClientEvent("profile_export_clicked");
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
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className={`${input} appearance-auto`}>
          {LANGUAGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Info size={16} />
          {t("aboutBotHeading")}
        </span>
        <p className={mutedText}>{t("aboutBotText")}</p>
      </div>

      <div className={`${card} flex items-center justify-between gap-4`}>
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
            <LinkIcon size={16} />
            {t("linkImportsHeading")}
          </span>
          <p className={mutedText}>{t("linkImportsRemaining")}</p>
        </div>
        <span className="shrink-0 text-[34px] font-semibold leading-none text-[var(--app-ink)]">{remainingText}</span>
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
            if (!supportStartedRef.current && e.target.value.trim()) {
              supportStartedRef.current = true;
              trackClientEvent("profile_support_started");
            }
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
          className={compactPrimaryButton}
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
          className={compactSecondaryButton}
        >
          <Download size={16} />
          {exporting ? t("exportingBtn") : t("exportBtn")}
        </button>
      </div>
    </div>
  );
}
