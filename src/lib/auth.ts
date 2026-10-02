import { cookies } from "next/headers";
import { readDb, writeDb, Session } from "./db";

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "password123";

export function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export interface AuthenticatedUser {
  userId: string;
  role: "admin" | "candidate" | "interviewer";
  candidateId?: string;
  name: string;
  assignedRepoId?: string;
  active?: boolean;
  status?: "active" | "paused" | "completed";
}

export async function getSession(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("devtrace_session")?.value;

    if (!token) return null;

    const db = await readDb();
    const session = db.sessions[token];

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      // Session expired, clean it up
      delete db.sessions[token];
      await writeDb(db);
      return null;
    }

    if (session.role === "admin") {
      return {
        userId: session.userId,
        role: "admin",
        name: "Administrator",
        active: true,
        status: "active",
      };
    } else if (session.role === "interviewer") {
      const interviewer = db.interviewers?.find((i) => i.userId === session.userId);
      if (!interviewer) {
        delete db.sessions[token];
        await writeDb(db);
        return null;
      }
      return {
        userId: session.userId,
        role: "interviewer",
        name: interviewer.name,
        active: true,
        status: "active",
      };
    } else {
      // Find the candidate
      const candidate = db.candidates.find(
        (c) => c.id === session.candidateId || c.userId === session.userId
      );
      if (!candidate) {
        // Candidate was deleted from roster
        delete db.sessions[token];
        await writeDb(db);
        return null;
      }
      return {
        userId: session.userId,
        role: "candidate",
        candidateId: candidate.id,
        name: candidate.name,
        assignedRepoId: candidate.assignedRepoId,
        active: candidate.active,
        status: candidate.active ? "active" : "paused",
      };
    }
  } catch (error) {
    console.error("Error in getSession:", error);
    return null;
  }
}
