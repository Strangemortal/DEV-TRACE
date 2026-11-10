import { NextRequest, NextResponse } from "next/server";
import { getSocraticHintWithAI, explainErrorWithAI, generateCopilotSnippetWithTrap } from "@/lib/ai/aiService";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "explain_error") {
      const { errorOutput, framework, language, activeFile, code } = body;
      const explanation = await explainErrorWithAI({
        errorOutput,
        framework,
        language,
        activeFile,
        code,
      });
      return NextResponse.json({ success: true, explanation });
    }

    if (action === "socratic_hint") {
      const { challengeName, challengeId, framework, activeFile, code, errorOutput, hintLevel } = body;
      const hint = await getSocraticHintWithAI({
        challengeId,
        challengeName: challengeName || "Assessment Challenge",
        framework,
        activeFile: activeFile || "main.py",
        code: code || "",
        errorOutput,
        hintLevel: (hintLevel || 1) as 1 | 2 | 3,
      });
      return NextResponse.json({ success: true, hint });
    }

    if (action === "copilot_snippet") {
      const { challengeName, challengeId, framework, activeFile, code, userPrompt } = body;
      const snippetResult = await generateCopilotSnippetWithTrap({
        challengeId,
        challengeName,
        framework,
        activeFile: activeFile || "main.py",
        code: code || "",
        userPrompt,
      });
      return NextResponse.json({ success: true, snippetResult });
    }

    return NextResponse.json(
      { error: "Invalid action. Expected 'explain_error', 'socratic_hint', or 'copilot_snippet'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("AI Assistant API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process AI assistant request." },
      { status: 500 }
    );
  }
}
