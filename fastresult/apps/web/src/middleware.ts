import { type NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/register"];
const PROTECTED_PREFIX = "/dashboard";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("fr_token")?.value;
  const isAuthenticated = Boolean(token);

  // Already authenticated → redirect away from auth pages
  if (isAuthenticated && PUBLIC.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Not authenticated → redirect to login if hitting a protected route
  if (!isAuthenticated && pathname.startsWith(PROTECTED_PREFIX)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
