import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH: Stop / Resume Candidate Assessment Test
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const db = await readDb();

    const candidateIndex = db.candidates.findIndex((c) => c.id === id);
    if (candidateIndex === -1) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = db.candidates[candidateIndex];

    // Interviewer can only manage their own candidates
    if (session.role === "interviewer" && candidate.createdBy !== session.userId) {
      return NextResponse.json({ error: "Unauthorized to modify this candidate" }, { status: 403 });
    }

    // Toggle or explicitly set active status
    const newActive = typeof body.active === "boolean" ? body.active : !candidate.active;
    db.candidates[candidateIndex].active = newActive;
    db.candidates[candidateIndex].status = newActive ? "active" : "paused";

    // Update session statuses in place so candidate automatically locks/unlocks
    const candidateUserId = candidate.userId;
    Object.keys(db.sessions).forEach((token) => {
      if (db.sessions[token].candidateId === id || db.sessions[token].userId === candidateUserId) {
        db.sessions[token].status = newActive ? "active" : "paused";
      }
    });

    if (db.liveTelemetry && db.liveTelemetry[id]) {
      db.liveTelemetry[id].status = newActive ? "active" : "paused";
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      active: newActive,
      status: newActive ? "active" : "paused",
      message: newActive ? "Candidate assessment test resumed." : "Candidate assessment test paused.",
      candidate: db.candidates[candidateIndex],
    });
  } catch (error) {
    console.error("Candidate PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove Candidate from active roster (Telemetry logs preserved)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const db = await readDb();

    const candidateIndex = db.candidates.findIndex((c) => c.id === id);
    if (candidateIndex === -1) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const candidate = db.candidates[candidateIndex];

    // Interviewer can only delete their own candidates
    if (session.role === "interviewer" && candidate.createdBy !== session.userId) {
      return NextResponse.json({ error: "Unauthorized to delete this candidate" }, { status: 403 });
    }

    // Remove candidate from candidate list
    const candidateUserId = candidate.userId;
    db.candidates.splice(candidateIndex, 1);

    // Invalidate any active sessions
    Object.keys(db.sessions).forEach((token) => {
      if (db.sessions[token].candidateId === id || db.sessions[token].userId === candidateUserId) {
        delete db.sessions[token];
      }
    });

    // NOTE: db.telemetry is INTENTIONALLY NOT TOUCHED.
    // Telemetry logs, keystrokes, diffs, and AI reports remain permanently saved in the system.

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Candidate removed from roster. Session telemetry logs preserved.",
    });
  } catch (error) {
    console.error("Candidate DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
