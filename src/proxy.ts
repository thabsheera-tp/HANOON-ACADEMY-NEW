import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow Admin Login page without redirection loop
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isTeacherRoute = pathname.startsWith("/teacher");

  // Only protect /admin and /teacher routes
  if (!isAdminRoute && !isTeacherRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("hanoon_auth_session")?.value;

  // 2. Unauthenticated users -> Redirect to /admin/login for admin, /login for teacher
  if (!sessionCookie) {
    if (isAdminRoute) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      loginUrl.searchParams.set("reason", "unauthenticated");
      return NextResponse.redirect(loginUrl);
    }
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
      if (isAdminRoute) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("reason", "expired");
        return NextResponse.redirect(loginUrl);
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("portal", "staff");
      loginUrl.searchParams.set("reason", "expired");
      return NextResponse.redirect(loginUrl);
    }

    // 3. Protect /admin route: accessible by Super Admin ('admin', 'super_admin') AND Verification Staff ('verification_admin')
    if (isAdminRoute) {
      const isAllowedAdmin = role === "admin" || role === "super_admin" || role === "verification_admin";
      if (!isAllowedAdmin) {
        if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        }
        return NextResponse.redirect(new URL("/admin/login?error=admin_only", request.url));
      }
    }

    // 4. Protect /teacher route: accessible by role === 'teacher' or 'admin' or 'super_admin'
    if (isTeacherRoute) {
      if (role !== "teacher" && role !== "admin" && role !== "super_admin") {
        return NextResponse.redirect(new URL("/login?portal=staff&error=teacher_only", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (isAdminRoute) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", "invalid_session");
      return NextResponse.redirect(loginUrl);
    }
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
