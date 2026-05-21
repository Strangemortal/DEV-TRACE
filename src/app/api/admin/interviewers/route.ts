import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Interviewer } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await readDb();
    return NextResponse.json({ interviewers: db.interviewers || [] });
  } catch (error) {
    console.error("Interviewers GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, userId, password } = await req.json();

    if (!name || !userId || !password) {
      return NextResponse.json(
        { error: "Name, User ID, and Password are required." },
        { status: 400 }
      );
    }

    const db = await readDb();

    // Check if interviewer user ID already exists
    const existsInInterviewers = db.interviewers?.some(
      (i) => i.userId.toLowerCase() === userId.toLowerCase()
    );
    const isStaticAdmin = userId.toLowerCase() === "admin";
    if (existsInInterviewers || isStaticAdmin) {
      return NextResponse.json(
        { error: "Interviewer User ID already exists." },
        { status: 400 }
      );
    }

    const newInterviewer: Interviewer = {
      id: crypto.randomUUID(),
      name,
      userId,
      passwordHash: password, // plain text for ease of verification/retrieval
      createdAt: Date.now(),
    };

    if (!db.interviewers) {
      db.interviewers = [];
    }
    db.interviewers.push(newInterviewer);
    await writeDb(db);

    return NextResponse.json({
      success: true,
      interviewer: newInterviewer,
    });
  } catch (error) {
    console.error("Interviewers POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
