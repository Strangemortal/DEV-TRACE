import fs from "fs/promises";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/db.json");

export interface Candidate {
  id: string;
  name: string;
  userId: string;
  passwordHash: string; // we will just store plaintext password as requested or hash if simple, let's keep it simple or plaintext
  assignedRepoId: string;
  active: boolean;
  createdAt: number;
}

export interface Session {
  userId: string;
  role: "admin" | "candidate";
  candidateId?: string;
  expiresAt: number;
}

export interface TelemetryRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  repoId: string;
  submittedAt: number;
  sessionStart: number;
  duration: number; // in seconds
  stability: number; // calculated stability
  events: any[];
}

export interface DatabaseSchema {
  candidates: Candidate[];
  sessions: Record<string, Session>;
  telemetry: TelemetryRecord[];
}

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    const initialData: DatabaseSchema = {
      candidates: [],
      sessions: {},
      telemetry: [],
    };
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DatabaseSchema> {
  await ensureDbFile();
  const content = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(content);
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}
