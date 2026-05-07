import { describe, it, expect } from 'vitest';
import { GameSessionController } from '../game-session';
import { createBoard, createGem } from '../../rules/board';
import { createRngStreams } from '../../rules/rng';
import type { LevelSpec } from '../../level/level-spec';
import type { GemColour } from '../../../types';
import { placeGem } from '../../__tests__/test-helpers';

function makeSpec(): LevelSpec {
  return {
    id: 1, worldId: 1,
    name: { 'zh-TW': 'Test', en: 'Test' },
    board: { width: 7, height: 7, empty: [] },
    gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
    constraints: { moveBudget: 20 },
    objective: { type: 'score', target: 1000 },
    stars: { one: 500, two: 1000, three: 2000, basis: 'score' },
  };
}

function setupBoard() {
  const board = createBoard(7, 7);
  const colours: GemColour[] = ['R', 'G', 'B', 'Y', 'P'];
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 7; r++) {
      placeGem(board, c, r, colours[(c + r * 2) % 5]);
    }
  }
  board.cells[3][3].gem = createGem(null as any, 'lineH');
  board.cells[3][3].gem!.colour = null;
  board.cells[1][3].gem = createGem('R', 'lineV');
  return board;
}

describe('Drag chain reaction bug', () => {
  it('lineH swap triggers passive lineV chain with full colour info', () => {
    const board = setupBoard();
    const spec = makeSpec();
    const rngStreams = createRngStreams(42n);
    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });

    const result = session.executeSwap([3, 3], [4, 3]);

    expect(result.valid).toBe(true);
    expect(result.type).toBe('directBomb');

    const pa = result.initialActivation!.passiveActivations;
    const lineV = pa.find(p => p.pos[0] === 1 && p.pos[1] === 3);
    expect(lineV).toBeDefined();
    expect(lineV!.type).toBe('lineV');
    expect(lineV!.clearedCells.length).toBeGreaterThan(0);

    const positions = result.initialActivation!.clearedCells.map(c => `${c.pos[0]},${c.pos[1]}`);
    for (const [cc, rr] of lineV!.clearedCells) {
      expect(positions).toContain(`${cc},${rr}`);
    }

    const withColour = result.initialActivation!.clearedCells.filter(c => c.colour !== null);
    expect(withColour.length).toBeGreaterThanOrEqual(12);
  });

  it('lineH tap-activate triggers passive lineV chain', () => {
    const board = setupBoard();
    const spec = makeSpec();
    const rngStreams = createRngStreams(42n);
    const session = new GameSessionController({ spec, seed: 42n, rngStreams, board });

    const result = session.executeActivation([3, 3]);

    expect(result).not.toBeNull();
    expect(result!.valid).toBe(true);

    const lineV = result!.passiveActivations.find(p => p.pos[0] === 1 && p.pos[1] === 3);
    expect(lineV).toBeDefined();
    expect(lineV!.type).toBe('lineV');
    expect(lineV!.clearedCells.length).toBeGreaterThan(0);
  });
});
