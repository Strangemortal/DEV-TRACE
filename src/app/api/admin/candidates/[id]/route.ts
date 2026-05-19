import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const db = await readDb();

    const candidateIndex = db.candidates.findIndex((c) => c.id === id);
    if (candidateIndex === -1) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Set active to false (deactivate candidate)
    db.candidates[candidateIndex].active = false;

    // Delete all sessions belonging to this candidate
    const candidateUserId = db.candidates[candidateIndex].userId;
    Object.keys(db.sessions).forEach((token) => {
      if (db.sessions[token].candidateId === id || db.sessions[token].userId === candidateUserId) {
        delete db.sessions[token];
      }
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Candidate deactivated and sessions invalidated.",
    });
  } catch (error) {
    console.error("Candidate DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
