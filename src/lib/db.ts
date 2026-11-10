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

// ---------------------------------------------------------------------------
// ATOMIC IN-MEMORY MUTEX DATA STORE (Multi-User Concurrency Engine)
// ---------------------------------------------------------------------------
declare global {
  var __DEVTRACE_IN_MEMORY_DB: DatabaseSchema | undefined;
  var __DEVTRACE_MUTEX: Promise<any> | undefined;
  var __DEVTRACE_FLUSH_TIMER: NodeJS.Timeout | undefined;
}

async function ensureDbFile(): Promise<DatabaseSchema> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
    const content = await fs.readFile(DB_PATH, "utf-8");
    const data = JSON.parse(content);
    if (!data.candidates) data.candidates = [];
    if (!data.interviewers) data.interviewers = [];
    if (!data.sessions) data.sessions = {};
    if (!data.telemetry) data.telemetry = [];
    if (!data.liveTelemetry) data.liveTelemetry = {};
    if (!data.customChallenges) data.customChallenges = [];
    return data;
  } catch {
    const initialData: DatabaseSchema = {
      candidates: [],
      interviewers: [],
      sessions: {},
      telemetry: [],
      liveTelemetry: {},
      customChallenges: [],
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

async function getOrInitDb(): Promise<DatabaseSchema> {
  if (!globalThis.__DEVTRACE_IN_MEMORY_DB) {
    globalThis.__DEVTRACE_IN_MEMORY_DB = await ensureDbFile();
  }
  return globalThis.__DEVTRACE_IN_MEMORY_DB;
}

function scheduleDiskFlush() {
  if (globalThis.__DEVTRACE_FLUSH_TIMER) return;
  globalThis.__DEVTRACE_FLUSH_TIMER = setTimeout(async () => {
    globalThis.__DEVTRACE_FLUSH_TIMER = undefined;
    if (!globalThis.__DEVTRACE_IN_MEMORY_DB) return;
    try {
      const tempPath = `${DB_PATH}.tmp`;
      const snapshot = JSON.stringify(globalThis.__DEVTRACE_IN_MEMORY_DB, null, 2);
      await fs.writeFile(tempPath, snapshot, "utf-8");
      await fs.rename(tempPath, DB_PATH);
    } catch (err) {
      console.error("Atomic disk flush error:", err);
    }
  }, 250);
}

// Global FIFO Mutex Queue to prevent race conditions across parallel requests
function runWithMutex<T>(operation: () => Promise<T>): Promise<T> {
  const currentMutex = globalThis.__DEVTRACE_MUTEX || Promise.resolve();
  const nextMutex = currentMutex
    .catch(() => {})
    .then(async () => {
      return await operation();
    });
  globalThis.__DEVTRACE_MUTEX = nextMutex;
  return nextMutex;
}

export async function readDb(): Promise<DatabaseSchema> {
  const db = await getOrInitDb();
  // Return shallow copy to allow fast multi-client reads
  return {
    ...db,
    candidates: [...db.candidates],
    interviewers: [...db.interviewers],
    sessions: { ...db.sessions },
    telemetry: [...db.telemetry],
    liveTelemetry: { ...db.liveTelemetry },
    customChallenges: db.customChallenges ? [...db.customChallenges] : [],
  };
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  return runWithMutex(async () => {
    globalThis.__DEVTRACE_IN_MEMORY_DB = data;
    scheduleDiskFlush();
  });
}

/**
 * Execute an atomic transaction on the database with zero race conditions.
 * Ideal for multi-user candidate heartbeats, state toggles, and submissions.
 */
export async function updateDb<T = void>(
  updater: (db: DatabaseSchema) => T | Promise<T>
): Promise<T> {
  return runWithMutex(async () => {
    const db = await getOrInitDb();
    const result = await updater(db);
    scheduleDiskFlush();
    return result;
  });
}
