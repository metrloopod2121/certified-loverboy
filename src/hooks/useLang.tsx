"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";
import { t as translate, isLang, type Lang, type StringKey } from "@/lib/i18n";

// The app's UI copy has always shipped in English, so that's the default shown until the
// user's stored preference loads -- avoids a flash of Russian for existing English-only users.
const UI_DEFAULT_LANG: Lang = "en";

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void };

const LangContext = createContext<LangContextValue>({ lang: UI_DEFAULT_LANG, setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(UI_DEFAULT_LANG);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/profile/language")
      .then((data) => {
        if (!cancelled && isLang(data.language)) setLangState(data.language);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    apiFetch("/api/profile/language", { method: "PATCH", body: JSON.stringify({ language: next }) }).catch(() => {});
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

export function useT(): (key: StringKey) => string {
  const { lang } = useLang();
  return (key: StringKey) => translate(lang, key);
}
