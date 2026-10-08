import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTeacherRoute = pathname.startsWith("/teacher");

  // Only protect /admin and /teacher routes
  if (!isAdminRoute && !isTeacherRoute) {
    return NextResponse.next();
  }


  const sessionCookie = request.cookies.get("hanoon_auth_session")?.value;

  // 1. Unauthenticated users -> Redirect to /login with staff portal active
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("portal", "staff");
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("reason", "unauthenticated");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    const role = sessionData?.user?.role;
    const expiresAt = sessionData?.expiresAt;

    // Check session expiry
    if (expiresAt && expiresAt < Date.now()) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("portal", "staff");
      loginUrl.searchParams.set("reason", "expired");
      return NextResponse.redirect(loginUrl);
    }

    // 2. Protect /admin route: accessible by Super Admin ('admin', 'super_admin') AND Verification Staff ('verification_admin')
    if (isAdminRoute) {
      const isAllowedAdmin = role === "admin" || role === "super_admin" || role === "verification_admin";
      if (!isAllowedAdmin) {
        if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        }
        return NextResponse.redirect(new URL("/login?portal=staff&error=admin_only", request.url));
      }
    }

    // 3. Protect /teacher route: accessible by role === 'teacher' or 'admin' or 'super_admin'
    if (isTeacherRoute) {
      if (role !== "teacher" && role !== "admin" && role !== "super_admin") {
        return NextResponse.redirect(new URL("/login?portal=staff&error=teacher_only", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("portal", "staff");
    loginUrl.searchParams.set("reason", "invalid_session");
    return NextResponse.redirect(loginUrl);
  }
}

export default proxy;

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};
