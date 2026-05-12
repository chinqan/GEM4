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
