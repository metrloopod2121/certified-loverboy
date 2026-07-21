import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const matches = await prisma.match.findMany({
    include: {
      dateIdea: { include: { tags: { include: { tag: true } }, locations: true } },
    },
    orderBy: { matchedAt: "desc" },
  });

  return NextResponse.json(matches);
}
