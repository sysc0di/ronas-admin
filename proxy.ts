import { NextResponse, type NextRequest } from "next/server";

/**
 * The panel lives under `/admin`; the site root just points there so opening
 * the app bare does not 404.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
