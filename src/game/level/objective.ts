import type {
  Objective,
  GemColour,
  BlockerKind,
  StarBasis,
  ObjectiveDelta,
} from '../../types';

// ─── ObjectiveTracker 介面 ──────────────────────────────────

/** 目標追蹤器 */
export interface ObjectiveTracker {
  /** 目標是否已完成 */
  isComplete(): boolean;
  /** 取得進度 (0..1) */
  getProgress(): number;
  /** 取得 ObjectiveDelta（供 event bus 使用） */
  getDelta(): ObjectiveDelta;
}

// ─── 11.1 Score 目標 ────────────────────────────────────────

export class ScoreTracker implements ObjectiveTracker {
  constructor(
    private target: number,
    private currentScore: number = 0,
  ) {}

  updateScore(score: number): void {
    this.currentScore = score;
  }

  isComplete(): boolean {
    return this.currentScore >= this.target;
  }

  getProgress(): number {
    return Math.min(1, this.currentScore / this.target);
  }

  getDelta(): ObjectiveDelta {
    return { type: 'score', progress: this.getProgress() };
  }
}

// ─── 11.2 Clear 目標 ────────────────────────────────────────

export class ClearTracker implements ObjectiveTracker {
  private cleared: Map<BlockerKind, number>;

  constructor(private targets: Array<{ blocker: BlockerKind; count: number }>) {
    this.cleared = new Map();
    for (const t of targets) this.cleared.set(t.blocker, 0);
  }

  addCleared(blocker: BlockerKind, count: number = 1): void {
    this.cleared.set(blocker, (this.cleared.get(blocker) ?? 0) + count);
  }

  isComplete(): boolean {
    return this.targets.every(
      (t) => (this.cleared.get(t.blocker) ?? 0) >= t.count,
    );
  }

  getProgress(): number {
    if (this.targets.length === 0) return 1;
    const progresses = this.targets.map((t) =>
      Math.min(1, (this.cleared.get(t.blocker) ?? 0) / t.count),
    );
    return progresses.reduce((a, b) => a + b, 0) / progresses.length;
  }

  getDelta(): ObjectiveDelta {
    return {
      type: 'clear',
      progress: this.getProgress(),
      completedSubObjectives: this.targets.filter(
        (t) => (this.cleared.get(t.blocker) ?? 0) >= t.count,
      ).length,
    };
  }
}

// ─── 11.3 Collect 目標 ──────────────────────────────────────

export class CollectTracker implements ObjectiveTracker {
  private collected: Map<GemColour, number>;

  constructor(private targets: Array<{ colour: GemColour; count: number }>) {
    this.collected = new Map();
    for (const t of targets) this.collected.set(t.colour, 0);
  }

  addCollected(colour: GemColour, count: number = 1): void {
    this.collected.set(colour, (this.collected.get(colour) ?? 0) + count);
  }

  isComplete(): boolean {
    return this.targets.every(
      (t) => (this.collected.get(t.colour) ?? 0) >= t.count,
    );
  }

  getProgress(): number {
    if (this.targets.length === 0) return 1;
    const progresses = this.targets.map((t) =>
      Math.min(1, (this.collected.get(t.colour) ?? 0) / t.count),
    );
    return progresses.reduce((a, b) => a + b, 0) / progresses.length;
  }

  getDelta(): ObjectiveDelta {
    return {
      type: 'collect',
      progress: this.getProgress(),
      completedSubObjectives: this.targets.filter(
        (t) => (this.collected.get(t.colour) ?? 0) >= t.count,
      ).length,
    };
  }
}

// ─── 11.4 Drop 目標 ─────────────────────────────────────────

export class DropTracker implements ObjectiveTracker {
  private dropped = 0;

  constructor(private target: number) {}

  addDropped(count: number = 1): void {
    this.dropped += count;
  }

  isComplete(): boolean {
    return this.dropped >= this.target;
  }

  getProgress(): number {
    return Math.min(1, this.dropped / this.target);
  }

  getDelta(): ObjectiveDelta {
    return { type: 'drop', progress: this.getProgress() };
  }
}

// ─── 11.5 Multi 目標 ────────────────────────────────────────

export class MultiTracker implements ObjectiveTracker {
  private trackers: ObjectiveTracker[];

  constructor(objectives: Exclude<Objective, { type: 'multi' }>[]) {
    this.trackers = objectives.map((o) => createTracker(o));
  }

  getTrackers(): ObjectiveTracker[] {
    return this.trackers;
  }

  isComplete(): boolean {
    return this.trackers.every((t) => t.isComplete());
  }

  getProgress(): number {
    if (this.trackers.length === 0) return 1;
    return (
      this.trackers.reduce((sum, t) => sum + t.getProgress(), 0) /
      this.trackers.length
    );
  }

  getDelta(): ObjectiveDelta {
    return {
      type: 'multi',
      progress: this.getProgress(),
      completedSubObjectives: this.trackers.filter((t) =>
        t.isComplete(),
      ).length,
    };
  }
}

// ─── 工廠函式 ───────────────────────────────────────────────

/** 依 Objective 建立對應的 Tracker */
export function createTracker(objective: Objective): ObjectiveTracker {
  switch (objective.type) {
    case 'score':
      return new ScoreTracker(objective.target);
    case 'clear':
      return new ClearTracker(objective.target);
    case 'collect':
      return new CollectTracker(objective.target);
    case 'drop':
      return new DropTracker(objective.target.count);
    case 'multi':
      return new MultiTracker(objective.objectives);
  }
}

// ─── 11.6 星級評價計算 ──────────────────────────────────────

export function calculateStars(
  stars: { one: number; two: number; three: number; basis: StarBasis },
  score: number,
  movesRemaining: number,
  timeRemaining: number,
): 0 | 1 | 2 | 3 {
  let value: number;
  switch (stars.basis) {
    case 'score':
      value = score;
      break;
    case 'movesRemaining':
      value = movesRemaining;
      break;
    case 'timeRemaining':
      value = timeRemaining;
      break;
  }
  if (value >= stars.three) return 3;
  if (value >= stars.two) return 2;
  if (value >= stars.one) return 1;
  return 0;
}
