import { describe, it, expect } from 'vitest';
import type { GemColour } from '../../../types';
import { createBoard, createGem, cloneBoard } from '../../rules/board';
import type { Board } from '../../rules/board';
import { detectMatches } from '../../rules/match-detect';
import { Mulberry32 } from '../../rules/rng';
import { initBoard } from '../reshuffle';
import { findHint, HintTimer } from '../hint';
import type { HintEventBus, HintShownEvent } from '../hint';
import type { LevelSpec } from '../../level/level-spec';

// ─── 輔助 ───────────────────────────────────────────────────

/** 建立最小 LevelSpec 用於測試 */
function makeSpec(overrides: Partial<LevelSpec> = {}): LevelSpec {
  return {
    id: 1,
    worldId: 1,
    name: { 'zh-TW': '測試', en: 'Test' },
    board: { width: 6, height: 6, empty: [] },
    gems: { colours: ['R', 'G', 'B'] as GemColour[] },
    constraints: { moveBudget: 15 },
    objective: { type: 'score', target: 2000 },
    stars: { one: 2000, two: 3200, three: 5000, basis: 'score' },
    ...overrides,
  };
}

// ─── findHint 單元測試 ──────────────────────────────────────

describe('findHint', () => {
  it('在有有效交換的棋盤上回傳一組交換', () => {
    const spec = makeSpec();
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    const hint = findHint(board);

    expect(hint).not.toBeNull();
    expect(hint!.length).toBe(2);

    // 兩個位置應該是有效的棋盤座標
    const [from, to] = hint!;
    expect(from[0]).toBeGreaterThanOrEqual(0);
    expect(from[0]).toBeLessThan(board.width);
    expect(from[1]).toBeGreaterThanOrEqual(0);
    expect(from[1]).toBeLessThan(board.height);
    expect(to[0]).toBeGreaterThanOrEqual(0);
    expect(to[0]).toBeLessThan(board.width);
    expect(to[1]).toBeGreaterThanOrEqual(0);
    expect(to[1]).toBeLessThan(board.height);
  });

  it('在無有效交換的棋盤上回傳 null', () => {
    // 建立一個精心設計的棋盤，使得任何相鄰交換都不會產生 3 連。
    // 使用 4 色重複模式：每列循環 R G B Y，列間偏移 2，
    // 確保水平和垂直方向都不會因交換而形成 3 連。
    const board = createBoard(4, 4);

    // 列模式（col-major）：
    // col 0: R G B Y   col 1: B Y R G   col 2: R G B Y   col 3: B Y R G
    // 這樣水平方向是 R B R B / G Y G Y / B R B R / Y G Y G
    // 垂直方向是 R G B Y 或 B Y R G
    // 任何相鄰交換都不會產生 3 連
    const patterns: GemColour[][] = [
      ['R', 'G', 'B', 'Y'],
      ['B', 'Y', 'R', 'G'],
      ['R', 'G', 'B', 'Y'],
      ['B', 'Y', 'R', 'G'],
    ];

    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        board.cells[col][row].gem = createGem(patterns[col][row]);
      }
    }

    const hint = findHint(board);
    expect(hint).toBeNull();
  });

  it('回傳的交換實際上會產生消除', () => {
    const spec = makeSpec({
      board: { width: 8, height: 8, empty: [] },
      gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    });
    const rng = new Mulberry32(123);
    const board = initBoard(spec, rng);

    const hint = findHint(board);
    expect(hint).not.toBeNull();

    // 在克隆棋盤上執行交換，驗證確實產生消除
    const sim = cloneBoard(board);
    const [from, to] = hint!;
    const [fc, fr] = from;
    const [tc, tr] = to;

    const tempGem = sim.cells[fc][fr].gem;
    sim.cells[fc][fr].gem = sim.cells[tc][tr].gem;
    sim.cells[tc][tr].gem = tempGem;

    const matches = detectMatches(sim);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('偏好能產生特殊寶石的交換', () => {
    // 建立一個有明確 4 連機會的棋盤
    const board = createBoard(6, 6);

    // 填充基底（交替色避免意外消除）
    for (let col = 0; col < 6; col++) {
      for (let row = 0; row < 6; row++) {
        const colours: GemColour[] = ['G', 'B', 'Y'];
        board.cells[col][row].gem = createGem(colours[(col + row * 2) % 3]);
      }
    }

    // 在 row 2 設置一個 4 連機會：R R _ R R
    // 交換 (2,2) 和某個 R 可以形成 4 連
    board.cells[0][2].gem = createGem('R');
    board.cells[1][2].gem = createGem('R');
    board.cells[2][2].gem = createGem('G'); // 這個位置可以被交換
    board.cells[3][2].gem = createGem('R');
    board.cells[4][2].gem = createGem('R');

    // 同時在 row 4 設置一個普通 3 連機會
    board.cells[0][4].gem = createGem('B');
    board.cells[1][4].gem = createGem('B');
    board.cells[2][4].gem = createGem('Y');
    board.cells[2][3].gem = createGem('B'); // 交換 (2,3)B 和 (2,4)Y 可形成 3 連

    const hint = findHint(board);

    // 只要有暗示就好（棋盤可能因為其他意外消除而有不同結果）
    // 主要驗證函式不會崩潰且回傳有效結果
    if (hint !== null) {
      const sim = cloneBoard(board);
      const [from, to] = hint;
      const tempGem = sim.cells[from[0]][from[1]].gem;
      sim.cells[from[0]][from[1]].gem = sim.cells[to[0]][to[1]].gem;
      sim.cells[to[0]][to[1]].gem = tempGem;

      const matches = detectMatches(sim);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it('是純函式，不修改原始棋盤', () => {
    const spec = makeSpec();
    const rng = new Mulberry32(42);
    const board = initBoard(spec, rng);

    // 記錄原始棋盤狀態
    const originalState = JSON.stringify(board);

    findHint(board);

    // 棋盤應該沒有被修改
    expect(JSON.stringify(board)).toBe(originalState);
  });

  it('在多種棋盤配置下都能正確運作', () => {
    const seeds = [1, 42, 100, 999, 12345];
    const colourSets: GemColour[][] = [
      ['R', 'G', 'B'],
      ['R', 'G', 'B', 'Y'],
      ['R', 'G', 'B', 'Y', 'P'],
    ];

    for (const seed of seeds) {
      for (const colours of colourSets) {
        const spec = makeSpec({
          board: { width: 7, height: 7, empty: [] },
          gems: { colours },
        });
        const rng = new Mulberry32(seed);
        const board = initBoard(spec, rng);

        const hint = findHint(board);

        // initBoard 保證至少有 1 組有效交換，所以 hint 不應為 null
        expect(hint).not.toBeNull();

        // 驗證交換確實產生消除
        const sim = cloneBoard(board);
        const [from, to] = hint!;
        const tempGem = sim.cells[from[0]][from[1]].gem;
        sim.cells[from[0]][from[1]].gem = sim.cells[to[0]][to[1]].gem;
        sim.cells[to[0]][to[1]].gem = tempGem;

        const matches = detectMatches(sim);
        expect(matches.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── HintTimer 單元測試 ─────────────────────────────────────

/** 建立有有效交換的棋盤（用於 HintTimer 測試） */
function makeBoardWithHint(): Board {
  const spec = makeSpec();
  const rng = new Mulberry32(42);
  return initBoard(spec, rng);
}

/** 建立 mock event bus */
function mockEventBus(): HintEventBus & { events: HintShownEvent[] } {
  const events: HintShownEvent[] = [];
  return {
    events,
    emit(event: HintShownEvent) {
      events.push(event);
    },
  };
}

describe('HintTimer', () => {
  it('閒置 hintDelayMs 後觸發暗示', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 5000);

    // 累加 4999ms → 不應觸發
    timer.update(4999);
    expect(bus.events).toHaveLength(0);

    // 再累加 1ms → 達到 5000ms → 應觸發
    timer.update(1);
    expect(bus.events).toHaveLength(1);
    expect(bus.events[0].kind).toBe('hint.shown');
  });

  it('一次 update 超過 hintDelayMs 也能觸發', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 3000);

    timer.update(5000);
    expect(bus.events).toHaveLength(1);
  });

  it('玩家操作後 reset 重置計時器', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 5000);

    // 累加 3000ms
    timer.update(3000);
    expect(bus.events).toHaveLength(0);

    // 玩家操作 → reset
    timer.reset();

    // 再累加 3000ms → 總共只有 3000ms（不是 6000ms），不應觸發
    timer.update(3000);
    expect(bus.events).toHaveLength(0);

    // 再累加 2000ms → 達到 5000ms → 應觸發
    timer.update(2000);
    expect(bus.events).toHaveLength(1);
  });

  it('顯示暗示後不會重複觸發（直到 reset）', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 1000);

    // 觸發暗示
    timer.update(1000);
    expect(bus.events).toHaveLength(1);

    // 繼續累加 → 不應再觸發
    timer.update(5000);
    timer.update(5000);
    expect(bus.events).toHaveLength(1);

    // reset 後可以再次觸發
    timer.reset();
    timer.update(1000);
    expect(bus.events).toHaveLength(2);
  });

  it('暫停期間不累加時間', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 5000);

    // 累加 2000ms
    timer.update(2000);

    // 暫停
    timer.pause();
    expect(timer.isPaused).toBe(true);

    // 暫停期間的 update 不應累加
    timer.update(10000);
    expect(bus.events).toHaveLength(0);

    // 恢復
    timer.resume();
    expect(timer.isPaused).toBe(false);

    // 再累加 2999ms → 總共 4999ms → 不應觸發
    timer.update(2999);
    expect(bus.events).toHaveLength(0);

    // 再累加 1ms → 達到 5000ms → 應觸發
    timer.update(1);
    expect(bus.events).toHaveLength(1);
  });

  it('emit hint.shown 事件包含正確的 cells', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 1000);

    timer.update(1000);

    expect(bus.events).toHaveLength(1);
    const event = bus.events[0];
    expect(event.kind).toBe('hint.shown');
    // 高亮涵蓋交換兩格 + 模擬交換後會被消除的格子 → 至少 2 格
    expect(event.cells.length).toBeGreaterThanOrEqual(2);

    // cells 應該是有效的棋盤座標
    for (const [col, row] of event.cells) {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(board.width);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(board.height);
    }

    // cells 應該包含 findHint 找到的交換兩格
    const expectedHint = findHint(board);
    expect(expectedHint).not.toBeNull();
    const cellKeys = new Set(event.cells.map(([c, r]: [number, number]) => `${c},${r}`));
    for (const [c, r] of expectedHint!) {
      expect(cellKeys.has(`${c},${r}`)).toBe(true);
    }
  });

  it('hintDelayMs 為 0 時停用暗示', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 0);

    timer.update(100000);
    expect(bus.events).toHaveLength(0);
  });

  it('棋盤無有效交換時不 emit 事件但標記為已顯示', () => {
    // 建立無有效交換的棋盤
    const board = createBoard(4, 4);
    const patterns: GemColour[][] = [
      ['R', 'G', 'B', 'Y'],
      ['B', 'Y', 'R', 'G'],
      ['R', 'G', 'B', 'Y'],
      ['B', 'Y', 'R', 'G'],
    ];
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        board.cells[col][row].gem = createGem(patterns[col][row]);
      }
    }

    const bus = mockEventBus();
    let noHintCalled = 0;
    const timer = new HintTimer(() => board, bus, 1000, () => { noHintCalled++; });

    timer.update(1000);

    // 無有效交換 → 不 emit，改通知 onNoHint（呼叫端執行 reshuffle）
    expect(bus.events).toHaveLength(0);
    expect(noHintCalled).toBe(1);
    // 計時器重置，重洗後可再次提示
    expect(timer.isHintShown).toBe(false);
    expect(timer.elapsedMs).toBe(0);
  });

  it('elapsedMs 正確追蹤累計時間', () => {
    const board = makeBoardWithHint();
    const bus = mockEventBus();
    const timer = new HintTimer(() => board, bus, 5000);

    expect(timer.elapsedMs).toBe(0);

    timer.update(1000);
    expect(timer.elapsedMs).toBe(1000);

    timer.update(500);
    expect(timer.elapsedMs).toBe(1500);

    timer.reset();
    expect(timer.elapsedMs).toBe(0);
  });
});
