import { create } from "zustand";

export type EventType =
  | "FILE_OPEN"
  | "KEYSTROKE_BATCH"
  | "KEYSTROKE_RAW"
  | "PASTE_EVENT"
  | "PASTE_DETECTED"
  | "HINT_RECEIVED"
  | "HINT_CLICKED"
  | "FILE_SAVE"
  | "TEST_RESULT"
  | "FOCUS_LOST"
  | "FOCUS_GAINED"
  | "FOCUS_DURATION"
  | "IDLE_DETECTED"
  | "TAB_SWITCH"
  | "GIT_COMMAND"
  | "EXECUTION_RESULT"
  | "SUBMISSION";

export interface TelemetryEvent {
  type: EventType;
  ts: string;
  meta: Record<string, any>;
}

interface TelemetryState {
  events: TelemetryEvent[];
  sessionStart: number;
  lastHintTime: number | null;
  logEvent: (event: Omit<TelemetryEvent, "ts">) => void;
  setLastHintTime: (time: number) => void;
  getDump: () => TelemetryEvent[];
  clearEvents: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  events: [],
  sessionStart: Date.now(),
  lastHintTime: null,

  logEvent: (event) => {
    const newEvent: TelemetryEvent = {
      ...event,
      type: event.type as EventType,
      ts: new Date().toISOString(),
    };
    set((state) => ({ events: [...state.events, newEvent] }));
  },

  setLastHintTime: (time) => set({ lastHintTime: time }),

  getDump: () => get().events,

  clearEvents: () => set({ events: [] }),
}));
