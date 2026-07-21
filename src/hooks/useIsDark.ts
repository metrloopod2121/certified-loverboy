"use client";

import { useEffect, useState } from "react";

export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const scheme = window.Telegram?.WebApp?.colorScheme;
    if (scheme) {
      const raf = requestAnimationFrame(() => setDark(scheme === "dark"));
      return () => cancelAnimationFrame(raf);
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const raf = requestAnimationFrame(() => setDark(media.matches));
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    media.addEventListener("change", listener);
    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", listener);
    };
  }, []);
  return dark;
}
