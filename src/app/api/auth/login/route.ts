import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Session } from "@/lib/db";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId, password, loginType } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const db = await readDb();
    let sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    let role: "admin" | "candidate" | "interviewer";
    let name = "";
    let candidateId: string | undefined;
    let assignedRepoId: string | undefined;

    if (loginType === "staff") {
      if (userId === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        role = "admin";
        name = "Administrator";
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
          role,
          name,
        });

        response.cookies.set("devtrace_session", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60,
          path: "/",
        });

        return response;
      } else {
        // Check if candidate tried to login on staff portal
        const isCandidate = db.candidates.some(
          (c) => c.userId.toLowerCase() === userId.toLowerCase() && c.passwordHash === password
        );
        if (isCandidate) {
          return NextResponse.json(
            { error: "Candidate accounts cannot access the Staff & Invigilator Portal. Please use the Candidate Portal." },
            { status: 403 }
          );
        }

        // Find interviewer
        const interviewer = db.interviewers?.find(
          (i) => i.userId.toLowerCase() === userId.toLowerCase() && i.passwordHash === password
        );

        if (!interviewer) {
          return NextResponse.json(
            { error: "Invalid staff username or password." },
            { status: 401 }
          );
        }

        role = "interviewer";
        name = interviewer.name;
        const sessionToken = `interviewer_${crypto.randomUUID()}`;

        const newSession: Session = {
          userId: interviewer.userId,
          role: "interviewer",
          expiresAt,
        };
        db.sessions[sessionToken] = newSession;
        await writeDb(db);

        const response = NextResponse.json({
          success: true,
          role,
          name,
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
    } else {
      // Candidate login check
      // First check if staff tried to login on candidate portal
      if (
        (userId === ADMIN_USERNAME && password === ADMIN_PASSWORD) ||
        db.interviewers?.some((i) => i.userId.toLowerCase() === userId.toLowerCase() && i.passwordHash === password)
      ) {
        return NextResponse.json(
          { error: "Staff & Invigilator accounts cannot log in through the Candidate Portal. Please use the Staff Portal (/staff)." },
          { status: 403 }
        );
      }

      // Find candidate
      const candidate = db.candidates.find(
        (c) => c.userId.toLowerCase() === userId.toLowerCase() && c.passwordHash === password && c.active
      );

      if (!candidate) {
        return NextResponse.json(
          { error: "Invalid candidate ID or access token, or account deactivated." },
          { status: 401 }
        );
      }

      role = "candidate";
      name = candidate.name;
      candidateId = candidate.id;
      assignedRepoId = candidate.assignedRepoId;
      const sessionToken = `candidate_${crypto.randomUUID()}`;

      const newSession: Session = {
        userId,
        role: "candidate",
        candidateId,
        expiresAt,
      };
      db.sessions[sessionToken] = newSession;
      await writeDb(db);

      const response = NextResponse.json({
        success: true,
        role,
        name,
        assignedRepoId,
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
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
