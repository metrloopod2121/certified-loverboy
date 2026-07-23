export function getInitData(): string {
  if (typeof window === "undefined") return "";
  // ?debug_init=<initData> lets you open the app in a plain browser for debugging —
  // still requires a validly HMAC-signed initData string, no new attack surface.
  const debugInit = new URLSearchParams(window.location.search).get("debug_init");
  if (debugInit) return debugInit;
  return window.Telegram?.WebApp?.initData ?? "";
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("x-telegram-init-data", getInitData());
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

/** Fetches a file with the Telegram auth header and saves it via the browser's
 *  normal download flow (a plain `<a href>` navigation can't carry that header). */
export async function downloadFile(path: string, fallbackFilename: string) {
  const res = await fetch(path, { headers: { "x-telegram-init-data": getInitData() } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
