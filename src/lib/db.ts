import fs from "fs/promises";
import path from "path";

const DB_PATH = path.join(process.cwd(), "src/data/db.json");

export interface Candidate {
  id: string;
  name: string;
  userId: string;
  passwordHash: string; // plain text for direct admin visibility & candidate login
  assignedRepoId: string;
  active: boolean;
  status?: "active" | "paused" | "completed";
  createdAt: number;
  createdBy?: string; // "admin" or interviewer username
  completedAt?: number;
  finalStability?: number;
  finalDuration?: number;
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
  status?: "active" | "paused" | "completed";
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

export interface LiveTelemetryState {
  candidateId: string;
  candidateName: string;
  repoId: string;
  lastActive: number;
  stability: number;
  duration: number;
  activeFile: string;
  eventCount: number;
  tabSwitches: number;
  fullscreenEscapes?: number;
  recentEvents: any[];
  status: "active" | "paused" | "completed";
  completedAt?: number;
}

export interface DatabaseSchema {
  candidates: Candidate[];
  interviewers: Interviewer[];
  sessions: Record<string, Session>;
  telemetry: TelemetryRecord[];
  liveTelemetry?: Record<string, LiveTelemetryState>;
  customChallenges?: any[];
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
  if (!data.liveTelemetry) {
    data.liveTelemetry = {};
  }
  return data;
}

let writeQueue = Promise.resolve();

export async function writeDb(data: DatabaseSchema): Promise<void> {
  await ensureDbFile();
  writeQueue = writeQueue.then(async () => {
    const tempPath = `${DB_PATH}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tempPath, DB_PATH);
  }).catch((err) => {
    console.error("writeDb atomic write error:", err);
  });
  return writeQueue;
}
