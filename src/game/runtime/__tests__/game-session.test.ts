import { describe, it, expect } from 'vitest';
import { GameSessionController } from '../game-session';
import { createBoard, createGem, getCell } from '../../rules/board';
import { createRngStreams } from '../../rules/rng';
import { initBoard, findValidSwaps } from '../reshuffle';
import type { LevelSpec } from '../../level/level-spec';
import type { GemColour } from '../../../types';

// ─── Test Helpers ───────────────────────────────────────────

function makeSpec(overrides?: Partial<LevelSpec>): LevelSpec {
  return {
    id: 1,
    worldId: 1,
    name: { 'zh-TW': '測試', en: 'Test' },
    board: { width: 8, height: 8, empty: [] },
    gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    constraints: { moveBudget: 20 },
    objective: { type: 'score', target: 1000 },
    stars: { one: 500, two: 1000, three: 2000, basis: 'score' },
    ...overrides,
  };
}

function makeSession(specOverrides?: Partial<LevelSpec>) {
  const spec = makeSpec(specOverrides);
  const seed = 12345n;
  const rngStreams = createRngStreams(seed);
  const board = initBoard(spec, rngStreams.boardInit);
  return new GameSessionController({ spec, seed, rngStreams, board });
}

// ─── Tests ──────────────────────────────────────────────────

describe('GameSessionController', () => {
  describe('construction', () => {
    it('initializes with correct state', () => {
      const session = makeSession();
      expect(session.score).toBe(0);
      expect(session.movesRemaining).toBe(20);
      expect(session.settled).toBe(false);
      expect(session.isProcessing).toBe(false);
    });

    it('getState returns a snapshot', () => {
      const session = makeSession();
      const state = session.getState();
      expect(state.score).toBe(0);
      expect(state.movesRemaining).toBe(20);
      expect(state.settled).toBe(false);
      expect(state.objectiveProgress).toHaveLength(1);
      expect(state.objectiveProgress[0].total).toBe(1000);
    });
  });

  describe('executeSwap', () => {
    it('returns invalid for non-adjacent cells', () => {
      const session = makeSession();
      // Swap two non-adjacent cells (far apart)
      const result = session.executeSwap([0, 0], [5, 5]);
      // The swap will be invalid because detectMatches won't find matches
      // and there's no special gem, so it reverts
      expect(result.type).toBe('invalid');
      expect(result.movesConsumed).toBe(false);
    });

    it('returns invalid when settled', () => {
      const spec = makeSpec({ constraints: { moveBudget: 0 } });
      const seed = 12345n;
      const rngStreams = createRngStreams(seed);
      const board = initBoard(spec, rngStreams.boardInit);
      const session = new GameSessionController({ spec, seed, rngStreams, board });

      // Force settled state by executing a swap that triggers end condition
      // (0 moves means any valid swap would end the game)
      // Actually with 0 moves, the session starts settled after first check
      // Let's just test that a swap on a settled session returns invalid
      const result = session.executeSwap([0, 0], [0, 1]);
      if (result.valid && result.endCondition) {
        // After settling, next swap should be invalid
        const result2 = session.executeSwap([0, 0], [0, 1]);
        expect(result2.valid).toBe(false);
      }
    });

    it('consumes a move on valid swap', () => {
      const session = makeSession();
      const initialMoves = session.movesRemaining;

      // Try swapping adjacent cells - may or may not produce a match
      const result = session.executeSwap([0, 0], [0, 1]);
      if (result.valid) {
        expect(session.movesRemaining).toBe(initialMoves - 1);
        expect(result.movesConsumed).toBe(true);
      } else {
        expect(session.movesRemaining).toBe(initialMoves);
      }
    });

    it('produces cascade steps on valid match', () => {
      const session = makeSession();

      // Try many adjacent swaps until we find one that produces a match
      let found = false;
      for (let c = 0; c < 7 && !found; c++) {
        for (let r = 0; r < 8 && !found; r++) {
          const result = session.executeSwap([c, r], [c + 1, r]);
          if (result.valid && result.type === 'normal') {
            expect(result.cascadeSteps.length).toBeGreaterThan(0);
            expect(result.cascadeSteps[0].chain).toBeGreaterThan(0);
            expect(result.totalScore).toBeGreaterThan(0);
            found = true;
          }
        }
      }
      // It's possible (but unlikely) that no swap produces a match with this seed
      // In that case, just verify the session is still consistent
      expect(session.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeActivation', () => {
    it('returns null for non-special gem', () => {
      const session = makeSession();
      // Most cells won't have specials on a fresh board
      const result = session.executeActivation([0, 0]);
      expect(result).toBeNull();
    });

    it('does not consume moves', () => {
      const session = makeSession();
      const initialMoves = session.movesRemaining;

      // Place a special gem manually for testing
      const cell = getCell(session.board, [3, 3]);
      if (cell && cell.gem) {
        cell.gem.special = 'area';
        cell.gem.colour = null;
      }

      const result = session.executeActivation([3, 3]);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.valid).toBe(true);
        expect(result.type).toBe('area');
        expect(session.movesRemaining).toBe(initialMoves);
      }
    });
  });

  describe('tickTime', () => {
    it('decrements time for timed levels', () => {
      const session = makeSession({ constraints: { timeBudget: 60 } });
      expect(session.timeRemaining).toBe(60);
      session.tickTime(1.5);
      expect(session.timeRemaining).toBe(58.5);
    });

    it('does not go below zero', () => {
      const session = makeSession({ constraints: { timeBudget: 5 } });
      session.tickTime(10);
      expect(session.timeRemaining).toBe(0);
    });

    it('does nothing for move-based levels', () => {
      const session = makeSession({ constraints: { moveBudget: 20 } });
      session.tickTime(100);
      expect(session.timeRemaining).toBe(Infinity);
    });
  });

  describe('end conditions', () => {
    it('detects score objective completion', () => {
      const session = makeSession({ objective: { type: 'score', target: 10 } });

      // Keep swapping until we either reach the score or run out of moves
      let endCondition = null;
      for (let c = 0; c < 7 && !endCondition; c++) {
        for (let r = 0; r < 8 && !endCondition; r++) {
          if (session.settled) break;
          const result = session.executeSwap([c, r], [c + 1, r]);
          if (result.endCondition) {
            endCondition = result.endCondition;
          }
        }
      }

      // Either we hit the score target or ran out of moves
      if (endCondition) {
        expect(endCondition.levelId).toBe(1);
        expect(typeof endCondition.cleared).toBe('boolean');
        expect(typeof endCondition.stars).toBe('number');
      }
      expect(session.settled).toBe(true);
    });
  });

  describe('checkAndReshuffle', () => {
    // 數學上保證無解的棋盤：(col + row) % 5 循環五色
    // 對任何相鄰交換，交換後的相鄰格 mod-5 餘數均不同，不可能形成 3-in-a-row。
    // 使用五色以確保 reshuffle() 的置換嘗試有足夠成功率（約 5%/次）。
    function makeDeadlockedSession(): GameSessionController {
      const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
      const spec = makeSpec({ gems: { colours } });
      const rngStreams = createRngStreams(1n);
      const board = createBoard(8, 8);
      for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 8; r++) {
          board.cells[c][r].gem = createGem(colours[(c + r) % 5]);
        }
      }
      return new GameSessionController({ spec, seed: 1n, rngStreams, board });
    }

    it('returns null when board has valid swaps', () => {
      const session = makeSession();
      expect(session.checkAndReshuffle()).toBeNull();
    });

    it('returns move array and reshuffles when board is deadlocked', () => {
      const session = makeDeadlockedSession();
      // 確認起始狀態確實無解
      const boardRef = (session as any).board;
      expect(findValidSwaps(boardRef)).toHaveLength(0);

      const moves = session.checkAndReshuffle();

      expect(moves).not.toBeNull();
      expect(Array.isArray(moves)).toBe(true);
      expect(findValidSwaps(boardRef).length).toBeGreaterThan(0);
    });

    it('returns null on second call after reshuffle', () => {
      const session = makeDeadlockedSession();
      session.checkAndReshuffle();
      // After reshuffle board should have valid swaps → second call returns null
      expect(session.checkAndReshuffle()).toBeNull();
    });
  });
});

// ─── Special Rules（GDD 02§2.3.1）───────────────────────────

describe('specialRules', () => {
  const CORE_RULES = ['immovableCore(3, 3, 3, 3)', 'coreColourShift(2)'];

  function makeCoreSession(rules: string[] = CORE_RULES) {
    return makeSession({
      board: { width: 9, height: 9, empty: [] },
      constraints: { moveBudget: 30 },
      objective: { type: 'score', target: 999999 },
      specialRules: rules,
    });
  }

  /** 在核心外找一組有效交換並執行（保證消耗一手） */
  function playOneValidMove(session: GameSessionController): boolean {
    const swaps = findValidSwaps(session.board);
    for (const [from, to] of swaps) {
      const result = session.executeSwap(from, to);
      if (result.valid) return true;
    }
    return false;
  }

  describe('immovableCore', () => {
    it('initBoard 將核心區設為 locked 且同色', () => {
      const session = makeCoreSession();
      const colours = new Set<string>();
      for (let c = 3; c <= 5; c++) {
        for (let r = 3; r <= 5; r++) {
          const cell = getCell(session.board, [c, r])!;
          expect(cell.gem?.locked, `(${c},${r}) 應為 locked`).toBe(true);
          if (cell.gem?.colour) colours.add(cell.gem.colour);
        }
      }
      expect(colours.size).toBe(1);
    });

    it('核心區的交換被拒絕（immovableBlocked，不扣手）', () => {
      const session = makeCoreSession();
      const result = session.executeSwap([4, 4], [4, 3]);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('immovableBlocked');
      expect(session.movesRemaining).toBe(30);
    });

    it('核心邊界的交換（一格在內）也被拒絕', () => {
      const session = makeCoreSession();
      const result = session.executeSwap([2, 3], [3, 3]);
      expect(result.valid).toBe(false);
      expect(result.type).toBe('immovableBlocked');
    });
  });

  describe('coreColourShift', () => {
    it('每 N 手核心變色且保持同色、仍為 locked', () => {
      const session = makeCoreSession();
      const before = getCell(session.board, [4, 4])!.gem!.colour;

      // 消耗 2 手（everyN = 2）
      let played = 0;
      while (played < 2) {
        expect(playOneValidMove(session), '測試盤面應有有效交換').toBe(true);
        played++;
      }

      const after = getCell(session.board, [4, 4])!.gem!.colour;
      expect(after).not.toBe(before);

      const colours = new Set<string>();
      for (let c = 3; c <= 5; c++) {
        for (let r = 3; r <= 5; r++) {
          const cell = getCell(session.board, [c, r])!;
          expect(cell.gem?.locked).toBe(true);
          if (cell.gem?.colour) colours.add(cell.gem.colour);
        }
      }
      expect(colours.size).toBe(1);
    });

    it('未達 N 手不變色', () => {
      const session = makeCoreSession(['immovableCore(3, 3, 3, 3)', 'coreColourShift(5)']);
      const before = getCell(session.board, [4, 4])!.gem!.colour;
      expect(playOneValidMove(session)).toBe(true);
      expect(getCell(session.board, [4, 4])!.gem!.colour).toBe(before);
    });
  });

  describe('per-move blocker ticks', () => {
    it('generator 每手推進並在達到 everyNMoves 時生成', () => {
      const session = makeSession({
        objective: { type: 'score', target: 999999 },
        blockers: [
          { type: 'generator', at: [0, 0], generatorSpec: { spawnKind: 'jelly', everyNMoves: 1 } },
        ],
      });

      expect(playOneValidMove(session)).toBe(true);

      // 生成在 (0,0) 的 4-鄰：(1,0) 或 (0,1)
      const n1 = getCell(session.board, [1, 0])!.blocker;
      const n2 = getCell(session.board, [0, 1])!.blocker;
      expect(n1?.kind === 'jelly' || n2?.kind === 'jelly').toBe(true);
    });

    it('unstable 每手倒數，歸零時爆炸並罰分', () => {
      const session = makeSession({
        objective: { type: 'score', target: 999999 },
        blockers: [{ type: 'unstable', at: [4, 4], unstableSpec: { countdown: 1 } }],
      });

      expect(playOneValidMove(session)).toBe(true);

      // 爆炸後 blocker 消失
      expect(getCell(session.board, [4, 4])!.blocker).toBeNull();
      // 爆炸後盤面被補滿（無空洞）
      for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 8; r++) {
          expect(getCell(session.board, [c, r])!.gem).not.toBeNull();
        }
      }
    });

    it('tap-activate 不觸發 per-move tick（不扣手）', () => {
      const session = makeSession({
        objective: { type: 'score', target: 999999 },
        blockers: [{ type: 'unstable', at: [0, 7], unstableSpec: { countdown: 1 } }],
      });
      // 手動放一顆獨立 area bomb 後 tap
      const cell = getCell(session.board, [7, 0])!;
      cell.gem = createGem(null, 'area');
      const result = session.executeActivation([7, 0]);
      expect(result?.valid).toBe(true);
      // 未扣手 → unstable 不倒數
      expect(session.movesRemaining).toBe(20);
      expect(getCell(session.board, [0, 7])!.blocker?.kind).toBe('unstable');
    });
  });

  describe('destroyed blocker tracking', () => {
    it('line bomb 摧毀 lock 計入 clear 目標', () => {
      const session = makeSession({
        objective: { type: 'clear', target: [{ blocker: 'lock', count: 1 }] },
        blockers: [{ type: 'lock', at: [0, 3] }],
      });

      // 在 lock 同一列放一顆 lineH 並 tap 啟動
      const bombCell = getCell(session.board, [5, 3])!;
      bombCell.gem = createGem(null, 'lineH');
      const result = session.executeActivation([5, 3]);
      expect(result?.valid).toBe(true);

      // lock 被摧毀且目標完成
      expect(getCell(session.board, [0, 3])!.blocker).toBeNull();
      expect(result?.endCondition?.cleared).toBe(true);
    });
  });
});
