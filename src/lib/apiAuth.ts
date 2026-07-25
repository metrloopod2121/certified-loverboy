import { NextResponse } from "next/server";
import { authenticateRequest, type AuthUser } from "@/lib/telegramAuth";

export function requireAuth(request: Request): AuthUser | NextResponse {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}

export function isAuthUser(value: AuthUser | NextResponse): value is AuthUser {
  return !(value instanceof NextResponse);
}
