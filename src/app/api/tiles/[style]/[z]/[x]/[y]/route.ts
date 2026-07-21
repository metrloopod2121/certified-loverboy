const SUBDOMAINS = ["a", "b", "c", "d"];
const ALLOWED_STYLES = new Set(["light_all", "dark_all"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ style: string; z: string; x: string; y: string }> }
) {
  const { style, z, x, y } = await params;
  if (!ALLOWED_STYLES.has(style)) {
    return new Response(null, { status: 400 });
  }

  const s = SUBDOMAINS[Math.floor(Math.random() * SUBDOMAINS.length)];

  const upstream = await fetch(
    `https://${s}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}.png`,
    { headers: { "User-Agent": "certified-loverboy/1.0 (personal date-planning app)" } }
  );

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
