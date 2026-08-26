import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/register"];

const APPROVER_ONLY = ["/approvals", "/settings"];
// Expenses is viewable by Admin Staff too (not just Admin/Super Admin) —
// the page itself hides payment-recording controls from non-approvers.
const STAFF_OR_ABOVE = ["/expenses"];
// /settings is reachable by Admin+ (page itself hides Super-Admin-only
// sections from a plain Admin); nothing currently needs a stricter,
// Super-Admin-only route gate.
const SUPER_ADMIN_ONLY: string[] = [];

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
    if (STAFF_OR_ABOVE.some((p) => pathname.startsWith(p)) && !isApprover && role !== "ADMIN_STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // PWA assets must stay reachable with no auth check — the browser fetches
  // manifest.webmanifest/sw.js/icons directly (e.g. iOS "Add to Home
  // Screen"), often before the user has ever logged in, and a redirect to
  // /login instead of the real file breaks installability entirely.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
