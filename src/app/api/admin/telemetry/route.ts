import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, TelemetryRecord } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const db = await readDb();

    // Admin sees all telemetry, Interviewer only sees telemetry for candidates they assigned/created
    let telemetry = db.telemetry;
    if (session.role === "interviewer") {
      const myCandidateIds = db.candidates
        .filter((c) => c.createdBy === session.userId)
        .map((c) => c.id);
      telemetry = db.telemetry.filter((t) => myCandidateIds.includes(t.candidateId));
    }

    return NextResponse.json({ telemetry });
  } catch (error) {
    console.error("Telemetry GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { sessionStart, duration, stability, events } = await req.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Valid events list is required." },
        { status: 400 }
      );
    }

    const db = await readDb();

    const newRecord: TelemetryRecord = {
      id: crypto.randomUUID(),
      candidateId: session.candidateId || "",
      candidateName: session.name || "Unknown",
      repoId: session.assignedRepoId || "unknown",
      submittedAt: Date.now(),
      sessionStart: sessionStart || Date.now(),
      duration: duration || 0,
      stability: typeof stability === "number" ? stability : 100,
      events,
    };

    db.telemetry.push(newRecord);
    await writeDb(db);

    return NextResponse.json({ success: true, message: "Telemetry saved." });
  } catch (error) {
    console.error("Telemetry POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
