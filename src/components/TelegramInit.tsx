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

const FULL_HEIGHT_TOP_FALLBACK = 52;

export default function TelegramInit() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

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
      root.setProperty("--tg-safe-top-js", `${Math.max(device.top, content.top)}px`);
      root.setProperty("--tg-safe-bottom-js", `${Math.max(device.bottom, content.bottom)}px`);

      // Some iOS Main Mini Apps briefly report a zero content inset even though
      // Telegram's back/menu controls overlay the top edge. Keep a fallback
      // only while the sheet is expanded, then remove it when Telegram reports
      // a sufficient content-safe inset itself.
      const needsTopFallback = webApp.isExpanded && content.top < FULL_HEIGHT_TOP_FALLBACK;
      root.setProperty("--tg-expanded-top-fallback", needsTopFallback ? `${FULL_HEIGHT_TOP_FALLBACK}px` : "0px");
    }

    applyTheme();
    applySafeArea();
    webApp.onEvent("themeChanged", applyTheme);
    webApp.onEvent("safeAreaChanged", applySafeArea);
    webApp.onEvent("contentSafeAreaChanged", applySafeArea);
    webApp.onEvent("fullscreenChanged", applySafeArea);
    webApp.onEvent("viewportChanged", applySafeArea);
    webApp.ready();
    webApp.expand();
    try {
      webApp.requestFullscreen?.();
    } catch {
      // older Telegram clients don't support fullscreen — ignore
    }

    const frame = requestAnimationFrame(applySafeArea);
    const settled = window.setTimeout(applySafeArea, 350);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      webApp.offEvent("themeChanged", applyTheme);
      webApp.offEvent("safeAreaChanged", applySafeArea);
      webApp.offEvent("contentSafeAreaChanged", applySafeArea);
      webApp.offEvent("fullscreenChanged", applySafeArea);
      webApp.offEvent("viewportChanged", applySafeArea);
    };
  }, []);

  return null;
}
