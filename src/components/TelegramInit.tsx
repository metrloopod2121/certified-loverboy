"use client";

import { useEffect } from "react";

const FULL_HEIGHT_TOP_FALLBACK = 52;

// The app always uses the light design regardless of the user's Telegram
// theme, so the native header/background just gets set once to match it.
const APP_BG = "#fff9ee";

export default function TelegramInit() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

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

    webApp.setHeaderColor?.(APP_BG);
    webApp.setBackgroundColor?.(APP_BG);

    applySafeArea();
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
      webApp.offEvent("safeAreaChanged", applySafeArea);
      webApp.offEvent("contentSafeAreaChanged", applySafeArea);
      webApp.offEvent("fullscreenChanged", applySafeArea);
      webApp.offEvent("viewportChanged", applySafeArea);
    };
  }, []);

  return null;
}
