import { getInitData } from "@/lib/apiClient";

export function trackClientEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("x-telegram-init-data", getInitData());

  fetch("/api/analytics", {
    method: "POST",
    headers,
    body: JSON.stringify({ name, properties }),
    keepalive: true,
  }).catch(() => {});
}
