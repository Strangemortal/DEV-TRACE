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
  createdBy?: string; // "admin" or interviewer username
}

export interface Interviewer {
  id: string;
  name: string;
  userId: string;
  passwordHash: string;
  createdAt: number;
}

export interface Session {
  userId: string;
  role: "admin" | "candidate" | "interviewer";
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
  interviewers: Interviewer[];
  sessions: Record<string, Session>;
  telemetry: TelemetryRecord[];
}

async function ensureDbFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    const initialData: DatabaseSchema = {
      candidates: [],
      interviewers: [],
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
  const data = JSON.parse(content);
  if (!data.interviewers) {
    data.interviewers = [];
  }
  return data;
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}
