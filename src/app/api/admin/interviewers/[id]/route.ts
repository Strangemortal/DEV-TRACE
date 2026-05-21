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

    const interviewerIndex = db.interviewers?.findIndex((i) => i.id === id);
    if (interviewerIndex === undefined || interviewerIndex === -1) {
      return NextResponse.json({ error: "Interviewer not found" }, { status: 404 });
    }

    const interviewerUserId = db.interviewers[interviewerIndex].userId;

    // Delete the interviewer from list
    db.interviewers.splice(interviewerIndex, 1);

    // Delete all active sessions belonging to this interviewer
    Object.keys(db.sessions).forEach((token) => {
      if (db.sessions[token].userId === interviewerUserId) {
        delete db.sessions[token];
      }
    });

    await writeDb(db);

    return NextResponse.json({
      success: true,
      message: "Interviewer deleted and sessions invalidated.",
    });
  } catch (error) {
    console.error("Interviewer DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
