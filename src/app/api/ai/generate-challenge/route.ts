import { NextRequest, NextResponse } from "next/server";
import { generateChallengeWithAI } from "@/lib/ai/aiService";
import { getSession } from "@/lib/auth";
import { readDb, writeDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Access denied: Staff permissions required." }, { status: 403 });
    }

    const { prompt, framework, category, difficulty, scenario, saveToLibrary } = await req.json();

    if (!prompt && !framework) {
      return NextResponse.json({ error: "Prompt or framework selection is required." }, { status: 400 });
    }

    const challenge = await generateChallengeWithAI({
      prompt: prompt || "",
      framework,
      category,
      difficulty,
      scenario,
    });

    if (saveToLibrary) {
      const db = await readDb();
      if (!db.customChallenges) db.customChallenges = [];
      
      // Upsert challenge
      const existingIdx = db.customChallenges.findIndex((c: any) => c.id === challenge.id);
      if (existingIdx >= 0) {
        db.customChallenges[existingIdx] = challenge;
      } else {
        db.customChallenges.push(challenge);
      }
      await writeDb(db);
    }

    return NextResponse.json({ success: true, challenge });
  } catch (error: any) {
    console.error("Generate challenge API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI challenge." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const db = await readDb();
    return NextResponse.json({ customChallenges: db.customChallenges || [] });
  } catch (error: any) {
    console.error("Get custom challenges error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
