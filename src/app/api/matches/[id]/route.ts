import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request, ["OWNER", "PARTNER"]);
  if (!isAuthUser(auth)) return auth;

  const body = await request.json();
  if (typeof body.isFavorite !== "boolean") {
    return NextResponse.json({ error: "isFavorite must be a boolean" }, { status: 400 });
  }

  const { id } = await params;
  const match = await prisma.match.update({
    where: { id },
    data: { isFavorite: body.isFavorite },
    select: { id: true, isFavorite: true },
  });

  return NextResponse.json(match);
}
