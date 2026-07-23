import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { serializeDateIdeaMarkdown, exportFilenames } from "@/lib/dateIdeaMarkdown";
import { createZip } from "@/lib/zip";
import { verifyExportToken } from "@/lib/exportToken";

export async function GET(request: Request) {
  // Plain navigation and Telegram.WebApp.downloadFile can't send the usual
  // x-telegram-init-data header, so a short-lived signed token is accepted too.
  const token = new URL(request.url).searchParams.get("token");
  if (!verifyExportToken(token)) {
    const auth = requireAuth(request, ["OWNER"]);
    if (!isAuthUser(auth)) return auth;
  }

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
