import { auth } from "@/auth";
import { routes } from "@/routes";
import { roleConfig } from "@/shared/auth/roleConfig";
import { MemberRole } from "@/shared/backend/models/auth/schema";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL(routes.auth.login(), req.url);
  return NextResponse.redirect(loginUrl);
}

function redirectToForbiddenErrorPage(req: NextRequest) {
  const forbiddenUrl = new URL(routes.notAllowed, req.url);
  return NextResponse.redirect(forbiddenUrl);
}

function redirectToDefaultPage(role: MemberRole, req: NextRequest) {
  const defaultRedirect = roleConfig[role].defaultRedirect;
  const defaultUrl = new URL(defaultRedirect, req.url);
  return NextResponse.redirect(defaultUrl);
}

export default (auth as any)(async (req: NextRequest) => {
  const token = await getJWT(req);
  const roles = token?.memberRoles;
  const pathname = req.nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", req.url);

  // Do not protect customer/inquiries
  //   if (pathname.startsWith(routes.customer.inquiries.index)) {
  //     return NextResponse.next({
  //       request: {
  //         headers: requestHeaders,
  //       },
  //     });
  //   }

  // Redirect to login if token is expired
  if (token && token.expires && new Date().getTime() / 1000 > token.expires) {
    return redirectToLogin(req);
  }

  // Redirect to login if user is not authenticated
  if (!token || !roles || roles.length === 0) {
    return redirectToLogin(req);
  }

  // Special case: Allow access to sales/inquiries for all authenticated users
  //   if (pathname.startsWith(routes.sales.inquiries.index)) {
  //     return NextResponse.next({
  //       request: {
  //         headers: requestHeaders,
  //       },
  //     });
  //   }

  // redirect to default page when trying to access root path
  if (pathname === "/" && roles.length > 0 && roles[0]) {
    return redirectToDefaultPage(roles[0], req);
  }

  // Check if user has permission to access the requested path
  const hasAccess = roles.some((role) => {
    const config = roleConfig[role];
    return config.allowedPaths.some((path) => pathname.startsWith(path));
  });

  if (!hasAccess) {
    return redirectToForbiddenErrorPage(req);
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return res;
});

export const config = {
  matcher: ["/", "/admin/:path*", "/kunde/:path*", "/operations/:path*"],
};

async function getJWT(req: NextRequest) {
  const isSecure = req.nextUrl.protocol === "https:";
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
    secureCookie: isSecure,
    salt: cookieName,
  });

  return jwt;
}
