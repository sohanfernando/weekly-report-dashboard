import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "wr_token";

const AUTH_PATHS = ["/login", "/register"];

/**
 * A cheap first-pass redirect so a signed-out visitor never sees an app page
 * flash before the client finds out.
 *
 * This checks only that a session cookie is *present*. It cannot verify the
 * signature — the secret lives on the backend, and the token is httpOnly by
 * design. Every real access decision is made by the API; this is purely to
 * avoid a pointless render.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));
  // The landing page is open to everyone: a visitor learns what the app is,
  // and someone signed in gets an "Open workspace" link from its nav.
  const isLanding = pathname === "/";

  if (!hasSession && !isAuthPage && !isLanding) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can send them back.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
