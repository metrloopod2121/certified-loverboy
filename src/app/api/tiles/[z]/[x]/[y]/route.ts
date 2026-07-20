const SUBDOMAINS = ["a", "b", "c"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const s = SUBDOMAINS[Math.floor(Math.random() * SUBDOMAINS.length)];

  const upstream = await fetch(`https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: { "User-Agent": "certified-loverboy/1.0 (personal date-planning app)" },
  });

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
