import { NextRequest, NextResponse } from "next/server";
import { evaluateCandidateSessionWithAI } from "@/lib/ai/aiService";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Access denied: Invigilator/Staff permissions required." }, { status: 403 });
    }

    const {
      candidateId,
      candidateName,
      repoId,
      durationSeconds,
      stabilityScore,
      events,
      finalFiles,
    } = await req.json();

    const evaluation = await evaluateCandidateSessionWithAI({
      candidateId: candidateId || "candidate",
      candidateName: candidateName || "Candidate",
      repoId: repoId || "challenge",
      durationSeconds: Number(durationSeconds) || 300,
      stabilityScore: Number(stabilityScore) || 80,
      events: Array.isArray(events) ? events : [],
      finalFiles,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: any) {
    console.error("AI Candidate Evaluation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI evaluation report." },
      { status: 500 }
    );
  }
}
