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

/** Downloads a file that needs auth, via a short-lived signed token instead of the usual
 *  header — a blob: URL from fetch() doesn't reliably save on WebKit (Safari/Telegram iOS
 *  and macOS both silently navigate to the raw bytes instead of prompting to save), so this
 *  hands Telegram's native downloadFile (or, failing that, a plain navigation) a real URL. */
export async function downloadWithToken(mintPath: string, exportPath: string, filename: string) {
  const { token } = await apiFetch(mintPath, { method: "POST" });
  const url = `${window.location.origin}${exportPath}?token=${encodeURIComponent(token)}`;

  const webApp = window.Telegram?.WebApp;
  if (webApp?.downloadFile) {
    webApp.downloadFile({ url, file_name: filename });
  } else {
    window.location.href = url;
  }
}
