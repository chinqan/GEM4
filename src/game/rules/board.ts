import type { CellPos, GemColour, SpecialGemType, BlockerKind } from '../../types';

// ─── 型別定義 ───────────────────────────────────────────────

/** 不穩定寶石狀態 */
export interface UnstableState {
  countdown: number;
}

/** 寶石 */
export interface Gem {
  colour: GemColour | null; // null 僅用於 Colour Gem
  special: SpecialGemType | null;
  locked: boolean;
  unstable: UnstableState | null;
}

/** Blocker 狀態 */
export type BlockerState =
  | { kind: 'jelly'; layers: 1 | 2 | 3 }
  | { kind: 'lock' }
  | {
      kind: 'generator';
      spawnKind: BlockerKind;
      everyNMoves: number;
      movesSinceLastSpawn: number;
    }
  | { kind: 'unstable'; countdown: number };

/** 單一格子 */
export interface Cell {
  gem: Gem | null;
  blocker: BlockerState | null;
  isDelivery: boolean;
  isEmpty: boolean; // 永久空格
}

/** 棋盤 */
export interface Board {
  width: number;
  height: number;
  cells: Cell[][]; // cells[col][row]，column-major
}

// ─── 工廠函式 ───────────────────────────────────────────────

/** 建立寶石的便利函式 */
export function createGem(
  colour: GemColour,
  special: SpecialGemType | null = null,
): Gem {
  return {
    colour,
    special,
    locked: false,
    unstable: null,
  };
}

/** 建立一個空的 Cell */
function createCell(): Cell {
  return {
    gem: null,
    blocker: null,
    isDelivery: false,
    isEmpty: false,
  };
}

// ─── 棋盤建立 ───────────────────────────────────────────────

/**
 * 建立 width × height 的棋盤。
 * empty 中的座標設為 isEmpty = true。
 * 所有格子初始 gem = null, blocker = null, isDelivery = false。
 */
export function createBoard(
  width: number,
  height: number,
  empty: CellPos[] = [],
): Board {
  const cells: Cell[][] = [];
  for (let col = 0; col < width; col++) {
    const column: Cell[] = [];
    for (let row = 0; row < height; row++) {
      column.push(createCell());
    }
    cells.push(column);
  }

  // 標記永久空格
  for (const [col, row] of empty) {
    if (col >= 0 && col < width && row >= 0 && row < height) {
      cells[col][row].isEmpty = true;
    }
  }

  return { width, height, cells };
}

// ─── 格子操作 ───────────────────────────────────────────────

/** 檢查座標是否在棋盤範圍內 */
export function isValidPos(board: Board, pos: CellPos): boolean {
  const [col, row] = pos;
  return col >= 0 && col < board.width && row >= 0 && row < board.height;
}

/** 取得格子，超出範圍回傳 null */
export function getCell(board: Board, pos: CellPos): Cell | null {
  if (!isValidPos(board, pos)) return null;
  const [col, row] = pos;
  return board.cells[col][row];
}

/** 設定格子（原地修改） */
export function setCell(board: Board, pos: CellPos, cell: Cell): void {
  if (!isValidPos(board, pos)) return;
  const [col, row] = pos;
  board.cells[col][row] = cell;
}

/** 取得上下左右 4 個有效鄰居座標（排除超出範圍的） */
export function getNeighbors(board: Board, pos: CellPos): CellPos[] {
  const [col, row] = pos;
  const candidates: CellPos[] = [
    [col, row - 1], // 上
    [col, row + 1], // 下
    [col - 1, row], // 左
    [col + 1, row], // 右
  ];
  return candidates.filter((p) => isValidPos(board, p));
}

// ─── 深拷貝 ────────────────────────────────────────────────

/** 深拷貝 Gem */
function cloneGem(gem: Gem): Gem {
  return {
    colour: gem.colour,
    special: gem.special,
    locked: gem.locked,
    unstable: gem.unstable ? { countdown: gem.unstable.countdown } : null,
  };
}

/** 深拷貝 BlockerState */
function cloneBlocker(blocker: BlockerState): BlockerState {
  switch (blocker.kind) {
    case 'jelly':
      return { kind: 'jelly', layers: blocker.layers };
    case 'lock':
      return { kind: 'lock' };
    case 'generator':
      return {
        kind: 'generator',
        spawnKind: blocker.spawnKind,
        everyNMoves: blocker.everyNMoves,
        movesSinceLastSpawn: blocker.movesSinceLastSpawn,
      };
    case 'unstable':
      return { kind: 'unstable', countdown: blocker.countdown };
  }
}

/** 深拷貝 Cell */
function cloneCell(cell: Cell): Cell {
  return {
    gem: cell.gem ? cloneGem(cell.gem) : null,
    blocker: cell.blocker ? cloneBlocker(cell.blocker) : null,
    isDelivery: cell.isDelivery,
    isEmpty: cell.isEmpty,
  };
}

/** 深拷貝整個棋盤（包含所有 Cell、Gem、BlockerState） */
export function cloneBoard(board: Board): Board {
  const cells: Cell[][] = [];
  for (let col = 0; col < board.width; col++) {
    const column: Cell[] = [];
    for (let row = 0; row < board.height; row++) {
      column.push(cloneCell(board.cells[col][row]));
    }
    cells.push(column);
  }
  return { width: board.width, height: board.height, cells };
}
