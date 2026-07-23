import { NextResponse } from "next/server";
import { requireAuth, isAuthUser } from "@/lib/apiAuth";
import { mintExportToken } from "@/lib/exportToken";

export async function POST(request: Request) {
  const auth = requireAuth(request, ["OWNER"]);
  if (!isAuthUser(auth)) return auth;

  const token = mintExportToken();
  if (!token) return NextResponse.json({ error: "Export unavailable" }, { status: 500 });
  return NextResponse.json({ token });
}
