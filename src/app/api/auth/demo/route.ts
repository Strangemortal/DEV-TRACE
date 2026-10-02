import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Session, Candidate } from "@/lib/db";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { role = "candidate", repoId = "python-challenge" } = await req.json();

    const db = await readDb();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    if (role === "admin") {
      const sessionToken = `admin_${crypto.randomUUID()}`;
      const newSession: Session = {
        userId: ADMIN_USERNAME,
        role: "admin",
        expiresAt,
      };
      db.sessions[sessionToken] = newSession;
      await writeDb(db);

      const response = NextResponse.json({
        success: true,
        role: "admin",
        redirect: "/admin",
        name: "Administrator",
      });

      response.cookies.set("devtrace_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    if (role === "interviewer") {
      const sessionToken = `interviewer_${crypto.randomUUID()}`;
      // Ensure at least one interviewer exists
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

      const response = NextResponse.json({
        success: true,
        role: "interviewer",
        redirect: "/interviewer",
        name: interviewer.name,
      });

      response.cookies.set("devtrace_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    // Default: Candidate Demo
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

    const sessionToken = `candidate_${crypto.randomUUID()}`;
    const newSession: Session = {
      userId: demoCandidate.userId,
      role: "candidate",
      candidateId: demoCandidate.id,
      expiresAt,
    };
    db.sessions[sessionToken] = newSession;
    await writeDb(db);

    const response = NextResponse.json({
      success: true,
      role: "candidate",
      redirect: "/ide",
      name: demoCandidate.name,
      assignedRepoId: demoCandidate.assignedRepoId,
    });

    response.cookies.set("devtrace_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Internal server error during demo setup." },
      { status: 500 }
    );
  }
}
