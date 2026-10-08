import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Session, Candidate } from "@/lib/db";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";
import crypto from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function createDemoSession(role: string, repoId: string, req: NextRequest, isGet = false) {
  const db = await readDb();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  let sessionToken = "";
  let redirectPath = "/ide";
  let responseData: any = {};

  if (role === "admin") {
    sessionToken = `admin_${crypto.randomUUID()}`;
    const newSession: Session = {
      userId: ADMIN_USERNAME,
      role: "admin",
      expiresAt,
    };
    db.sessions[sessionToken] = newSession;
    await writeDb(db);
    redirectPath = "/admin";
    responseData = {
      success: true,
      role: "admin",
      redirect: "/admin",
      name: "Administrator",
    };
  } else if (role === "interviewer") {
    sessionToken = `interviewer_${crypto.randomUUID()}`;
    let interviewer = db.interviewers?.[0];
    if (!interviewer) {
      interviewer = {
        id: crypto.randomUUID(),
        name: "Demo Interviewer",
        userId: "demo_interviewer",
        passwordHash: "demo123",
        createdAt: Date.now(),
      };
      db.interviewers = [interviewer];
    }

    const newSession: Session = {
      userId: interviewer.userId,
      role: "interviewer",
      expiresAt,
    };
    db.sessions[sessionToken] = newSession;
    await writeDb(db);
    redirectPath = "/interviewer";
    responseData = {
      success: true,
      role: "interviewer",
      redirect: "/interviewer",
      name: interviewer.name,
    };
  } else {
    // Default: candidate
    let demoCandidate = db.candidates.find((c) => c.userId === "demo_candidate");
    if (!demoCandidate) {
      demoCandidate = {
        id: crypto.randomUUID(),
        name: "Demo Candidate (Exhibition)",
        userId: "demo_candidate",
        passwordHash: "demo123",
        assignedRepoId: repoId || "python-challenge",
        active: true,
        status: "active",
        createdAt: Date.now(),
        createdBy: "admin",
      };
      db.candidates.unshift(demoCandidate);
    } else {
      demoCandidate.assignedRepoId = repoId || demoCandidate.assignedRepoId || "python-challenge";
      demoCandidate.active = true;
      demoCandidate.status = "active";
    }

    sessionToken = `candidate_${crypto.randomUUID()}`;
    const newSession: Session = {
      userId: demoCandidate.userId,
      role: "candidate",
      candidateId: demoCandidate.id,
      expiresAt,
    };
    db.sessions[sessionToken] = newSession;
    await writeDb(db);
    redirectPath = "/ide";
    responseData = {
      success: true,
      role: "candidate",
      redirect: "/ide",
      name: demoCandidate.name,
      assignedRepoId: demoCandidate.assignedRepoId,
    };
  }

  if (isGet) {
    const redirectUrl = new URL(redirectPath, req.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("devtrace_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });
    return response;
  }

  const response = NextResponse.json(responseData, { headers: corsHeaders });
  response.cookies.set("devtrace_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.nextUrl.searchParams.get("role") || "candidate";
    const repoId = req.nextUrl.searchParams.get("repoId") || "python-challenge";
    return await createDemoSession(role, repoId, req, true);
  } catch (error) {
    console.error("Demo login GET error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const role = body.role || "candidate";
    const repoId = body.repoId || "python-challenge";
    return await createDemoSession(role, repoId, req, false);
  } catch (error) {
    console.error("Demo login POST error:", error);
    return NextResponse.json(
      { error: "Internal server error during demo setup." },
      { status: 500, headers: corsHeaders }
    );
  }
}
