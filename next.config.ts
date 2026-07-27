import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's default output for statically-prerendered pages is a 1-year
  // s-maxage -- fine for a normal site, but this app redeploys often (active
  // dev) and is opened fresh inside a Telegram WebView every time. A client
  // that revalidates via 304 against a stale cached shell can end up asking
  // for JS chunks from a build that no longer exists on the server, which
  // looks like "the app just doesn't load" with no server-side error to
  // trace. The pages below have no meaningful traffic volume to justify long
  // caching, so always revalidate instead. /_next/static/* (content-hashed,
  // immutable) and /api/* (already uncached) are untouched.
  async headers() {
    const noStore = { key: "Cache-Control", value: "no-store" };
    return [
      { source: "/", headers: [noStore] },
      { source: "/map", headers: [noStore] },
      { source: "/profile", headers: [noStore] },
      { source: "/place/:id", headers: [noStore] },
    ];
  },
};

export default nextConfig;
