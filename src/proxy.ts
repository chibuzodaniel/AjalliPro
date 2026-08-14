import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/register"];

const APPROVER_ONLY = ["/approvals", "/settings"];
const SUPER_ADMIN_ONLY = ["/settings"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (token) {
    const role = token.role as string;
    const isApprover = role === "ADMIN" || role === "SUPER_ADMIN";
    if (SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p)) && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (APPROVER_ONLY.some((p) => pathname.startsWith(p)) && !isApprover) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
