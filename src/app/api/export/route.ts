import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { serializeDateIdeaMarkdown, exportFilenames } from "@/lib/dateIdeaMarkdown";
import { createZip } from "@/lib/zip";

export async function GET(request: Request) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const ideas = await prisma.dateIdea.findMany({
    include: { tags: { include: { tag: true } }, locations: true },
    orderBy: { createdAt: "asc" },
  });

  const names = exportFilenames(ideas);
  const zip = createZip(ideas.map((idea, i) => ({ name: names[i], content: serializeDateIdeaMarkdown(idea) })));

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="certified-loverboy-export-${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
