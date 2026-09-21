import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, revokeSessionToken } from "@/lib/cms/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) revokeSessionToken(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
