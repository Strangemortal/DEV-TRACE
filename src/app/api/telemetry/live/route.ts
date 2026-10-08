import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, LiveTelemetryState } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET: Staff (Admin / Interviewer) reads active live telemetry feeds
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await readDb();
    let liveRecords = Object.values(db.liveTelemetry || {});

    // Filter by interviewer permissions
    if (session.role === "interviewer") {
      const myCandidateIds = db.candidates
        .filter((c) => c.createdBy === session.userId)
        .map((c) => c.id);
      liveRecords = liveRecords.filter((rec) => myCandidateIds.includes(rec.candidateId));
    }

    // Sort by last active desc
    liveRecords.sort((a, b) => b.lastActive - a.lastActive);

    return NextResponse.json({
      success: true,
      liveTelemetry: liveRecords,
      totalActive: liveRecords.filter((r) => Date.now() - r.lastActive < 30000).length,
    });
  } catch (error) {
    console.error("Live telemetry GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Candidate IDE periodically syncs live metrics
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "candidate" || !session.candidateId) {
      return NextResponse.json({ error: "Unauthorized candidate" }, { status: 403 });
    }

    const body = await req.json();
    const { stability, duration, activeFile, eventCount, tabSwitches, fullscreenEscapes, recentEvents } = body;

    const db = await readDb();
    if (!db.liveTelemetry) {
      db.liveTelemetry = {};
    }

    const candidate = db.candidates.find((c) => c.id === session.candidateId);
    const isCandidateActive = candidate ? candidate.active : true;

    const liveState: LiveTelemetryState = {
      candidateId: session.candidateId,
      candidateName: session.name || "Candidate",
      repoId: session.assignedRepoId || "unknown",
      lastActive: Date.now(),
      stability: typeof stability === "number" ? stability : 100,
      duration: typeof duration === "number" ? duration : 0,
      activeFile: activeFile || "README.md",
      eventCount: typeof eventCount === "number" ? eventCount : 0,
      tabSwitches: typeof tabSwitches === "number" ? tabSwitches : 0,
      fullscreenEscapes: typeof fullscreenEscapes === "number" ? fullscreenEscapes : 0,
      recentEvents: Array.isArray(recentEvents) ? recentEvents.slice(-20) : [],
      status: isCandidateActive ? "active" : "paused",
    };

    db.liveTelemetry[session.candidateId] = liveState;
    await writeDb(db);

    return NextResponse.json({
      success: true,
      status: isCandidateActive ? "active" : "paused",
      active: isCandidateActive,
    });
  } catch (error) {
    console.error("Live telemetry POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
