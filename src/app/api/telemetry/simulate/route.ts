import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, LiveTelemetryState } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { scenario = "ai-cheater" } = await req.json();

    const db = await readDb();
    if (!db.liveTelemetry) {
      db.liveTelemetry = {};
    }

    const now = Date.now();

    if (scenario === "ai-cheater") {
      const candidateId = "sim-alex-mercer";
      const simSession: LiveTelemetryState = {
        candidateId,
        candidateName: "Alex Mercer (Simulation: LLM Ingestion)",
        repoId: "django-orm-store",
        lastActive: now,
        stability: 52, // Drop to 52% due to paste burst & tab switch
        duration: 195,
        activeFile: "store/services/order_service.py",
        eventCount: 42,
        tabSwitches: 3,
        status: "active",
        recentEvents: [
          {
            type: "FILE_OPEN",
            meta: { file: "store/services/order_service.py" },
            ts: new Date(now - 120000).toISOString(),
          },
          {
            type: "KEYSTROKE_BATCH",
            meta: { added: 18, deleted: 2 },
            ts: new Date(now - 90000).toISOString(),
          },
          {
            type: "FOCUS_LOST",
            meta: { reason: "window_blur", durationSec: 14 },
            ts: new Date(now - 60000).toISOString(),
          },
          {
            type: "PASTE_DETECTED",
            meta: {
              pasted_length: 245,
              durationMs: 14,
              file: "store/services/order_service.py",
              suspicion: "High LLM Ingestion Pattern",
            },
            ts: new Date(now - 45000).toISOString(),
          },
          {
            type: "EXECUTION_RUN",
            meta: { command: "python manage.py test", passed: false },
            ts: new Date(now - 20000).toISOString(),
          },
          {
            type: "TAB_SWITCH",
            meta: { target: "external_browser" },
            ts: new Date(now - 8000).toISOString(),
          },
        ],
      };

      db.liveTelemetry[candidateId] = simSession;
      await writeDb(db);

      return NextResponse.json({
        success: true,
        scenario: "ai-cheater",
        candidateId,
        message: "Simulated AI Copypaster live session created with telemetry anomalies.",
      });
    } else {
      // 10x Methodical Architect
      const candidateId = "sim-sarah-chen";
      const simSession: LiveTelemetryState = {
        candidateId,
        candidateName: "Sarah Chen (Simulation: 10x Architect)",
        repoId: "python-challenge",
        lastActive: now,
        stability: 98,
        duration: 240,
        activeFile: "solution.py",
        eventCount: 168,
        tabSwitches: 0,
        status: "active",
        recentEvents: [
          {
            type: "FILE_OPEN",
            meta: { file: "solution.py" },
            ts: new Date(now - 200000).toISOString(),
          },
          {
            type: "KEYSTROKE_BATCH",
            meta: { added: 45, deleted: 8 },
            ts: new Date(now - 140000).toISOString(),
          },
          {
            type: "EXECUTION_RUN",
            meta: { command: "pytest", passed: false, failedTests: 2 },
            ts: new Date(now - 90000).toISOString(),
          },
          {
            type: "KEYSTROKE_BATCH",
            meta: { added: 32, deleted: 5 },
            ts: new Date(now - 50000).toISOString(),
          },
          {
            type: "EXECUTION_RUN",
            meta: { command: "pytest", passed: true, passedTests: 5 },
            ts: new Date(now - 15000).toISOString(),
          },
        ],
      };

      db.liveTelemetry[candidateId] = simSession;
      await writeDb(db);

      return NextResponse.json({
        success: true,
        scenario: "10x-architect",
        candidateId,
        message: "Simulated 10x Architect session created with natural cadence.",
      });
    }
  } catch (error) {
    console.error("Simulation route error:", error);
    return NextResponse.json(
      { error: "Internal server error during simulation." },
      { status: 500 }
    );
  }
}
