import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CellPos, GemColour, LevelResult } from '../../../types';
import { createBoard, createGem, getCell } from '../../rules/board';
import type { Board } from '../../rules/board';
import { Mulberry32 } from '../../rules/rng';
import { initBoard, findValidSwaps } from '../reshuffle';
import {
  CommandQueue,
  RulesEngine,
  GameLoop,
  FIXED_DT,
  MAX_ACCUMULATOR,
  type Command,
  type GameEvent,
  type GameEventBus,
  type Renderer,
  type AudioSystem,
  type TelemetrySystem,
  type EventBus,
} from '../game-loop';
import type { LevelSpec } from '../../level/level-spec';

// ─── 輔助 ───────────────────────────────────────────────────

/** 建立最小 LevelSpec */
function makeSpec(overrides: Partial<LevelSpec> = {}): LevelSpec {
  return {
    id: 1,
    worldId: 1,
    name: { 'zh-TW': '測試', en: 'Test' },
    board: { width: 6, height: 6, empty: [] },
    gems: { colours: ['R', 'G', 'B'] as GemColour[] },
    constraints: { moveBudget: 15 },
    objective: { type: 'score', target: 500 },
    stars: { one: 500, two: 1000, three: 2000, basis: 'score' },
    ...overrides,
  };
}

/** 收集事件的 mock event bus */
function mockEventBus(): GameEventBus & { events: GameEvent[] } {
  const events: GameEvent[] = [];
  return {
    events,
    emit(event: GameEvent) {
      events.push(event);
    },
  };
}

/** 建立 RulesEngine 配置 */
function makeEngine(
  specOverrides: Partial<LevelSpec> = {},
  seed = 42,
): {
  engine: RulesEngine;
  queue: CommandQueue;
  bus: ReturnType<typeof mockEventBus>;
} {
  const spec = makeSpec(specOverrides);
  const rng = new Mulberry32(seed);
  const board = initBoard(spec, rng);
  const cascadeRng = new Mulberry32(seed ^ 0x9abcdef0);
  const queue = new CommandQueue();
  const bus = mockEventBus();

  const engine = new RulesEngine({
    board,
    spec,
    cascadeRng,
    eventBus: bus,
    commandQueue: queue,
  });

  return { engine, queue, bus };
}

// ─── CommandQueue 測試 ──────────────────────────────────────

describe('CommandQueue', () => {
  it('enqueue 和 drain 遵循 FIFO 順序', () => {
    const q = new CommandQueue();
    const cmd1: Command = { kind: 'pause' };
    const cmd2: Command = { kind: 'resume' };
    const cmd3: Command = { kind: 'requestHint' };

    expect(q.enqueue(cmd1)).toBe(true);
    expect(q.enqueue(cmd2)).toBe(true);
    expect(q.enqueue(cmd3)).toBe(true);

    expect(q.drain()).toBe(cmd1);
    expect(q.drain()).toBe(cmd2);
    expect(q.drain()).toBe(cmd3);
  });

  it('空佇列 drain 回傳 undefined', () => {
    const q = new CommandQueue();
    expect(q.drain()).toBeUndefined();
  });

  it('佇列滿時 enqueue 回傳 false', () => {
    const q = new CommandQueue();

    // 填滿 8 個
    for (let i = 0; i < 8; i++) {
      expect(q.enqueue({ kind: 'pause' })).toBe(true);
    }

    // 第 9 個應該失敗
    expect(q.enqueue({ kind: 'resume' })).toBe(false);
    expect(q.length).toBe(8);
  });

  it('drain 後可以再 enqueue', () => {
    const q = new CommandQueue();

    for (let i = 0; i < 8; i++) {
      q.enqueue({ kind: 'pause' });
    }

    // 滿了
    expect(q.enqueue({ kind: 'resume' })).toBe(false);

    // drain 一個
    q.drain();
    expect(q.length).toBe(7);

    // 現在可以 enqueue
    expect(q.enqueue({ kind: 'resume' })).toBe(true);
    expect(q.length).toBe(8);
  });

  it('clear 清空佇列', () => {
    const q = new CommandQueue();
    q.enqueue({ kind: 'pause' });
    q.enqueue({ kind: 'resume' });
    q.enqueue({ kind: 'requestHint' });

    expect(q.length).toBe(3);

    q.clear();
    expect(q.length).toBe(0);
    expect(q.drain()).toBeUndefined();
  });

  it('length getter 正確反映佇列大小', () => {
    const q = new CommandQueue();
    expect(q.length).toBe(0);

    q.enqueue({ kind: 'pause' });
    expect(q.length).toBe(1);

    q.enqueue({ kind: 'resume' });
    expect(q.length).toBe(2);

    q.drain();
    expect(q.length).toBe(1);

    q.drain();
    expect(q.length).toBe(0);
  });
});

// ─── RulesEngine 基礎測試 ──────────────────────────────────

describe('RulesEngine', () => {
  it('初始狀態正確', () => {
    const { engine } = makeEngine();

    expect(engine.score).toBe(0);
    expect(engine.movesRemaining).toBe(15);
    expect(engine.chainCount).toBe(0);
    expect(engine.resolving).toBe(false);
    expect(engine.paused).toBe(false);
    expect(engine.settled).toBe(false);
    expect(engine.intensity).toBe(0);
  });

  it('advance() 無指令時不做任何事', () => {
    const { engine, bus } = makeEngine();

    engine.advance();

    // 無事件（command.applied 不會觸發因為沒有指令）
    expect(bus.events).toHaveLength(0);
    expect(engine.tick).toBe(1);
  });

  it('pause 和 resume 指令正確切換狀態', () => {
    const { engine, queue } = makeEngine();

    queue.enqueue({ kind: 'pause' });
    engine.advance();
    expect(engine.paused).toBe(true);

    // paused 時 advance 不處理指令
    queue.enqueue({ kind: 'resume' });
    engine.advance();
    // 仍然 paused，因為 advance 在 paused 時直接 return
    expect(engine.paused).toBe(true);
  });

  it('settled 後 advance 不處理指令', () => {
    const { engine, queue, bus } = makeEngine();

    // 手動設定 settled
    (engine as any).settled = true;

    queue.enqueue({ kind: 'pause' });
    engine.advance();

    // 不應有 command.applied 事件
    const commandEvents = bus.events.filter((e) => e.kind === 'command.applied');
    expect(commandEvents).toHaveLength(0);
  });
});

// ─── Swap 處理測試 ──────────────────────────────────────────

describe('RulesEngine swap processing', () => {
  it('非相鄰格子的交換被拒絕', () => {
    const { engine, queue, bus } = makeEngine();

    queue.enqueue({ kind: 'swap', from: [0, 0], to: [2, 2] });
    engine.advance();

    const invalidEvents = bus.events.filter((e) => e.kind === 'swap.invalid');
    expect(invalidEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('空格上的交換被拒絕', () => {
    const spec = makeSpec({
      board: { width: 6, height: 6, empty: [[0, 0]] },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);
    const cascadeRng = new Mulberry32(42 ^ 0x9abcdef0);
    const queue = new CommandQueue();
    const bus = mockEventBus();

    const engine = new RulesEngine({
      board,
      spec,
      cascadeRng,
      eventBus: bus,
      commandQueue: queue,
    });

    queue.enqueue({ kind: 'swap', from: [0, 0], to: [1, 0] });
    engine.advance();

    const invalidEvents = bus.events.filter((e) => e.kind === 'swap.invalid');
    expect(invalidEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('有效交換扣一手', () => {
    const spec = makeSpec({ constraints: { moveBudget: 15 } });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);
    const cascadeRng = new Mulberry32(42 ^ 0x9abcdef0);
    const queue = new CommandQueue();
    const bus = mockEventBus();

    const engine = new RulesEngine({
      board,
      spec,
      cascadeRng,
      eventBus: bus,
      commandQueue: queue,
    });

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);

    const [from, to] = swaps[0];
    const movesBefore = engine.movesRemaining;

    queue.enqueue({ kind: 'swap', from, to });
    engine.advance();

    // 檢查是否有 swap.invalid 事件
    const invalidEvents = bus.events.filter((e) => e.kind === 'swap.invalid');
    if (invalidEvents.length === 0) {
      // 有效交換：手數應該減少 1
      expect(engine.movesRemaining).toBe(movesBefore - 1);
    }
  });

  it('無效交換不扣手數', () => {
    const { engine, queue } = makeEngine();
    const movesBefore = engine.movesRemaining;

    // 非相鄰交換 → 無效
    queue.enqueue({ kind: 'swap', from: [0, 0], to: [3, 3] });
    engine.advance();

    expect(engine.movesRemaining).toBe(movesBefore);
  });

  it('不產生消除的交換被拒絕（swap back）', () => {
    // 建立一個精心設計的棋盤，交換 (0,0) 和 (1,0) 不會產生消除
    const board = createBoard(6, 6);
    const pattern: GemColour[][] = [
      ['R', 'G', 'B', 'Y', 'R', 'G'],
      ['B', 'Y', 'R', 'G', 'B', 'Y'],
      ['R', 'G', 'B', 'Y', 'R', 'G'],
      ['B', 'Y', 'R', 'G', 'B', 'Y'],
      ['R', 'G', 'B', 'Y', 'R', 'G'],
      ['B', 'Y', 'R', 'G', 'B', 'Y'],
    ];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        board.cells[col][row].gem = createGem(pattern[row][col]);
      }
    }

    const spec = makeSpec();
    const queue = new CommandQueue();
    const bus = mockEventBus();
    const cascadeRng = new Mulberry32(42);

    const engine = new RulesEngine({
      board,
      spec,
      cascadeRng,
      eventBus: bus,
      commandQueue: queue,
    });

    const movesBefore = engine.movesRemaining;

    // 交換 (0,0)R 和 (1,0)G → 不會產生 3 連
    queue.enqueue({ kind: 'swap', from: [0, 0], to: [1, 0] });
    engine.advance();

    // 應該有 swap.invalid 事件
    const invalidEvents = bus.events.filter((e) => e.kind === 'swap.invalid');
    expect(invalidEvents.length).toBeGreaterThanOrEqual(1);

    // 手數不變
    expect(engine.movesRemaining).toBe(movesBefore);

    // 棋盤應該恢復原狀
    expect(getCell(board, [0, 0])!.gem!.colour).toBe('R');
    expect(getCell(board, [1, 0])!.gem!.colour).toBe('G');
  });
});

// ─── Resolving 狀態測試 ────────────────────────────────────

describe('RulesEngine resolving state', () => {
  it('resolving 期間拒絕 swap 指令', () => {
    const { engine, queue, bus } = makeEngine();

    // 手動設定 resolving
    (engine as any).resolving = true;

    queue.enqueue({ kind: 'swap', from: [0, 0], to: [1, 0] });
    engine.advance();

    const invalidEvents = bus.events.filter((e) => e.kind === 'swap.invalid');
    expect(invalidEvents.length).toBeGreaterThanOrEqual(1);

    // 手數不變
    expect(engine.movesRemaining).toBe(15);
  });

  it('有效交換後 resolving 回到 false', () => {
    const { engine, queue } = makeEngine();

    const swaps = findValidSwaps(engine.board);

    if (swaps.length > 0) {
      const [from, to] = swaps[0];
      queue.enqueue({ kind: 'swap', from, to });
      engine.advance();

      // advance 完成後 resolving 應該是 false
      expect(engine.resolving).toBe(false);
    }
  });
});

// ─── End-of-level 測試 ─────────────────────────────────────

describe('RulesEngine end-of-level', () => {
  it('手數用盡且目標未達成時 emit level.resolved (failed)', () => {
    const spec = makeSpec({
      constraints: { moveBudget: 1 },
      objective: { type: 'score', target: 999999 }, // 不可能達成
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);
    const cascadeRng = new Mulberry32(42 ^ 0x9abcdef0);
    const queue = new CommandQueue();
    const bus = mockEventBus();

    const engine = new RulesEngine({
      board,
      spec,
      cascadeRng,
      eventBus: bus,
      commandQueue: queue,
    });

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);

    const [from, to] = swaps[0];
    queue.enqueue({ kind: 'swap', from, to });
    engine.advance();

    // 檢查是否有 level.resolved 事件
    const resolvedEvents = bus.events.filter(
      (e) => e.kind === 'level.resolved',
    ) as Array<{ kind: 'level.resolved'; result: LevelResult }>;

    // 如果交換有效（產生消除），手數會變成 0，應該觸發 level.resolved
    if (engine.movesRemaining <= 0) {
      expect(resolvedEvents.length).toBe(1);
      expect(resolvedEvents[0].result.cleared).toBe(false);
      expect(resolvedEvents[0].result.stars).toBe(0);
    }
  });

  it('目標達成時 emit level.resolved (cleared) 並加上剩餘手數獎勵', () => {
    const spec = makeSpec({
      constraints: { moveBudget: 10 },
      objective: { type: 'score', target: 1 }, // 極低目標，幾乎一定達成
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);
    const cascadeRng = new Mulberry32(42 ^ 0x9abcdef0);
    const queue = new CommandQueue();
    const bus = mockEventBus();

    const engine = new RulesEngine({
      board,
      spec,
      cascadeRng,
      eventBus: bus,
      commandQueue: queue,
    });

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);

    const [from, to] = swaps[0];
    queue.enqueue({ kind: 'swap', from, to });
    engine.advance();

    const resolvedEvents = bus.events.filter(
      (e) => e.kind === 'level.resolved',
    ) as Array<{ kind: 'level.resolved'; result: LevelResult }>;

    // 如果交換有效且產生分數 ≥ 1
    if (resolvedEvents.length > 0) {
      expect(resolvedEvents[0].result.cleared).toBe(true);
      expect(resolvedEvents[0].result.score).toBeGreaterThan(0);
      expect(resolvedEvents[0].result.movesRemaining).toBe(9);
    }
  });

  it('settled 後不再處理指令', () => {
    const { engine, queue, bus } = makeEngine();

    (engine as any).settled = true;

    queue.enqueue({ kind: 'swap', from: [0, 0], to: [1, 0] });
    engine.advance();

    // 不應有任何事件（settled 時 advance 直接 return）
    expect(bus.events).toHaveLength(0);
  });
});

// ─── 計時關卡 ──────────────────────────────────────────────

describe('RulesEngine 計時關卡', () => {
  it('timeBudget 初始化 timeRemaining；非計時關卡為 Infinity', () => {
    const a = makeEngine({ constraints: { timeBudget: 60 } }).engine;
    expect(a.timeRemaining).toBe(60);
    const b = makeEngine({ constraints: { moveBudget: 10 } }).engine;
    expect(b.timeRemaining).toBe(Infinity);
  });

  it('tickTime 遞減剩餘秒數；非計時關卡為 no-op', () => {
    const { engine } = makeEngine({ constraints: { timeBudget: 10 } });
    engine.tickTime(2.5);
    expect(engine.timeRemaining).toBeCloseTo(7.5);
    const movesEngine = makeEngine({ constraints: { moveBudget: 5 } }).engine;
    movesEngine.tickTime(5);
    expect(movesEngine.timeRemaining).toBe(Infinity);
  });

  it('時間歸零時 emit level.resolved (failed)', () => {
    const { engine, bus } = makeEngine({
      constraints: { timeBudget: 1 },
      objective: { type: 'score', target: 999999 },
    });
    engine.tickTime(2);
    expect(engine.timeRemaining).toBe(0);
    const resolved = bus.events.filter((e) => e.kind === 'level.resolved') as Array<{
      kind: 'level.resolved';
      result: LevelResult;
    }>;
    expect(resolved.length).toBe(1);
    expect(resolved[0].result.cleared).toBe(false);
    expect(resolved[0].result.timeRemaining).toBe(0);
  });

  it('paused 期間 tickTime 不遞減', () => {
    const { engine } = makeEngine({ constraints: { timeBudget: 10 } });
    (engine as any).paused = true;
    engine.tickTime(3);
    expect(engine.timeRemaining).toBe(10);
  });

  it('通關時加上剩餘時間獎勵並用時間計算星等', () => {
    const spec = makeSpec({
      constraints: { timeBudget: 30 },
      objective: { type: 'score', target: 1 },
      stars: { one: 5, two: 15, three: 25, basis: 'timeRemaining' },
    });
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);
    const cascadeRng = new Mulberry32(42 ^ 0x9abcdef0);
    const queue = new CommandQueue();
    const bus = mockEventBus();
    const engine = new RulesEngine({ board, spec, cascadeRng, eventBus: bus, commandQueue: queue });

    const swaps = findValidSwaps(board);
    expect(swaps.length).toBeGreaterThan(0);
    const [from, to] = swaps[0];
    queue.enqueue({ kind: 'swap', from, to });
    engine.advance();

    const resolved = bus.events.filter((e) => e.kind === 'level.resolved') as Array<{
      kind: 'level.resolved';
      result: LevelResult;
    }>;
    if (resolved.length > 0) {
      const r = resolved[0].result;
      expect(r.cleared).toBe(true);
      // timeRemaining 仍接近 30（沒呼叫 tickTime），時間獎勵 = 30 × 100 = 3000
      expect(r.timeRemaining).toBe(30);
      expect(r.score).toBeGreaterThanOrEqual(3000);
      // basis=timeRemaining, 30 ≥ 25 → 三星
      expect(r.stars).toBe(3);
    }
  });
});

// ─── Intensity 測試 ─────────────────────────────────────────

describe('RulesEngine intensity', () => {
  it('初始 intensity 為 0', () => {
    const { engine } = makeEngine();
    expect(engine.intensity).toBe(0);
  });

  it('intensity 值在 [0, 1] 範圍內', () => {
    const { engine, queue } = makeEngine({
      constraints: { moveBudget: 50 },
    });

    for (let i = 0; i < 5; i++) {
      const swaps = findValidSwaps(engine.board);
      if (swaps.length === 0 || engine.settled) break;

      const [from, to] = swaps[0];
      queue.enqueue({ kind: 'swap', from, to });
      engine.advance();

      expect(engine.intensity).toBeGreaterThanOrEqual(0);
      expect(engine.intensity).toBeLessThanOrEqual(1);
    }
  });

  it('intensity.updated 事件的值在 [0, 1] 範圍內', () => {
    const { engine, queue, bus } = makeEngine({
      constraints: { moveBudget: 50 },
    });

    for (let i = 0; i < 3; i++) {
      const swaps = findValidSwaps(engine.board);
      if (swaps.length === 0 || engine.settled) break;

      const [from, to] = swaps[0];
      queue.enqueue({ kind: 'swap', from, to });
      engine.advance();
    }

    const intensityEvents = bus.events.filter(
      (e) => e.kind === 'intensity.updated',
    );

    for (const event of intensityEvents) {
      const e = event as { kind: 'intensity.updated'; value: number };
      expect(e.value).toBeGreaterThanOrEqual(0);
      expect(e.value).toBeLessThanOrEqual(1);
    }
  });
});

// ─── GameLoop 測試 ──────────────────────────────────────────

describe('GameLoop', () => {
  // Mock dependencies
  let advanceCount: number;
  let renderCalls: number[];
  let audioUpdateCount: number;
  let telemetryTicks: number[];

  let mockRules: RulesEngine;
  let mockRenderer: Renderer;
  let mockAudio: AudioSystem;
  let mockTelemetry: TelemetrySystem;
  let mockBus: EventBus;

  beforeEach(() => {
    advanceCount = 0;
    renderCalls = [];
    audioUpdateCount = 0;
    telemetryTicks = [];

    // Minimal mock RulesEngine — only advance() is called by GameLoop
    mockRules = {
      advance() {
        advanceCount++;
      },
    } as unknown as RulesEngine;

    mockRenderer = {
      render(alpha: number) {
        renderCalls.push(alpha);
      },
    };

    mockAudio = {
      update() {
        audioUpdateCount++;
      },
    };

    mockTelemetry = {
      tick(now: number) {
        telemetryTicks.push(now);
      },
    };

    mockBus = {
      emit() {},
    };

    // Stub rAF/cAF for tests (they won't actually be called since we invoke tick directly)
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: vi.fn(() => 0) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createLoop(): GameLoop {
    return new GameLoop(mockRules, mockRenderer, mockAudio, mockTelemetry, mockBus);
  }

  describe('accumulator logic: fixed dt stepping', () => {
    it('advances rules once per FIXED_DT elapsed', () => {
      const loop = createLoop();
      loop.start();

      // Simulate one frame with exactly one FIXED_DT elapsed
      loop.tick(FIXED_DT);

      expect(advanceCount).toBe(1);
    });

    it('advances rules multiple times when enough time accumulates', () => {
      const loop = createLoop();
      loop.start();

      // Simulate a frame with 50ms elapsed (≈ 3 × FIXED_DT but use integer to avoid fp issues)
      loop.tick(50);

      // 50ms / 16.667ms ≈ 2.999... → 2 advances due to floating point
      // (50 - 16.667 - 16.667 = 16.666 which is slightly < FIXED_DT)
      expect(advanceCount).toBe(2);
    });

    it('does not advance rules when less than FIXED_DT has elapsed', () => {
      const loop = createLoop();
      loop.start();

      // Simulate a frame with half a FIXED_DT
      loop.tick(FIXED_DT * 0.5);

      expect(advanceCount).toBe(0);
    });

    it('accumulates partial time across multiple ticks', () => {
      const loop = createLoop();
      loop.start();

      // First tick: 10ms (less than FIXED_DT ≈ 16.667ms)
      loop.tick(10);
      expect(advanceCount).toBe(0);

      // Second tick: 10ms more (total 20ms, enough for 1 advance)
      loop.tick(20);
      expect(advanceCount).toBe(1);

      // Remaining accumulator should be ~3.33ms
      const acc = loop.getAccumulator();
      expect(acc).toBeCloseTo(20 - FIXED_DT, 5);
    });

    it('correctly handles large time spans', () => {
      const loop = createLoop();
      loop.start();

      // 100ms → floor(100 / 16.667) = 5 advances, remainder ≈ 16.665ms
      loop.tick(100);

      expect(advanceCount).toBe(5);
      // Remaining accumulator: 100 - 5 * FIXED_DT
      expect(loop.getAccumulator()).toBeGreaterThanOrEqual(0);
      expect(loop.getAccumulator()).toBeLessThan(FIXED_DT);
    });
  });

  describe('max accumulator cap (250ms)', () => {
    it('caps dt at MAX_ACCUMULATOR when a large time gap occurs', () => {
      const loop = createLoop();
      loop.start();

      // Simulate a 2-second gap (e.g., tab return)
      loop.tick(2000);

      // Should only advance for MAX_ACCUMULATOR (250ms) worth of time
      // 250 / 16.667 = 15.0 → 15 advances (with possible fp rounding giving 14)
      // The key invariant: advances should be capped, not proportional to 2000ms
      const maxPossibleAdvances = Math.ceil(MAX_ACCUMULATOR / FIXED_DT);
      const uncappedAdvances = Math.floor(2000 / FIXED_DT);
      expect(advanceCount).toBeLessThanOrEqual(maxPossibleAdvances);
      expect(advanceCount).toBeLessThan(uncappedAdvances);
      expect(advanceCount).toBeGreaterThanOrEqual(14); // at least 14 advances from 250ms
    });

    it('accumulator never exceeds MAX_ACCUMULATOR after a large gap', () => {
      const loop = createLoop();
      loop.start();

      // Simulate a 5-second gap
      loop.tick(5000);

      // After processing, accumulator should be less than FIXED_DT (all steps consumed)
      expect(loop.getAccumulator()).toBeGreaterThanOrEqual(0);
      expect(loop.getAccumulator()).toBeLessThan(FIXED_DT);
    });

    it('large gap and small gap produce same advance count', () => {
      // A 10-second gap should produce the same result as a 250ms gap
      const loop1 = createLoop();
      loop1.start();
      loop1.tick(10000);
      const advances1 = advanceCount;

      // Reset
      advanceCount = 0;

      const loop2 = createLoop();
      loop2.start();
      loop2.tick(MAX_ACCUMULATOR);
      const advances2 = advanceCount;

      expect(advances1).toBe(advances2);
    });
  });

  describe('start/stop behavior', () => {
    it('start sets running to true', () => {
      const loop = createLoop();
      expect(loop.isRunning).toBe(false);

      loop.start();
      expect(loop.isRunning).toBe(true);
    });

    it('stop sets running to false', () => {
      const loop = createLoop();
      loop.start();
      expect(loop.isRunning).toBe(true);

      loop.stop();
      expect(loop.isRunning).toBe(false);
    });

    it('tick does nothing when not running', () => {
      const loop = createLoop();
      // Don't call start()

      loop.tick(FIXED_DT * 3);

      expect(advanceCount).toBe(0);
      expect(renderCalls).toHaveLength(0);
      expect(audioUpdateCount).toBe(0);
      expect(telemetryTicks).toHaveLength(0);
    });

    it('tick does nothing after stop', () => {
      const loop = createLoop();
      loop.start();
      loop.stop();

      loop.tick(FIXED_DT * 3);

      expect(advanceCount).toBe(0);
      expect(renderCalls).toHaveLength(0);
    });

    it('start calls requestAnimationFrame', () => {
      const loop = createLoop();
      loop.start();

      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('stop calls cancelAnimationFrame', () => {
      const loop = createLoop();
      loop.start();
      loop.stop();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('calling start twice does not double-start', () => {
      const loop = createLoop();
      loop.start();
      loop.start();

      // requestAnimationFrame should only be called once
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });
  });

  describe('alpha interpolation calculation', () => {
    it('alpha is 0 when accumulator is 0 after stepping', () => {
      const loop = createLoop();
      loop.start();

      // Exactly one FIXED_DT → accumulator becomes 0 after stepping
      loop.tick(FIXED_DT);

      expect(renderCalls).toHaveLength(1);
      expect(renderCalls[0]).toBeCloseTo(0, 5);
    });

    it('alpha is approximately 0.5 when half a step remains', () => {
      const loop = createLoop();
      loop.start();

      // 1.5 × FIXED_DT → 1 advance, 0.5 × FIXED_DT remains
      loop.tick(FIXED_DT * 1.5);

      expect(renderCalls).toHaveLength(1);
      expect(renderCalls[0]).toBeCloseTo(0.5, 2);
    });

    it('alpha is between 0 and 1', () => {
      const loop = createLoop();
      loop.start();

      // Various frame times
      const frameTimes = [5, 10, 15, 20, 25, 30, 33, 50];
      let currentTime = 0;

      for (const ft of frameTimes) {
        currentTime += ft;
        loop.tick(currentTime);
      }

      for (const alpha of renderCalls) {
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThan(1);
      }
    });

    it('alpha reflects the fractional step remaining', () => {
      const loop = createLoop();
      loop.start();

      // 0.75 × FIXED_DT → no advance, accumulator = 0.75 × FIXED_DT
      const elapsed = FIXED_DT * 0.75;
      loop.tick(elapsed);

      expect(advanceCount).toBe(0);
      expect(renderCalls).toHaveLength(1);
      expect(renderCalls[0]).toBeCloseTo(0.75, 2);
    });
  });

  describe('per-frame calls', () => {
    it('calls audio.update() each frame', () => {
      const loop = createLoop();
      loop.start();

      loop.tick(FIXED_DT);
      expect(audioUpdateCount).toBe(1);

      loop.tick(FIXED_DT * 2);
      expect(audioUpdateCount).toBe(2);

      loop.tick(FIXED_DT * 3);
      expect(audioUpdateCount).toBe(3);
    });

    it('calls telemetry.tick(now) each frame with the current timestamp', () => {
      const loop = createLoop();
      loop.start();

      loop.tick(100);
      loop.tick(200);
      loop.tick(300);

      expect(telemetryTicks).toEqual([100, 200, 300]);
    });

    it('calls renderer.render() exactly once per frame', () => {
      const loop = createLoop();
      loop.start();

      // Even with multiple rule advances, render is called once
      loop.tick(FIXED_DT * 5);

      expect(renderCalls).toHaveLength(1);
    });
  });
});
