// ─── Telemetry System ───────────────────────────────────────
// Local telemetry event recording with:
// - Structured event types for game analytics
// - Tutorial step tracker
// - 1Hz throttled flush to localStorage
// - No PII, no external network calls

// ─── Telemetry Event Types ──────────────────────────────────

/** All telemetry event kinds */
export type TelemetryEventKind =
  | 'session.start'
  | 'session.end'
  | 'level.start'
  | 'level.complete'
  | 'level.fail'
  | 'level.retry'
  | 'endless.start'
  | 'endless.end'
  | 'special.spawned'
  | 'combo.triggered'
  | 'settings.changed'
  | 'tutorial.step'
  | 'error.runtime';

/** Base telemetry event */
export interface TelemetryEvent {
  kind: TelemetryEventKind;
  ts: number; // performance.now() timestamp
  sessionId: string;
  data: Record<string, unknown>;
}

/** Session start event data */
export interface SessionStartData {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  locale: string;
  graphicsPreset: string;
}

/** Level event data */
export interface LevelEventData {
  levelId: number;
  worldId: number;
  score?: number;
  stars?: number;
  chainMax?: number;
  movesUsed?: number;
  durationMs?: number;
  specialsSpawned?: number;
}

/** Tutorial step data */
export interface TutorialStepData {
  step: string;
  levelId: number;
  timeInLevelMs: number;
}

// ─── Tutorial Step Tracker ──────────────────────────────────

/** Known tutorial milestones */
export type TutorialMilestone =
  | 'first_swap'
  | 'first_match'
  | 'first_cascade'
  | 'first_special'
  | 'first_combo'
  | 'l1_complete'
  | 'l2_complete'
  | 'l3_complete'
  | 'first_star3'
  | 'first_blocker_clear';

/**
 * Tracks tutorial milestones for new players.
 * Non-blocking — records events but never interrupts gameplay.
 */
export class TutorialStepTracker {
  private completedSteps = new Set<TutorialMilestone>();
  private readonly onStep: (step: TutorialMilestone, levelId: number) => void;

  constructor(
    onStep: (step: TutorialMilestone, levelId: number) => void,
    initialCompleted?: TutorialMilestone[],
  ) {
    this.onStep = onStep;
    if (initialCompleted) {
      for (const step of initialCompleted) {
        this.completedSteps.add(step);
      }
    }
  }

  /** Record a tutorial milestone (idempotent) */
  recordStep(step: TutorialMilestone, levelId: number): void {
    if (this.completedSteps.has(step)) return;
    this.completedSteps.add(step);
    this.onStep(step, levelId);
  }

  /** Check if a milestone has been completed */
  isCompleted(step: TutorialMilestone): boolean {
    return this.completedSteps.has(step);
  }

  /** Get all completed milestones */
  getCompleted(): TutorialMilestone[] {
    return [...this.completedSteps];
  }

  /** Serialize for save state */
  serialize(): TutorialMilestone[] {
    return [...this.completedSteps];
  }
}

// ─── Telemetry Recorder ─────────────────────────────────────

const TELEMETRY_STORAGE_KEY = 'gem.telemetry.v1';
const FLUSH_INTERVAL_MS = 1000; // 1Hz
const MAX_BUFFER_SIZE = 200;
const MAX_STORED_EVENTS = 1000;

/**
 * Local telemetry event recorder.
 *
 * Records game events to an in-memory buffer and flushes
 * to localStorage at 1Hz. No external network calls.
 *
 * Events are stored locally for debugging and analytics.
 * The buffer is capped to prevent unbounded growth.
 */
export class TelemetryRecorder {
  private buffer: TelemetryEvent[] = [];
  private readonly sessionId: string;
  private lastFlushTime = 0;
  private readonly tutorialTracker: TutorialStepTracker;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.tutorialTracker = new TutorialStepTracker(
      (step, levelId) => {
        this.record('tutorial.step', { step, levelId, timeInLevelMs: 0 });
      },
    );
  }

  // ─── Recording ──────────────────────────────────────────

  /** Record a telemetry event */
  record(kind: TelemetryEventKind, data: Record<string, unknown> = {}): void {
    const event: TelemetryEvent = {
      kind,
      ts: performance.now(),
      sessionId: this.sessionId,
      data,
    };

    this.buffer.push(event);

    // Cap buffer size
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFER_SIZE);
    }
  }

  /** Record session start */
  recordSessionStart(): void {
    this.record('session.start', {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      locale: navigator.language,
    } satisfies Partial<SessionStartData>);
  }

  /** Record session end */
  recordSessionEnd(): void {
    this.record('session.end', {});
    this.flush(); // Immediate flush on session end
  }

  /** Record level start */
  recordLevelStart(levelId: number, worldId: number): void {
    this.record('level.start', { levelId, worldId } satisfies Partial<LevelEventData>);
  }

  /** Record level complete */
  recordLevelComplete(data: LevelEventData): void {
    this.record('level.complete', data as unknown as Record<string, unknown>);
  }

  /** Record level fail */
  recordLevelFail(data: LevelEventData): void {
    this.record('level.fail', data as unknown as Record<string, unknown>);
  }

  /** Record a runtime error */
  recordError(error: string, context?: Record<string, unknown>): void {
    this.record('error.runtime', { error, ...context });
  }

  // ─── Tutorial Tracker ───────────────────────────────────

  /** Get the tutorial step tracker */
  getTutorialTracker(): TutorialStepTracker {
    return this.tutorialTracker;
  }

  // ─── Tick (called from game loop) ───────────────────────

  /**
   * Called each frame from the game loop.
   * Flushes buffer to localStorage at 1Hz.
   */
  tick(now: number): void {
    if (now - this.lastFlushTime >= FLUSH_INTERVAL_MS) {
      this.flush();
      this.lastFlushTime = now;
    }
  }

  // ─── Flush ──────────────────────────────────────────────

  /** Flush buffer to localStorage */
  flush(): void {
    if (this.buffer.length === 0) return;

    try {
      // Read existing events
      const existing = this.loadStoredEvents();

      // Append new events
      const combined = [...existing, ...this.buffer];

      // Cap total stored events
      const trimmed =
        combined.length > MAX_STORED_EVENTS
          ? combined.slice(combined.length - MAX_STORED_EVENTS)
          : combined;

      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(trimmed));
      this.buffer = [];
    } catch {
      // localStorage full or blocked — silently drop events
      this.buffer = [];
    }
  }

  // ─── Query ──────────────────────────────────────────────

  /** Load stored events from localStorage */
  loadStoredEvents(): TelemetryEvent[] {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as TelemetryEvent[];
    } catch {
      return [];
    }
  }

  /** Get events from the current session */
  getSessionEvents(): TelemetryEvent[] {
    return [
      ...this.loadStoredEvents().filter((e) => e.sessionId === this.sessionId),
      ...this.buffer,
    ];
  }

  /** Clear all stored telemetry data */
  clearAll(): void {
    this.buffer = [];
    try {
      localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  // ─── Utilities ──────────────────────────────────────────

  /** Get current session ID */
  getSessionId(): string {
    return this.sessionId;
  }

  private generateSessionId(): string {
    // Simple session ID: timestamp + random suffix
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `${ts}-${rand}`;
  }
}

// ─── Singleton ──────────────────────────────────────────────

let _instance: TelemetryRecorder | null = null;

/** Get or create the global telemetry recorder */
export function getTelemetry(): TelemetryRecorder {
  if (!_instance) {
    _instance = new TelemetryRecorder();
  }
  return _instance;
}

/** Reset the global telemetry instance (for testing) */
export function resetTelemetry(): void {
  _instance = null;
}
