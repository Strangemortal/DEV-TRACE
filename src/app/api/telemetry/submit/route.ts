import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, TelemetryRecord } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized candidate session" }, { status: 403 });
    }

    const { sessionStart, duration, stability, events } = await req.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Valid events list is required." },
        { status: 400 }
      );
    }

    const db = await readDb();
    const candidateId = session.candidateId || "";

    const newRecord: TelemetryRecord = {
      id: crypto.randomUUID(),
      candidateId,
      candidateName: session.name || "Unknown",
      repoId: session.assignedRepoId || "unknown",
      submittedAt: Date.now(),
      sessionStart: sessionStart || Date.now(),
      duration: duration || 0,
      stability: typeof stability === "number" ? stability : 100,
      events,
    };

    db.telemetry.push(newRecord);

    // 1. Permanently mark candidate as completed and deactivate test access
    const candidate = db.candidates.find(
      (c) => c.id === candidateId || c.userId === session.userId
    );
    if (candidate) {
      candidate.status = "completed";
      candidate.completedAt = Date.now();
      candidate.active = false;
      candidate.finalStability = newRecord.stability;
      candidate.finalDuration = newRecord.duration;
    }

    // 2. Mark live telemetry state as completed
    if (db.liveTelemetry && candidateId && db.liveTelemetry[candidateId]) {
      db.liveTelemetry[candidateId].status = "completed";
      db.liveTelemetry[candidateId].stability = newRecord.stability;
      db.liveTelemetry[candidateId].duration = newRecord.duration;
      db.liveTelemetry[candidateId].lastActive = Date.now();
      db.liveTelemetry[candidateId].completedAt = Date.now();
    }

    // 3. Invalidate candidate active sessions in database
    for (const [token, sess] of Object.entries(db.sessions)) {
      if (sess.userId === session.userId || sess.candidateId === candidateId) {
        delete db.sessions[token];
      }
    }

    await writeDb(db);

    const res = NextResponse.json({
      success: true,
      message: "Assessment concluded. Test submitted successfully and session has been closed.",
    });

    // 4. Expire cookie so browser cannot send stale session
    res.cookies.delete("devtrace_session");

    return res;
  } catch (error) {
    console.error("Telemetry submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
