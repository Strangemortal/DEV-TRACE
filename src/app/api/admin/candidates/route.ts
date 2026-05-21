import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Candidate } from "@/lib/db";
import { getSession, generatePassword } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await readDb();
    
    // Admin sees all candidates, Interviewer only sees candidates they created
    const candidates = session.role === "admin"
      ? db.candidates
      : db.candidates.filter((c) => c.createdBy === session.userId);

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Candidates GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, userId, assignedRepoId } = await req.json();

    if (!name || !userId || !assignedRepoId) {
      return NextResponse.json(
        { error: "Name, User ID, and Assigned Repo ID are required." },
        { status: 400 }
      );
    }

    const db = await readDb();

    // Check if user ID already exists
    const exists = db.candidates.some(
      (c) => c.userId.toLowerCase() === userId.toLowerCase()
    );
    if (exists) {
      return NextResponse.json(
        { error: "Candidate User ID already exists." },
        { status: 400 }
      );
    }

    const generatedPassword = generatePassword();

    const newCandidate: Candidate = {
      id: crypto.randomUUID(),
      name,
      userId,
      passwordHash: generatedPassword, // plain password for direct admin visibility & candidate login
      assignedRepoId,
      active: true,
      createdAt: Date.now(),
      createdBy: session.role === "admin" ? "admin" : session.userId,
    };

    db.candidates.push(newCandidate);
    await writeDb(db);

    return NextResponse.json({
      success: true,
      candidate: newCandidate,
      rawPassword: generatedPassword,
    });
  } catch (error) {
    console.error("Candidates POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
