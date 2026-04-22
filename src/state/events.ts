// ─── 事件系統 ─────────────────────────────────────────────────
// 輕量同步 event bus，pool 化事件物件，零 GC 壓力 hot path

import type {
  CellPos,
  MatchDescriptor,
  SpecialGemType,
  ComboType,
  ObjectiveDelta,
  ColumnDrop,
  LevelResult,
} from '../types';
import type { Command } from '../game/runtime/game-loop';

// ─── 16.3 完整 GameEvent 聯集型別 ──────────────────────────

export type GameEvent =
  | { kind: 'app.loaded'; ts: number; durationMs: number }
  | { kind: 'level.started'; levelId: number; seed: bigint }
  | { kind: 'command.applied'; command: Command; tick: number }
  | { kind: 'swap.invalid'; from: CellPos; to: CellPos }
  | { kind: 'match.landed'; matches: MatchDescriptor[]; chain: number }
  | { kind: 'cascade.stepBegan'; step: number; drops: ColumnDrop[] }
  | { kind: 'cascade.stepEnded'; step: number }
  | { kind: 'chain.escalated'; from: number; to: number }
  | { kind: 'special.spawned'; at: CellPos; type: SpecialGemType }
  | { kind: 'special.activated'; at: CellPos; type: SpecialGemType }
  | { kind: 'combo.triggered'; type: ComboType; originCells: CellPos[] }
  | { kind: 'objective.progressed'; delta: ObjectiveDelta }
  | { kind: 'level.resolved'; result: LevelResult }
  | { kind: 'reshuffle.triggered'; reason: 'noMoves' | 'manual' }
  | { kind: 'hint.shown'; cells: CellPos[] }
  | { kind: 'intensity.updated'; value: number }
  | { kind: 'visibility.resumed'; awayMs: number };

/** 所有事件 kind 的字面值聯集 */
export type GameEventKind = GameEvent['kind'];

/** 依 kind 提取對應的事件型別 */
export type EventOfKind<K extends GameEventKind> = Extract<GameEvent, { kind: K }>;

/** 取消訂閱函式 */
export type Unsubscribe = () => void;

/** 事件處理器型別 */
export type EventHandler<K extends GameEventKind> = (event: EventOfKind<K>) => void;

// ─── EventBus 介面 ──────────────────────────────────────────

export interface EventBus {
  emit(event: GameEvent): void;
  on<K extends GameEventKind>(kind: K, handler: EventHandler<K>): Unsubscribe;
  once<K extends GameEventKind>(kind: K, handler: EventHandler<K>): Unsubscribe;
}

// ─── 16.2 事件物件池化 ──────────────────────────────────────

/**
 * 泛用物件池。
 *
 * 用於頻繁建立的事件物件，避免 hot path 上的 GC 壓力。
 * 池化物件在 release 後可被 acquire 重複使用。
 */
export class EventPool<T extends Record<string, unknown>> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (obj: T) => void;
  private readonly cap: number;

  constructor(opts: {
    factory: () => T;
    reset: (obj: T) => void;
    initialSize?: number;
    cap?: number;
  }) {
    this.factory = opts.factory;
    this.reset = opts.reset;
    this.cap = opts.cap ?? 64;

    const initial = opts.initialSize ?? 16;
    for (let i = 0; i < initial; i++) {
      this.pool.push(this.factory());
    }
  }

  /** 從池中取得一個物件。池空時建立新物件。 */
  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  /** 歸還物件至池中。超過上限時丟棄。 */
  release(obj: T): void {
    if (this.pool.length >= this.cap) return;
    this.reset(obj);
    this.pool.push(obj);
  }

  /** 目前池中可用物件數量 */
  get available(): number {
    return this.pool.length;
  }

  /** 池容量上限 */
  get capacity(): number {
    return this.cap;
  }
}

// ─── 預建事件池 ─────────────────────────────────────────────

/** cascade.stepBegan 事件的可變版本（供池化使用） */
export interface PooledCascadeStepBegan {
  kind: 'cascade.stepBegan';
  step: number;
  drops: ColumnDrop[];
}

/** match.landed 事件的可變版本（供池化使用） */
export interface PooledMatchLanded {
  kind: 'match.landed';
  matches: MatchDescriptor[];
  chain: number;
}

/** intensity.updated 事件的可變版本（供池化使用） */
export interface PooledIntensityUpdated {
  kind: 'intensity.updated';
  value: number;
}

/** 建立 cascade.stepBegan 事件池 */
export function createCascadeStepPool(
  initialSize = 8,
  cap = 32,
): EventPool<PooledCascadeStepBegan> {
  return new EventPool<PooledCascadeStepBegan>({
    factory: () => ({ kind: 'cascade.stepBegan', step: 0, drops: [] }),
    reset: (obj) => {
      obj.step = 0;
      obj.drops = [];
    },
    initialSize,
    cap,
  });
}

/** 建立 match.landed 事件池 */
export function createMatchLandedPool(
  initialSize = 8,
  cap = 32,
): EventPool<PooledMatchLanded> {
  return new EventPool<PooledMatchLanded>({
    factory: () => ({ kind: 'match.landed', matches: [], chain: 0 }),
    reset: (obj) => {
      obj.matches = [];
      obj.chain = 0;
    },
    initialSize,
    cap,
  });
}

/** 建立 intensity.updated 事件池 */
export function createIntensityPool(
  initialSize = 4,
  cap = 16,
): EventPool<PooledIntensityUpdated> {
  return new EventPool<PooledIntensityUpdated>({
    factory: () => ({ kind: 'intensity.updated', value: 0 }),
    reset: (obj) => {
      obj.value = 0;
    },
    initialSize,
    cap,
  });
}

// ─── 16.1 EventBusImpl ─────────────────────────────────────

/**
 * 輕量同步 event bus。
 *
 * - emit：同步呼叫所有已註冊的 handler
 * - on：註冊 handler，回傳 unsubscribe 函式
 * - once：註冊一次性 handler，觸發後自動移除
 *
 * handler 在 emit 期間被移除（如 once 或手動 unsub）不會影響
 * 當前 emit 迭代的安全性——透過快照迭代保證。
 */
export class EventBusImpl implements EventBus {
  private handlers = new Map<string, Set<Function>>();

  /** 發射事件至所有已註冊的 handler */
  emit(event: GameEvent): void {
    const set = this.handlers.get(event.kind);
    if (!set || set.size === 0) return;
    // 快照迭代：防止 handler 中 unsub 導致迭代異常
    const snapshot = [...set];
    for (const fn of snapshot) {
      fn(event);
    }
  }

  /** 註冊事件 handler，回傳 unsubscribe 函式 */
  on<K extends GameEventKind>(
    kind: K,
    handler: EventHandler<K>,
  ): Unsubscribe {
    let set = this.handlers.get(kind);
    if (!set) {
      set = new Set();
      this.handlers.set(kind, set);
    }
    set.add(handler);
    return () => {
      this.handlers.get(kind)?.delete(handler);
    };
  }

  /** 註冊一次性事件 handler，觸發後自動移除 */
  once<K extends GameEventKind>(
    kind: K,
    handler: EventHandler<K>,
  ): Unsubscribe {
    const unsub = this.on(kind, ((event: EventOfKind<K>) => {
      unsub();
      handler(event);
    }) as EventHandler<K>);
    return unsub;
  }

  /** 移除指定 kind 的所有 handler */
  off(kind: GameEventKind): void {
    this.handlers.delete(kind);
  }

  /** 移除所有 handler */
  clear(): void {
    this.handlers.clear();
  }

  /** 取得指定 kind 的 handler 數量 */
  listenerCount(kind: GameEventKind): number {
    return this.handlers.get(kind)?.size ?? 0;
  }
}
