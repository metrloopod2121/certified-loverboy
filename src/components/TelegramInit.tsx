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

    function applySafeArea() {
      if (!webApp) return;
      const root = document.documentElement.style;
      const device = webApp.safeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
      const content = webApp.contentSafeAreaInset ?? { top: 0, bottom: 0, left: 0, right: 0 };
      root.setProperty("--safe-top", `${Math.max(device.top, content.top)}px`);
      root.setProperty("--safe-bottom", `${Math.max(device.bottom, content.bottom)}px`);
    }

    applyTheme();
    applySafeArea();
    webApp.onEvent("themeChanged", applyTheme);
    webApp.onEvent("safeAreaChanged", applySafeArea);
    webApp.onEvent("contentSafeAreaChanged", applySafeArea);
    webApp.onEvent("fullscreenChanged", applySafeArea);
    return () => {
      webApp.offEvent("themeChanged", applyTheme);
      webApp.offEvent("safeAreaChanged", applySafeArea);
      webApp.offEvent("contentSafeAreaChanged", applySafeArea);
      webApp.offEvent("fullscreenChanged", applySafeArea);
    };
  }, []);

  return null;
}
