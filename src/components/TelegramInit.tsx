"use client";

import { useEffect } from "react";

export default function TelegramInit() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;
    webApp.ready();
    webApp.expand();
  }, []);

  return null;
}
