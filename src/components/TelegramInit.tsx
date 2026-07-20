"use client";

import { useEffect } from "react";

const VAR_MAP: Record<string, string> = {
  bg_color: "--tg-bg",
  text_color: "--tg-text",
  hint_color: "--tg-hint",
  link_color: "--tg-link",
  button_color: "--tg-button",
  button_text_color: "--tg-button-text",
  secondary_bg_color: "--tg-secondary-bg",
};

export default function TelegramInit() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    function applyTheme() {
      if (!webApp) return;
      const root = document.documentElement.style;
      const theme = webApp.themeParams ?? {};
      for (const [key, cssVar] of Object.entries(VAR_MAP)) {
        const value = theme[key as keyof typeof theme];
        if (value) root.setProperty(cssVar, value);
      }
      if (theme.bg_color) {
        webApp.setHeaderColor?.(theme.bg_color);
        webApp.setBackgroundColor?.(theme.bg_color);
      }
    }

    applyTheme();
    webApp.onEvent("themeChanged", applyTheme);
    return () => webApp.offEvent("themeChanged", applyTheme);
  }, []);

  return null;
}
