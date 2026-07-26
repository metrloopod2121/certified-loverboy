"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackClientEvent } from "@/lib/clientAnalytics";

const SESSION_OPEN_KEY = "certified-loverboy:analytics-opened";

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_OPEN_KEY)) return;
    window.sessionStorage.setItem(SESSION_OPEN_KEY, "1");
    trackClientEvent("app_opened", {
      platform: window.Telegram?.WebApp?.platform ?? "unknown",
      version: window.Telegram?.WebApp?.version ?? "unknown",
    });
  }, []);

  useEffect(() => {
    trackClientEvent("screen_view", { path: pathname });
  }, [pathname]);

  return null;
}
