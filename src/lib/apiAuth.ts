import { NextResponse } from "next/server";
import { authenticateRequest, type AuthUser } from "@/lib/telegramAuth";

export function requireAuth(
  request: Request,
  allowedRoles: Array<AuthUser["role"]>
): AuthUser | NextResponse {
  const auth = authenticateRequest(request);
  if (!auth || !allowedRoles.includes(auth.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return auth;
}

export function isAuthUser(value: AuthUser | NextResponse): value is AuthUser {
  return !(value instanceof NextResponse);
}
