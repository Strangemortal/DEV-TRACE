import { NextRequest, NextResponse } from "next/server";
import { predictCandidateIntegrity } from "@/lib/ml/inference";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json(
        { error: "Unauthorized. Staff permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const prediction = predictCandidateIntegrity(body);

    return NextResponse.json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error("ML Prediction error:", error);
    return NextResponse.json(
      { error: "Internal server error during ML inference." },
      { status: 500 }
    );
  }
}
