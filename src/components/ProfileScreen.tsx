"use client";

import { useEffect, useState } from "react";
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
import type { Lang } from "@/lib/i18n";

const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

export default function ProfileScreen() {
  const [exporting, setExporting] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Lang | null>(null);

  useEffect(() => {
    apiFetch("/api/profile/language")
      .then((data) => setLanguage(data.language))
      .catch(() => {});
  }, []);

  async function changeLanguage(next: Lang) {
    if (next === language) return;
    const previous = language;
    setLanguage(next);
    try {
      await apiFetch("/api/profile/language", { method: "PATCH", body: JSON.stringify({ language: next }) });
    } catch {
      setLanguage(previous);
    }
  }

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
      setError(err instanceof Error ? err.message : "Couldn't send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto p-4 pt-6 pb-6">
      <h1 className={pageHeading}>Profile</h1>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Languages size={16} />
          Bot language
        </span>
        <p className={mutedText}>Language the bot replies in — messages, buttons, /start.</p>
        <div className="flex gap-2">
          {LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeLanguage(option.value)}
              className={`${pillToggle} ${language === option.value ? pillToggleActive : pillToggleInactive}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Info size={16} />
          About the bot
        </span>
        <p className={mutedText}>
          This bot keeps your own personal base of places and date ideas. Send it a Yandex Maps
          link, forward a channel post, or paste a link to a post — it picks out the place and
          offers to add it to your base. Free imports: 5, then add places manually or paste a
          Yandex Maps link right here in the app.
        </p>
      </div>

      <form onSubmit={sendSupport} className={`${card} flex flex-col gap-2`}>
        <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <LifeBuoy size={16} />
          Support
        </span>
        <p className={mutedText}>Found a bug or something's confusing? Describe it below.</p>
        <textarea
          placeholder="What happened?"
          value={supportText}
          onChange={(e) => {
            setSupportText(e.target.value);
            setSent(false);
          }}
          className={input}
          rows={3}
        />
        {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}
        {sent && <p className="text-[13px] font-medium text-green-600">Sent — thanks!</p>}
        <button
          type="submit"
          disabled={sending || !supportText.trim()}
          className={`${buttonPrimary} self-start disabled:opacity-50`}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>

      <div className={`${card} flex flex-col gap-2`}>
        <span className="text-[15px] font-semibold">Your data</span>
        <p className={mutedText}>Download every place in your base as a .zip of markdown files.</p>
        <button
          type="button"
          onClick={exportAll}
          disabled={exporting}
          className={`${buttonSecondary} self-start disabled:opacity-50`}
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export all as files"}
        </button>
      </div>
    </div>
  );
}
