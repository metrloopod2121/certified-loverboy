import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/telegramAuth";

export async function GET(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ telegramId: auth.telegramId, role: auth.role });
}
