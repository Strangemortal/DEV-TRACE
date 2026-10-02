import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { active: false, status: "stopped", error: "Session invalid or expired" },
        { status: 401 }
      );
    }

    if (session.role !== "candidate") {
      return NextResponse.json({
        active: true,
        status: "active",
        role: session.role,
      });
    }

    const isActive = session.active !== false && session.status !== "paused";

    return NextResponse.json({
      active: isActive,
      status: isActive ? "active" : "paused",
      candidateId: session.candidateId,
      name: session.name,
      assignedRepoId: session.assignedRepoId,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json(
      { error: "Heartbeat internal error" },
      { status: 500 }
    );
  }
}
