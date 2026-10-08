import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("devtrace_session")?.value;

  let role: "admin" | "interviewer" | "candidate" | null = null;
  if (token) {
    if (token.startsWith("admin_")) {
      role = "admin";
    } else if (token.startsWith("interviewer_")) {
      role = "interviewer";
    } else if (token.startsWith("candidate_")) {
      role = "candidate";
    }
  }

  // 1. Root route "/" (Redirect to role workspace or login)
  if (pathname === "/") {
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "interviewer") return NextResponse.redirect(new URL("/interviewer", req.url));
    if (role === "candidate") return NextResponse.redirect(new URL("/ide", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. Dedicated Staff gateway "/staff"
  if (pathname === "/staff") {
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "interviewer") return NextResponse.redirect(new URL("/interviewer", req.url));
    if (role === "candidate") return NextResponse.redirect(new URL("/ide", req.url));
    return NextResponse.redirect(new URL("/login/staff", req.url));
  }

  // 3. Admin Protected Routes ("/admin", "/admin/*")
  if (pathname.startsWith("/admin")) {
    if (role === "candidate") {
      // Candidate attempting URL tampering to reach admin portal
      return NextResponse.redirect(new URL("/ide", req.url));
    }
    if (role === "interviewer") {
      // Interviewer attempting to access admin-only area
      return NextResponse.redirect(new URL("/interviewer", req.url));
    }
    if (!role) {
      return NextResponse.redirect(new URL("/login/staff", req.url));
    }
    return NextResponse.next();
  }

  // 4. Interviewer / Invigilator Protected Routes ("/interviewer", "/interviewer/*")
  if (pathname.startsWith("/interviewer")) {
    if (role === "candidate") {
      // Candidate attempting URL tampering to reach invigilator portal
      return NextResponse.redirect(new URL("/ide", req.url));
    }
    if (!role) {
      return NextResponse.redirect(new URL("/login/staff", req.url));
    }
    return NextResponse.next();
  }

  // 5. Candidate Protected Routes ("/ide", "/ide/*")
  if (pathname.startsWith("/ide")) {
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "interviewer") return NextResponse.redirect(new URL("/interviewer", req.url));
    if (!role) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  // 6. Admin API Protection ("/api/admin/*" and staff AI routes)
  if (pathname.startsWith("/api/admin") || pathname === "/api/ai/generate-challenge" || pathname === "/api/ai/evaluate-candidate") {
    if (role !== "admin" && role !== "interviewer") {
      return NextResponse.json(
        { error: "Access denied. Invigilator or Administrator permissions required." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 7. Candidate Login Page ("/login")
  if (pathname === "/login") {
    if (role === "candidate") return NextResponse.redirect(new URL("/ide", req.url));
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "interviewer") return NextResponse.redirect(new URL("/interviewer", req.url));
    return NextResponse.next();
  }

  // 8. Staff / Invigilator Login Page ("/login/staff")
  if (pathname === "/login/staff") {
    if (role === "candidate") return NextResponse.redirect(new URL("/ide", req.url));
    if (role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    if (role === "interviewer") return NextResponse.redirect(new URL("/interviewer", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/staff",
    "/login",
    "/login/staff",
    "/admin/:path*",
    "/interviewer/:path*",
    "/ide/:path*",
    "/api/admin/:path*",
    "/api/ai/:path*",
  ],
};
