import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Session } from "@/lib/db";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const db = await readDb();
    let sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    let role: "admin" | "candidate" = "candidate";
    let name = "";
    let candidateId: string | undefined;
    let assignedRepoId: string | undefined;

    if (userId === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      role = "admin";
      name = "Administrator";
      
      const newSession: Session = {
        userId: ADMIN_USERNAME,
        role: "admin",
        expiresAt,
      };
      db.sessions[sessionToken] = newSession;
    } else {
      // Find candidate
      const candidate = db.candidates.find(
        (c) => c.userId === userId && c.passwordHash === password && c.active
      );

      if (!candidate) {
        return NextResponse.json(
          { error: "Invalid username or password, or account deactivated." },
          { status: 401 }
        );
      }

      role = "candidate";
      name = candidate.name;
      candidateId = candidate.id;
      assignedRepoId = candidate.assignedRepoId;

      const newSession: Session = {
        userId,
        role: "candidate",
        candidateId,
        expiresAt,
      };
      db.sessions[sessionToken] = newSession;
    }

    // Save session to db
    await writeDb(db);

    // Create response
    const response = NextResponse.json({
      success: true,
      role,
      name,
      assignedRepoId,
    });

    // Set cookie
    response.cookies.set("devtrace_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
