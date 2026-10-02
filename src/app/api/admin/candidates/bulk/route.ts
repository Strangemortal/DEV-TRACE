import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, Candidate } from "@/lib/db";
import { getSession, generatePassword } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "interviewer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const candidateList = Array.isArray(body.candidates) ? body.candidates : [];

    if (candidateList.length === 0) {
      return NextResponse.json(
        { error: "No candidates provided in payload." },
        { status: 400 }
      );
    }

    const defaultRepoId = body.defaultRepoId || "django-orm-store";
    const db = await readDb();
    const createdCandidates: Candidate[] = [];
    const rawPasswords: Record<string, string> = {};

    for (let index = 0; index < candidateList.length; index++) {
      const item = candidateList[index];
      const rawName = (item.name || "").trim();
      if (!rawName) continue;

      // Generate or clean user ID
      let baseUserId = (item.userId || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (!baseUserId) {
        baseUserId = rawName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_")
          .slice(0, 15);
        if (!baseUserId) baseUserId = `candidate_${index + 1}`;
      }

      // Ensure uniqueness
      let finalUserId = baseUserId;
      let counter = 1;
      while (
        db.candidates.some((c) => c.userId.toLowerCase() === finalUserId.toLowerCase()) ||
        createdCandidates.some((c) => c.userId.toLowerCase() === finalUserId.toLowerCase())
      ) {
        finalUserId = `${baseUserId}_${Math.floor(100 + Math.random() * 900)}`;
        counter++;
        if (counter > 20) {
          finalUserId = `${baseUserId}_${Date.now().toString().slice(-4)}`;
          break;
        }
      }

      const generatedPassword = generatePassword();
      const newCandidate: Candidate = {
        id: crypto.randomUUID(),
        name: rawName,
        userId: finalUserId,
        passwordHash: generatedPassword,
        assignedRepoId: item.assignedRepoId || defaultRepoId,
        active: true,
        status: "active",
        createdAt: Date.now() + index, // slight offset for stable sort
        createdBy: session.role === "admin" ? "admin" : session.userId,
      };

      db.candidates.push(newCandidate);
      createdCandidates.push(newCandidate);
      rawPasswords[finalUserId] = generatedPassword;
    }

    if (createdCandidates.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse any valid candidates from input." },
        { status: 400 }
      );
    }

    await writeDb(db);

    return NextResponse.json({
      success: true,
      count: createdCandidates.length,
      candidates: createdCandidates,
      rawPasswords,
    });
  } catch (error) {
    console.error("Bulk Candidates POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
