// ─── Game Session Controller ────────────────────────────────
// Extracted from GameIntegration.startLevel() to encapsulate
// pure game logic: swap execution, cascade, scoring, objective tracking.
//
// This module is rendering-agnostic. It returns structured results
// that the rendering layer (BoardAnimator) can consume for animations.

import type { Board } from '../rules/board';
import type { LevelSpec } from '../level/level-spec';
import type { RngStreams } from '../rules/rng';
import type { CellPos, GemColour, SpecialGemType, MatchDescriptor, ComboType, BlockerKind } from '../../types';
import type { ObjectiveTracker } from '../level/objective';
import { getCell, createGem } from '../rules/board';
import { detectMatches } from '../rules/match-detect';
import { applyGravity, fillFromTop, collectDeliveryItems } from '../rules/cascade';
import { matchScore, specialActivationScore, comboScore, remainingMovesBonus, remainingTimeBonus } from '../rules/scoring';
import { resolveCombo, comboKey } from '../rules/combo-matrix';
import { activateColourGem, activateLineBomb, activateAreaBomb, processSpecialActivations } from '../rules/special-gems';
import { CollectTracker, ClearTracker, DropTracker, createTracker, calculateStars } from '../level/objective';

// ─── Result Types ───────────────────────────────────────────

/** Describes a single cleared cell with its pre-clear colour */
export interface ClearedCellInfo {
  pos: CellPos;
  colour: GemColour | null;
}

/** Describes a special gem activation event */
export interface SpecialActivationEvent {
  pos: CellPos;
  type: SpecialGemType;
  clearedCells: CellPos[];
  score: number;
}

/** Describes a gravity drop for animation */
export interface DropInfo {
  col: number;
  toRow: number;
  distance: number;
  isDelivery: boolean;
}

/** Describes delivery items that reached their target */
export interface DeliveryCollected {
  pos: CellPos;
}

/** Result of a gravity + fill operation */
export interface GravityResult {
  drops: DropInfo[];
  deliveryCollected: DeliveryCollected[];
}

/** Per-cell jelly blocker change recorded at game-logic time */
export interface BlockerHit {
  pos: CellPos;
  /** Layer count BEFORE this hit */
  fromLayer: number;
  /** True if the jelly was fully removed (layers → 0) */
  cleared: boolean;
}

/** A single cascade step (match → clear → gravity) */
export interface CascadeStep {
  chain: number;
  matches: MatchDescriptor[];
  clearedCells: ClearedCellInfo[];
  /** Positions where new special gems spawned (excluded from clear) */
  spawnPositions: CellPos[];
  /** Special gems activated within this cascade step */
  specialActivations: SpecialActivationEvent[];
  /** Passive activations triggered by cleared specials */
  passiveActivations: SpecialActivationEvent[];
  score: number;
  gravity: GravityResult;
  /** Board snapshot BEFORE clears (for rendering the correct state during clear animation) */
  preClearSnapshot: BoardSnapshot;
  /** Board snapshot AFTER gravity + fill (for gravity drop animation) */
  boardSnapshot: BoardSnapshot;
  /** Jelly blocker changes that occurred during this step (for per-step visual update) */
  blockerHits: BlockerHit[];
}

/** Lightweight board snapshot for animation rendering */
export interface BoardSnapshot {
  width: number;
  height: number;
  cells: BoardSnapshotCell[][];
}

export interface BoardSnapshotCell {
  gem: { colour: GemColour | null; special: SpecialGemType | null } | null;
  isEmpty: boolean;
  deliveryItem: boolean;
}

/** Swap type discriminator */
export type SwapType = 'normal' | 'combo' | 'colour' | 'directBomb' | 'invalid' | 'jellyBlocked';

/** Result of a swap operation */
export interface SwapResult {
  valid: boolean;
  type: SwapType;
  movesConsumed: boolean;
  /** Initial activation (for combo/colour/directBomb paths) */
  initialActivation?: {
    type: SpecialGemType | 'combo';
    /** Specific combo type when type === 'combo' (e.g. 'colour.line') */
    comboType?: ComboType;
    /** Positions of gems transformed during colour.line / colour.bomb combos */
    comboTargets?: CellPos[];
    pos: CellPos;
    clearedCells: ClearedCellInfo[];
    score: number;
    passiveActivations: SpecialActivationEvent[];
    /** Gravity result from the initial activation clear (before cascade) */
    gravity: GravityResult;
    /** Board snapshot after gravity + fill (for correct animation rendering) */
    boardSnapshot: BoardSnapshot;
    /** Jelly blocker changes from the initial activation blast */
    blockerHits: BlockerHit[];
    /** Special gems spawned by concurrent matches during directBomb (pos + type + source cells) */
    spawnInfos?: Array<{ pos: CellPos; type: SpecialGemType; cells: CellPos[] }>;
  };
  /** Cascade steps after the initial clear */
  cascadeSteps: CascadeStep[];
  /** Total score earned from this swap */
  totalScore: number;
  /** End condition reached after this swap */
  endCondition: EndCondition | null;
}

/** Result of a tap-activate operation */
export interface ActivateResult {
  valid: boolean;
  type: SpecialGemType;
  pos: CellPos;
  clearedCells: ClearedCellInfo[];
  score: number;
  passiveActivations: SpecialActivationEvent[];
  /** Gravity result from the initial activation clear (before cascade) */
  gravity: GravityResult;
  /** Board snapshot after gravity + fill (for correct animation rendering) */
  boardSnapshot: BoardSnapshot;
  /** Jelly blocker changes from the initial activation blast */
  blockerHits: BlockerHit[];
  cascadeSteps: CascadeStep[];
  totalScore: number;
  endCondition: EndCondition | null;
}

/** End condition descriptor */
export interface EndCondition {
  cleared: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  movesRemaining: number;
  timeRemaining: number;
  levelId: number;
}

/** Current session state snapshot (for HUD updates) */
export interface SessionState {
  score: number;
  movesRemaining: number;
  timeRemaining: number;
  objectiveProgress: Array<{ current: number; total: number }>;
  settled: boolean;
}

// ─── Configuration ──────────────────────────────────────────

export interface GameSessionConfig {
  spec: LevelSpec;
  seed: bigint;
  rngStreams: RngStreams;
  board: Board;
}

// ─── Constants ──────────────────────────────────────────────

const MAX_CASCADE_STEPS = 50;

// ─── Game Session Controller ────────────────────────────────

/**
 * Encapsulates all game logic for a single level session.
 *
 * Responsibilities:
 * - Execute swaps (normal, combo, colour gem, direct bomb)
 * - Run cascade loops (match → clear → gravity → repeat)
 * - Track objectives and scoring
 * - Determine end conditions
 *
 * Does NOT handle:
 * - Rendering / animations
 * - Audio / SFX
 * - Input handling
 * - UI updates
 */
export class GameSessionController {
  readonly board: Board;
  readonly spec: LevelSpec;

  private readonly rngStreams: RngStreams;
  private readonly tracker: ObjectiveTracker;
  private readonly colours: GemColour[];
  private readonly _testMode: boolean;

  private _score = 0;
  private _movesRemaining: number;
  private _timeRemaining: number;
  private _settled = false;
  private _isProcessing = false;

  constructor(config: GameSessionConfig) {
    this.board = config.board;
    this.spec = config.spec;
    this.rngStreams = config.rngStreams;
    this.tracker = createTracker(config.spec.objective);
    this.colours = [...config.spec.gems.colours];
    this._movesRemaining = config.spec.constraints.moveBudget ?? Infinity;
    this._timeRemaining = config.spec.constraints.timeBudget ?? Infinity;
    this._testMode = config.spec.id === -1;
  }

  // ─── Public Accessors ───────────────────────────────────

  get score(): number { return this._score; }
  get movesRemaining(): number { return this._movesRemaining; }
  get timeRemaining(): number { return this._timeRemaining; }
  get settled(): boolean { return this._settled; }
  get isProcessing(): boolean { return this._isProcessing; }

  getState(): SessionState {
    return {
      score: this._score,
      movesRemaining: this._movesRemaining,
      timeRemaining: this._timeRemaining,
      objectiveProgress: this.getObjectiveProgress(),
      settled: this._settled,
    };
  }

  // ─── Tap Activate (no move cost) ───────────────────────

  /**
   * Activate a special gem by tapping it directly.
   * Only works on colour-null specials (standalone special gems).
   * Does NOT consume a move.
   */
  executeActivation(at: CellPos): ActivateResult | null {
    if (this._isProcessing || this._settled) return null;

    const cell = getCell(this.board, at);
    const special = cell?.gem?.special;
    if (!special) return null;

    this._isProcessing = true;
    try {
      return this.doActivate(at, special);
    } finally {
      this._isProcessing = false;
    }
  }

  // ─── Swap Execution ─────────────────────────────────────

  /**
   * Execute a swap between two adjacent cells.
   * Handles all swap types: normal match, combo, colour gem, direct bomb.
   */
  executeSwap(from: CellPos, to: CellPos): SwapResult {
    if (this._isProcessing || this._settled) {
      return { valid: false, type: 'invalid', movesConsumed: false, cascadeSteps: [], totalScore: 0, endCondition: null };
    }

    this._isProcessing = true;
    try {
      return this.doSwap(from, to);
    } finally {
      this._isProcessing = false;
    }
  }

  // ─── Time Tick ──────────────────────────────────────────

  tickTime(deltaSeconds: number): void {
    if (this._settled || this._timeRemaining === Infinity) return;
    this._timeRemaining = Math.max(0, this._timeRemaining - deltaSeconds);
  }

  // ─── Private: Objective Helpers ─────────────────────────

  private addCollectToTracker(colour: GemColour, count: number): void {
    const walk = (t: any) => {
      if (t instanceof CollectTracker) t.addCollected(colour, count);
      if (t && typeof t.getTrackers === 'function') {
        for (const sub of t.getTrackers()) walk(sub);
      }
    };
    walk(this.tracker);
  }

  private addDroppedToTracker(count: number): void {
    if (count <= 0) return;
    const walk = (t: any) => {
      if (t instanceof DropTracker) t.addDropped(count);
      if (t && typeof t.getTrackers === 'function') {
        for (const sub of t.getTrackers()) walk(sub);
      }
    };
    walk(this.tracker);
  }

  private syncScoreToTracker(): void {
    const walk = (t: any) => {
      if (t && typeof t.updateScore === 'function') t.updateScore(this._score);
      if (t && typeof t.getTrackers === 'function') {
        for (const sub of t.getTrackers()) walk(sub);
      }
    };
    walk(this.tracker);
  }

  private addClearedToTracker(blocker: BlockerKind, count: number): void {
    const walk = (t: any) => {
      if (t instanceof ClearTracker) t.addCleared(blocker, count);
      if (t && typeof t.getTrackers === 'function') {
        for (const sub of t.getTrackers()) walk(sub);
      }
    };
    walk(this.tracker);
  }

  /**
   * Process jelly blockers for cleared cells: reduce layers by 1, remove at 0.
   * Notifies ClearTracker for each jelly fully cleared.
   * Each position is processed at most once per call (deduped by Set).
   */
  private processBlockers(clearedCells: CellPos[]): BlockerHit[] {
    const processed = new Set<string>();
    const hits: BlockerHit[] = [];
    let jellyCleared = 0;
    for (const pos of clearedCells) {
      const key = `${pos[0]},${pos[1]}`;
      if (processed.has(key)) continue;
      processed.add(key);
      const cell = getCell(this.board, pos);
      if (cell?.blocker?.kind === 'jelly') {
        const fromLayer = cell.blocker.layers;
        const newLayers = fromLayer - 1;
        if (newLayers <= 0) {
          cell.blocker = null;
          jellyCleared++;
          hits.push({ pos, fromLayer, cleared: true });
        } else {
          cell.blocker = { kind: 'jelly', layers: newLayers as 1 | 2 | 3 };
          hits.push({ pos, fromLayer, cleared: false });
        }
      }
    }
    if (jellyCleared > 0) this.addClearedToTracker('jelly', jellyCleared);
    return hits;
  }

  /** Test mode: randomly convert some newly-filled gems to specials (~4% chance per cell) */
  private injectTestModeSpecials(): void {
    const specials: SpecialGemType[] = ['lineH', 'lineV', 'area', 'colour'];
    const rng = this.rngStreams.cascadeFill;
    for (let col = 0; col < this.board.width; col++) {
      // Only check top row (newly filled gems come from top)
      for (let row = 0; row < 1; row++) {
        const cell = this.board.cells[col][row];
        if (!cell.gem || cell.gem.special) continue;
        if (rng.next() < 0.04) {
          const specialType = specials[rng.int(0, specials.length)];
          cell.gem.special = specialType;
          cell.gem.colour = null;
        }
      }
    }
  }

  private getObjectiveProgress(): Array<{ current: number; total: number }> {
    if (this.tracker && typeof (this.tracker as any).getTrackers === 'function') {
      const subs = (this.tracker as any).getTrackers() as Array<{ getSummary(): { current: number; total: number } }>;
      return subs.map((t) => t.getSummary());
    }
    return [this.tracker.getSummary()];
  }

  // ─── Private: Board Snapshot ─────────────────────────────

  private snapshotBoard(): BoardSnapshot {
    const { width, height, cells } = this.board;
    const snap: BoardSnapshotCell[][] = [];
    for (let col = 0; col < width; col++) {
      const column: BoardSnapshotCell[] = [];
      for (let row = 0; row < height; row++) {
        const cell = cells[col][row];
        column.push({
          gem: cell.gem ? { colour: cell.gem.colour, special: cell.gem.special } : null,
          isEmpty: cell.isEmpty,
          deliveryItem: cell.deliveryItem !== null,
        });
      }
      snap.push(column);
    }
    return { width, height, cells: snap };
  }

  // ─── Private: Colour Snapshot ───────────────────────────

  private snapshotColoursAt(cells: CellPos[]): Map<string, GemColour> {
    const map = new Map<string, GemColour>();
    for (const [c, r] of cells) {
      const cell = getCell(this.board, [c, r]);
      if (cell?.gem?.colour) map.set(`${c},${r}`, cell.gem.colour);
    }
    return map;
  }

  private recordCollected(clearedCells: CellPos[], snapshot: Map<string, GemColour>): void {
    const counts = new Map<GemColour, number>();
    for (const [c, r] of clearedCells) {
      const colour = snapshot.get(`${c},${r}`);
      if (!colour) continue;
      counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
    for (const [colour, count] of counts) this.addCollectToTracker(colour, count);
  }

  private toClearedCellInfos(cells: CellPos[], snapshot: Map<string, GemColour>): ClearedCellInfo[] {
    return cells.map(pos => ({
      pos,
      colour: snapshot.get(`${pos[0]},${pos[1]}`) ?? null,
    }));
  }

  // ─── Private: Special Snapshot ──────────────────────────

  private snapshotSpecials(cells?: CellPos[]): Map<string, SpecialGemType> {
    const snap = new Map<string, SpecialGemType>();
    if (cells) {
      for (const [c, r] of cells) {
        const cl = getCell(this.board, [c, r]);
        if (cl?.gem?.special) snap.set(`${c},${r}`, cl.gem.special);
      }
    } else {
      for (let c = 0; c < this.board.width; c++) {
        for (let r = 0; r < this.board.height; r++) {
          const cl = this.board.cells[c][r];
          if (cl.gem?.special) snap.set(`${c},${r}`, cl.gem.special);
        }
      }
    }
    return snap;
  }

  // ─── Private: Gravity ───────────────────────────────────

  private runGravity(): GravityResult {
    // Snapshot positions before gravity
    const itemsBefore = new Map<number, Array<{ row: number; hasGem: boolean; hasDelivery: boolean }>>();
    for (let c = 0; c < this.board.width; c++) {
      const colItems: Array<{ row: number; hasGem: boolean; hasDelivery: boolean }> = [];
      for (let r = 0; r < this.board.height; r++) {
        const cell = this.board.cells[c][r];
        if (cell.isEmpty) continue;
        if (cell.gem || cell.deliveryItem) {
          colItems.push({ row: r, hasGem: !!cell.gem, hasDelivery: !!cell.deliveryItem });
        }
      }
      itemsBefore.set(c, colItems);
    }

    applyGravity(this.board);
    fillFromTop(this.board, this.rngStreams.cascadeFill, this.colours);

    // Test mode: randomly convert ~12% of top-row gems to specials
    if (this._testMode) {
      this.injectTestModeSpecials();
    }

    // Collect delivery items
    const deliveryPositions = collectDeliveryItems(this.board);
    if (deliveryPositions.length > 0) {
      this.addDroppedToTracker(deliveryPositions.length);
    }

    // Calculate drop distances
    const drops: DropInfo[] = [];
    for (let c = 0; c < this.board.width; c++) {
      const before = itemsBefore.get(c) || [];
      const emptySlots: number[] = [];
      for (let r = 0; r < this.board.height; r++) {
        if (this.board.cells[c][r].isEmpty) continue;
        emptySlots.push(r);
      }
      const numExisting = before.length;
      const numTotal = emptySlots.length;
      const numNew = numTotal - numExisting;
      for (let i = 0; i < numExisting; i++) {
        const oldRow = before[i].row;
        const newRow = emptySlots[numNew + i];
        if (newRow !== undefined && newRow !== oldRow) {
          drops.push({ col: c, toRow: newRow, distance: newRow - oldRow, isDelivery: before[i].hasDelivery });
        }
      }
      for (let i = 0; i < numNew; i++) {
        const newRow = emptySlots[i];
        if (newRow !== undefined) {
          drops.push({ col: c, toRow: newRow, distance: newRow + numNew - i, isDelivery: false });
        }
      }
    }

    // Recursively handle delivery items reaching bottom
    const deliveryCollected: DeliveryCollected[] = deliveryPositions.map(pos => ({ pos }));
    if (deliveryPositions.length > 0) {
      const subResult = this.runGravity();
      drops.push(...subResult.drops);
      deliveryCollected.push(...subResult.deliveryCollected);
    }

    return { drops, deliveryCollected };
  }

  // ─── Private: Passive Activations ───────────────────────

  private handlePassiveActivations(
    clearedCells: CellPos[],
    chain: number,
    excludePositions?: Set<string>,
    specialSnapshot?: Map<string, SpecialGemType>,
  ): SpecialActivationEvent[] {
    // Temporarily remove excluded specials
    const savedGems: Array<{ pos: CellPos; gem: any }> = [];
    if (excludePositions) {
      for (const key of excludePositions) {
        const [cs, rs] = key.split(',');
        const c = parseInt(cs);
        const r = parseInt(rs);
        const cell = getCell(this.board, [c, r]);
        if (cell?.gem?.special) {
          savedGems.push({ pos: [c, r], gem: cell.gem });
          cell.gem = null;
        }
        if (specialSnapshot) specialSnapshot.delete(key);
      }
    }

    const passiveResult = processSpecialActivations(
      this.board, clearedCells, specialSnapshot, {
        rng: this.rngStreams.cascadeFill,
        colours: this.colours,
      },
    );

    // Restore excluded gems
    for (const { pos, gem } of savedGems) {
      const cell = getCell(this.board, pos);
      if (cell && !cell.gem) cell.gem = gem;
    }

    const events: SpecialActivationEvent[] = [];
    if (passiveResult.triggeredSpecials.length > 0) {
      const originalSet = new Set(clearedCells.map(([c, r]) => `${c},${r}`));
      const extraCells = passiveResult.clearedCells
        .filter(([c, r]) => !originalSet.has(`${c},${r}`));

      if (extraCells.length > 0) {
        const score = specialActivationScore(extraCells.length, chain, false);
        this._score += score;

        for (const pos of passiveResult.triggeredSpecials) {
          const type = specialSnapshot?.get(`${pos[0]},${pos[1]}`) ?? 'area';
          events.push({ pos, type: type as SpecialGemType, clearedCells: extraCells, score });
        }
      }
    }

    return events;
  }

  // ─── Private: End Condition Check ───────────────────────

  private checkEndCondition(): EndCondition | null {
    this.syncScoreToTracker();
    const objectiveComplete = this.tracker.isComplete();
    const outOfMoves = this._movesRemaining !== Infinity && this._movesRemaining <= 0;
    const outOfTime = this._timeRemaining !== Infinity && this._timeRemaining <= 0;

    if (!objectiveComplete && !outOfMoves && !outOfTime) return null;

    this._settled = true;
    const cleared = objectiveComplete;
    const mvRem = this._movesRemaining === Infinity ? 0 : this._movesRemaining;
    const tmRem = this._timeRemaining === Infinity ? 0 : this._timeRemaining;

    if (cleared) {
      this._score += remainingMovesBonus(mvRem);
      this._score += remainingTimeBonus(tmRem);
    }

    const stars = cleared ? calculateStars(this.spec.stars, this._score, mvRem, tmRem) : 0;

    return {
      cleared,
      stars,
      score: this._score,
      movesRemaining: cleared ? mvRem : 0,
      timeRemaining: cleared ? tmRem : 0,
      levelId: this.spec.id,
    };
  }

  // ─── Private: Cascade Loop ──────────────────────────────

  private runCascadeLoop(chainStart: number): CascadeStep[] {
    const steps: CascadeStep[] = [];
    let chain = chainStart;
    let stepCount = 0;
    let matches = detectMatches(this.board);

    while (matches.length > 0 && stepCount++ < MAX_CASCADE_STEPS) {
      chain++;

      const clearedSet = new Set<string>();
      const clearedCells: CellPos[] = [];
      for (const m of matches) {
        for (const c of m.cells) {
          const k = `${c[0]},${c[1]}`;
          if (!clearedSet.has(k)) { clearedSet.add(k); clearedCells.push([c[0], c[1]]); }
        }
        this.addCollectToTracker(m.colour, m.cells.length);
      }

      // Handle spawn positions (new specials)
      const spawnPositions: CellPos[] = [];
      const spawnPosSet = new Set<string>();
      for (const m of matches) {
        if (m.spawnsSpecial && m.spawnAt) {
          const spKey = `${m.spawnAt[0]},${m.spawnAt[1]}`;
          spawnPosSet.add(spKey);
          spawnPositions.push(m.spawnAt);
          const sc = getCell(this.board, m.spawnAt);
          if (sc?.gem) {
            sc.gem.colour = null;
            sc.gem.special = m.spawnsSpecial;
          }
          clearedSet.delete(spKey);
        }
      }

      // Calculate score
      let stepScore = 0;
      for (const m of matches) stepScore += matchScore(m.shape, chain, 0, m.cells.length);
      this._score += stepScore;

      // Snapshot colours before clearing
      const colourSnapshot = this.snapshotColoursAt(clearedCells);

      // Handle in-match special activations
      const specialActivations: SpecialActivationEvent[] = [];
      const specialSnapshot = this.snapshotSpecials(clearedCells);

      // Remove spawn positions from snapshot
      for (const sp of spawnPositions) {
        specialSnapshot.delete(`${sp[0]},${sp[1]}`);
      }

      // Capture preClearSnapshot BEFORE in-match activations run. The
      // renderer syncs to this state and needs every gem still visible —
      // including in-match special blast targets — so each activation's
      // own effect+shrink can play with sprites still on screen.
      const preClearSnapshot = this.snapshotBoard();

      for (const [c, r] of clearedCells) {
        const k = `${c},${r}`;
        if (!clearedSet.has(k) || spawnPosSet.has(k)) continue;
        const cl = getCell(this.board, [c, r]);
        if (!cl?.gem?.special) continue;
        const sType = cl.gem.special;

        // Protect spawn positions
        const savedGems: Array<{ pos: CellPos; gem: any }> = [];
        for (const spKey of spawnPosSet) {
          const [scs, srs] = spKey.split(',');
          const spc = parseInt(scs);
          const spr = parseInt(srs);
          const spCell = getCell(this.board, [spc, spr]);
          if (spCell?.gem) {
            savedGems.push({ pos: [spc, spr], gem: spCell.gem });
            spCell.gem = null;
          }
        }

        // Activate the special
        let actResult: { clearedCells: CellPos[]; triggeredSpecials: CellPos[] };
        if (sType === 'lineH' || sType === 'lineV') {
          actResult = activateLineBomb(this.board, [c, r]);
        } else if (sType === 'area') {
          actResult = activateAreaBomb(this.board, [c, r]);
        } else {
          // colour gem in cascade - pick random colour
          const present = new Set<GemColour>();
          for (let col = 0; col < this.board.width; col++) {
            for (let row = 0; row < this.board.height; row++) {
              const g = this.board.cells[col][row].gem;
              if (g?.colour) present.add(g.colour);
            }
          }
          const pool = [...present].sort();
          const target = pool.length > 0 ? pool[this.rngStreams.cascadeFill.int(0, pool.length)] : this.colours[0];
          actResult = activateColourGem(this.board, [c, r], target);
        }

        // Restore spawn gems
        for (const { pos, gem } of savedGems) {
          const restoreCell = getCell(this.board, pos);
          if (restoreCell && !restoreCell.gem) restoreCell.gem = gem;
        }

        // Merge cleared cells
        for (const [ac, ar] of actResult.clearedCells) {
          const ak = `${ac},${ar}`;
          if (!clearedSet.has(ak)) { clearedSet.add(ak); clearedCells.push([ac, ar]); }
        }

        const actScore = specialActivationScore(actResult.clearedCells.length, chain, sType === 'colour');
        this._score += actScore;

        specialActivations.push({
          pos: [c, r],
          type: sType,
          clearedCells: actResult.clearedCells,
          score: actScore,
        });
      }

      // Clear all matched cells (excluding spawn positions)
      for (const [c, r] of clearedCells) {
        if (spawnPosSet.has(`${c},${r}`)) continue;
        if (clearedSet.has(`${c},${r}`)) {
          const cl = getCell(this.board, [c, r]);
          if (cl) cl.gem = null;
        }
      }

      // Passive activations
      const actualCleared = clearedCells.filter(([c, r]) => !spawnPosSet.has(`${c},${r}`) && clearedSet.has(`${c},${r}`));
      const passiveActivations = this.handlePassiveActivations(actualCleared, chain, spawnPosSet, specialSnapshot);

      // Blocker processing: reduce jelly layers for all cleared cells (match + specials + passives)
      const stepBlockerHits: BlockerHit[] = [];
      stepBlockerHits.push(...this.processBlockers(actualCleared));
      for (const pe of passiveActivations) stepBlockerHits.push(...this.processBlockers(pe.clearedCells));

      // Gravity
      const gravity = this.runGravity();

      // Build cleared cell infos
      const clearedInfos = this.toClearedCellInfos(actualCleared, colourSnapshot);

      steps.push({
        chain,
        matches,
        clearedCells: clearedInfos,
        spawnPositions,
        specialActivations,
        passiveActivations,
        score: stepScore,
        gravity,
        preClearSnapshot,
        boardSnapshot: this.snapshotBoard(),
        blockerHits: stepBlockerHits,
      });

      matches = detectMatches(this.board);
    }

    return steps;
  }

  // ─── Private: doActivate ────────────────────────────────

  private doActivate(at: CellPos, special: SpecialGemType): ActivateResult {
    // Snapshot all cells for colour tracking
    const allCells: CellPos[] = [];
    for (let c = 0; c < this.board.width; c++) {
      for (let r = 0; r < this.board.height; r++) allCells.push([c, r]);
    }
    const colourSnapshot = this.snapshotColoursAt(allCells);
    const specialSnapshot = this.snapshotSpecials();

    // Execute activation
    let activeResult: { clearedCells: CellPos[]; triggeredSpecials: CellPos[] };
    if (special === 'colour') {
      const present = new Set<GemColour>();
      for (let c = 0; c < this.board.width; c++) {
        for (let r = 0; r < this.board.height; r++) {
          const g = this.board.cells[c][r].gem;
          if (g?.colour) present.add(g.colour);
        }
      }
      const pool = [...present].sort();
      if (pool.length === 0) {
        return { valid: false, type: special, pos: at, clearedCells: [], score: 0, passiveActivations: [], gravity: { drops: [], deliveryCollected: [] }, boardSnapshot: { width: this.board.width, height: this.board.height, cells: [] }, blockerHits: [], cascadeSteps: [], totalScore: 0, endCondition: null };
      }
      const target = pool[this.rngStreams.cascadeFill.int(0, pool.length)];
      activeResult = activateColourGem(this.board, at, target);
    } else if (special === 'lineH' || special === 'lineV') {
      activeResult = activateLineBomb(this.board, at);
    } else {
      activeResult = activateAreaBomb(this.board, at);
    }

    // Process passive activations
    const passiveResult = processSpecialActivations(this.board, activeResult.clearedCells, specialSnapshot, {
      rng: this.rngStreams.cascadeFill,
      colours: this.colours,
    });

    // Merge cleared cells
    const seen = new Set<string>();
    const allCleared: CellPos[] = [];
    for (const p of [...activeResult.clearedCells, ...passiveResult.clearedCells]) {
      const k = `${p[0]},${p[1]}`;
      if (!seen.has(k)) { seen.add(k); allCleared.push([p[0], p[1]]); }
    }

    this.recordCollected(allCleared, colourSnapshot);

    const chain = 1;
    const score = specialActivationScore(allCleared.length, chain, special === 'colour');
    this._score += score;

    // Clear cells
    for (const [c, r] of allCleared) {
      const cl = getCell(this.board, [c, r]);
      if (cl) cl.gem = null;
    }

    // Blocker processing: allCleared already merges direct blast + passive cells
    const blockerHits = this.processBlockers(allCleared);

    // Gravity
    const gravity = this.runGravity();
    const activateSnapshot = this.snapshotBoard();

    // Cascade (runCascadeLoop handles its own blocker processing per step)
    const cascadeSteps = this.runCascadeLoop(chain);

    // Build passive activation events
    const passiveEvents: SpecialActivationEvent[] = [];
    if (passiveResult.triggeredSpecials.length > 0) {
      const originalSet = new Set(activeResult.clearedCells.map(([c, r]) => `${c},${r}`));
      const extraCells = passiveResult.clearedCells.filter(([c, r]) => !originalSet.has(`${c},${r}`));
      if (extraCells.length > 0) {
        for (const pos of passiveResult.triggeredSpecials) {
          const type = specialSnapshot.get(`${pos[0]},${pos[1]}`) ?? 'area';
          passiveEvents.push({ pos, type: type as SpecialGemType, clearedCells: extraCells, score: 0 });
        }
      }
    }

    const clearedInfos = this.toClearedCellInfos(allCleared, colourSnapshot);
    const totalScore = this._score;
    const endCondition = this.checkEndCondition();

    return {
      valid: true,
      type: special,
      pos: at,
      clearedCells: clearedInfos,
      score,
      passiveActivations: passiveEvents,
      gravity,
      boardSnapshot: activateSnapshot,
      blockerHits,
      cascadeSteps,
      totalScore,
      endCondition,
    };
  }

  // ─── Private: doSwap ────────────────────────────────────

  private doSwap(from: CellPos, to: CellPos): SwapResult {
    const scoreBeforeSwap = this._score;

    // Execute data-layer swap
    const cellFrom = getCell(this.board, from)!;
    const cellTo = getCell(this.board, to)!;

    const fromHasContent = cellFrom.gem !== null || cellFrom.deliveryItem !== null;
    const toHasContent = cellTo.gem !== null || cellTo.deliveryItem !== null;
    if (!fromHasContent || !toHasContent) {
      return { valid: false, type: 'invalid', movesConsumed: false, cascadeSteps: [], totalScore: 0, endCondition: null };
    }

    // Jelly blockers are immovable — gems underneath cannot be swapped by the player
    if (cellFrom.blocker?.kind === 'jelly' || cellTo.blocker?.kind === 'jelly') {
      return { valid: false, type: 'jellyBlocked', movesConsumed: false, cascadeSteps: [], totalScore: 0, endCondition: null };
    }

    // Swap gems and delivery items
    const tempGem = cellFrom.gem;
    const tempDelivery = cellFrom.deliveryItem;
    cellFrom.gem = cellTo.gem;
    cellFrom.deliveryItem = cellTo.deliveryItem;
    cellTo.gem = tempGem;
    cellTo.deliveryItem = tempDelivery;

    // ── Determine swap type ──
    if (cellFrom.gem?.special && cellTo.gem?.special) {
      return this.doComboSwap(from, to, cellFrom, cellTo, scoreBeforeSwap);
    }

    if (
      (cellFrom.gem?.special === 'colour' && cellTo.gem?.colour !== null) ||
      (cellTo.gem?.special === 'colour' && cellFrom.gem?.colour !== null)
    ) {
      return this.doColourSwap(from, to, cellFrom, cellTo, scoreBeforeSwap);
    }

    // Check for normal matches or direct bomb activation
    const matches = detectMatches(this.board, { swapPos: to, swapPos2: from });

    const swappedSpecialPos: CellPos | null = (() => {
      const fGem = getCell(this.board, from)?.gem;
      const tGem = getCell(this.board, to)?.gem;
      if (fGem?.special && (fGem.special === 'lineH' || fGem.special === 'lineV' || fGem.special === 'area')) return from;
      if (tGem?.special && (tGem.special === 'lineH' || tGem.special === 'lineV' || tGem.special === 'area')) return to;
      return null;
    })();

    if (matches.length === 0 && !swappedSpecialPos) {
      // Invalid swap - revert
      cellTo.gem = cellFrom.gem;
      cellTo.deliveryItem = cellFrom.deliveryItem;
      cellFrom.gem = tempGem;
      cellFrom.deliveryItem = tempDelivery;
      return { valid: false, type: 'invalid', movesConsumed: false, cascadeSteps: [], totalScore: 0, endCondition: null };
    }

    this._movesRemaining--;

    // Special gem always activates its ability when swapped,
    // regardless of whether normal matches also exist.
    // Only matches formed by this swap (containing swapPos/swapPos2) are treated
    // as concurrent — pre-existing board matches are excluded so they don't
    // interfere with spawn priority or clear unrelated setup gems.
    if (swappedSpecialPos) {
      const directBombMatches = matches.filter((m) =>
        m.cells.some(([c, r]) => (c === from[0] && r === from[1]) || (c === to[0] && r === to[1])),
      );
      return this.doDirectBombSwap(from, to, swappedSpecialPos, scoreBeforeSwap, directBombMatches);
    }

    // Normal match path (no special involved)
    return this.doNormalSwap(from, to, matches, scoreBeforeSwap);
  }

  // ─── Private: Combo Swap ────────────────────────────────

  private doComboSwap(
    from: CellPos, to: CellPos,
    cellFrom: any, cellTo: any,
    scoreBeforeSwap: number,
  ): SwapResult {
    const comboTypeA = cellFrom.gem.special!;
    const comboTypeB = cellTo.gem.special!;

    // Snapshot before resolveCombo clears
    const allCells: CellPos[] = [];
    for (let c = 0; c < this.board.width; c++) {
      for (let r = 0; r < this.board.height; r++) allCells.push([c, r]);
    }
    const colourSnapshot = this.snapshotColoursAt(allCells);
    const specialSnapshot = this.snapshotSpecials();

    const comboResult = resolveCombo(this.board, from, to, this.rngStreams.cascadeFill, to);
    if (!comboResult || comboResult.clearedCells.length === 0) {
      // Revert swap
      const tempGem = cellTo.gem;
      const tempDelivery = cellTo.deliveryItem;
      cellTo.gem = cellFrom.gem;
      cellTo.deliveryItem = cellFrom.deliveryItem;
      cellFrom.gem = tempGem;
      cellFrom.deliveryItem = tempDelivery;
      return { valid: false, type: 'invalid', movesConsumed: false, cascadeSteps: [], totalScore: 0, endCondition: null };
    }

    this._movesRemaining--;
    const chain = 1;

    const cType = comboKey(comboTypeA, comboTypeB);
    const comboPoints = cType ? comboScore(cType, chain) : 0;
    this._score += comboPoints;

    const comboClearedCells = comboResult.clearedCells.map(([c, r]) => [c, r] as CellPos);
    this.recordCollected(comboClearedCells, colourSnapshot);

    // Passive activations (exclude the two combo gems)
    const comboExclude = new Set<string>([`${from[0]},${from[1]}`, `${to[0]},${to[1]}`]);
    const passiveEvents = this.handlePassiveActivations(comboClearedCells, chain, comboExclude, specialSnapshot);

    // Blocker processing for combo blast + passives
    const initBlockerHits: BlockerHit[] = [];
    initBlockerHits.push(...this.processBlockers(comboClearedCells));
    for (const pe of passiveEvents) initBlockerHits.push(...this.processBlockers(pe.clearedCells));

    // Gravity + cascade
    const comboGravity = this.runGravity();
    const comboSnapshot = this.snapshotBoard();
    const cascadeSteps = this.runCascadeLoop(chain);

    // Merge all cleared cells: combo blast + passive chain cells
    const allCleared: CellPos[] = [...comboClearedCells];
    const allClearedSet = new Set<string>(comboClearedCells.map(([c, r]) => `${c},${r}`));
    for (const pe of passiveEvents) {
      for (const [c, r] of pe.clearedCells) {
        const k = `${c},${r}`;
        if (!allClearedSet.has(k)) { allClearedSet.add(k); allCleared.push([c, r]); }
      }
    }
    const clearedInfos = this.toClearedCellInfos(allCleared, colourSnapshot);
    const endCondition = this.checkEndCondition();

    return {
      valid: true,
      type: 'combo',
      movesConsumed: true,
      initialActivation: {
        type: 'combo',
        comboType: cType ?? undefined,
        comboTargets: comboResult.triggeredSpecials.length > 0 ? comboResult.triggeredSpecials : undefined,
        pos: to,
        clearedCells: clearedInfos,
        score: comboPoints,
        passiveActivations: passiveEvents,
        gravity: comboGravity,
        boardSnapshot: comboSnapshot,
        blockerHits: initBlockerHits,
      },
      cascadeSteps,
      totalScore: this._score - scoreBeforeSwap,
      endCondition,
    };
  }

  // ─── Private: Colour Swap ───────────────────────────────

  private doColourSwap(
    from: CellPos, to: CellPos,
    cellFrom: any, cellTo: any,
    scoreBeforeSwap: number,
  ): SwapResult {
    const colourGemPos: CellPos = cellFrom.gem?.special === 'colour' ? from : to;
    const normalPos: CellPos = cellFrom.gem?.special === 'colour' ? to : from;
    const normalCell = getCell(this.board, normalPos)!;
    const targetColour = normalCell.gem!.colour!;

    this._movesRemaining--;
    const chain = 1;

    // Snapshots
    const allCells: CellPos[] = [];
    for (let c = 0; c < this.board.width; c++) {
      for (let r = 0; r < this.board.height; r++) allCells.push([c, r]);
    }
    const colourSnapshot = this.snapshotColoursAt(allCells);
    const specialSnapshot = this.snapshotSpecials();

    const colourResult = activateColourGem(this.board, colourGemPos, targetColour);
    const colourClearedCells = colourResult.clearedCells.map(([c, r]) => [c, r] as CellPos);
    this.recordCollected(colourClearedCells, colourSnapshot);

    const activationPoints = specialActivationScore(colourClearedCells.length, chain, true);
    this._score += activationPoints;

    // Passive activations (exclude the colour gem itself)
    const colourExclude = new Set<string>([`${colourGemPos[0]},${colourGemPos[1]}`]);
    const passiveEvents = this.handlePassiveActivations(colourClearedCells, chain, colourExclude, specialSnapshot);

    // Blocker processing for colour gem blast + passives
    const initBlockerHits: BlockerHit[] = [];
    initBlockerHits.push(...this.processBlockers(colourClearedCells));
    for (const pe of passiveEvents) initBlockerHits.push(...this.processBlockers(pe.clearedCells));

    // Gravity + cascade
    const colourGravity = this.runGravity();
    const colourBoardSnapshot = this.snapshotBoard();
    const cascadeSteps = this.runCascadeLoop(chain);

    // Merge all cleared cells: colour blast + passive chain cells
    const allCleared: CellPos[] = [...colourClearedCells];
    const allClearedSet = new Set<string>(colourClearedCells.map(([c, r]) => `${c},${r}`));
    for (const pe of passiveEvents) {
      for (const [c, r] of pe.clearedCells) {
        const k = `${c},${r}`;
        if (!allClearedSet.has(k)) { allClearedSet.add(k); allCleared.push([c, r]); }
      }
    }
    const clearedInfos = this.toClearedCellInfos(allCleared, colourSnapshot);
    const endCondition = this.checkEndCondition();

    return {
      valid: true,
      type: 'colour',
      movesConsumed: true,
      initialActivation: {
        type: 'colour',
        pos: colourGemPos,
        clearedCells: clearedInfos,
        score: activationPoints,
        passiveActivations: passiveEvents,
        gravity: colourGravity,
        boardSnapshot: colourBoardSnapshot,
        blockerHits: initBlockerHits,
      },
      cascadeSteps,
      totalScore: this._score - scoreBeforeSwap,
      endCondition,
    };
  }

  // ─── Private: Direct Bomb Swap ──────────────────────────

  private doDirectBombSwap(
    from: CellPos, to: CellPos,
    bombPos: CellPos,
    scoreBeforeSwap: number,
    concurrentMatches: MatchDescriptor[] = [],
  ): SwapResult {
    const chain = 1;
    const specialCell = getCell(this.board, bombPos)!;
    const specialType = specialCell.gem!.special! as 'lineH' | 'lineV' | 'area';

    // Snapshot ALL cells for colour tracking — passive chain reactions can
    // clear cells far beyond the initial blast zone, and the animator needs
    // colour info for every cleared cell to render particle effects.
    const allCells: CellPos[] = [];
    for (let c = 0; c < this.board.width; c++) {
      for (let r = 0; r < this.board.height; r++) allCells.push([c, r]);
    }
    const colourSnapshot = this.snapshotColoursAt(allCells);

    // Snapshot specials across the whole board so passive chain reactions
    // can discover triggered specials beyond the initial blast zone.
    const specialSnapshot = this.snapshotSpecials();

    // Activate bomb
    let activationResult: { clearedCells: CellPos[]; triggeredSpecials: CellPos[] };
    if (specialType === 'lineH' || specialType === 'lineV') {
      activationResult = activateLineBomb(this.board, bombPos);
    } else {
      activationResult = activateAreaBomb(this.board, bombPos);
    }

    // Also clear concurrent match cells (color match fires simultaneously)
    const clearedSet = new Set<string>();
    const activatedCells: CellPos[] = [];
    for (const [c, r] of activationResult.clearedCells) {
      const k = `${c},${r}`;
      if (!clearedSet.has(k)) { clearedSet.add(k); activatedCells.push([c, r]); }
    }
    // Concurrent match spawn positions: spawn takes priority over the bomb's
    // blast. If the bomb already cleared the spawn cell (e.g. lineV clearing
    // the same column), un-clear it and recreate the gem as a special.
    const spawnPosSet = new Set<string>();
    const directSpawnInfos: Array<{ pos: CellPos; type: SpecialGemType; cells: CellPos[] }> = [];
    for (const m of concurrentMatches) {
      if (m.spawnsSpecial && m.spawnAt) {
        const spKey = `${m.spawnAt[0]},${m.spawnAt[1]}`;
        spawnPosSet.add(spKey);
        directSpawnInfos.push({ pos: m.spawnAt, type: m.spawnsSpecial, cells: m.cells });

        // If the bomb blast already cleared this cell, rescue it from the
        // cleared list — the special gem spawn wins over the blast.
        if (clearedSet.has(spKey)) {
          clearedSet.delete(spKey);
          const idx = activatedCells.findIndex(([c, r]) => `${c},${r}` === spKey);
          if (idx !== -1) activatedCells.splice(idx, 1);
        }

        const [sc, sr] = m.spawnAt;
        if (!this.board.cells[sc][sr].gem) {
          // Cell was already nulled by the bomb — recreate as special gem.
          this.board.cells[sc][sr].gem = createGem(null, m.spawnsSpecial);
        } else {
          this.board.cells[sc][sr].gem.colour = null;
          this.board.cells[sc][sr].gem.special = m.spawnsSpecial;
        }
      }
    }

    // Clear match cells that weren't already cleared by the bomb (skip spawn positions)
    for (const m of concurrentMatches) {
      this.addCollectToTracker(m.colour, m.cells.length);
      for (const [c, r] of m.cells) {
        const k = `${c},${r}`;
        if (spawnPosSet.has(k)) continue;
        if (!clearedSet.has(k)) {
          clearedSet.add(k);
          activatedCells.push([c, r]);
          const cell = getCell(this.board, [c, r]);
          if (cell) cell.gem = null;
        }
      }
    }

    this.recordCollected(activatedCells, colourSnapshot);

    // Score: bomb activation + match score
    let actScore = specialActivationScore(activationResult.clearedCells.length, chain, false);
    for (const m of concurrentMatches) {
      actScore += matchScore(m.shape, chain, 0, m.cells.length);
    }
    this._score += actScore;

    // Prevent newly-spawned specials from being treated as passive activations
    for (const spk of spawnPosSet) specialSnapshot.delete(spk);

    // Passive activations — exclude bomb origin AND all spawn positions
    const directExclude = new Set<string>([`${bombPos[0]},${bombPos[1]}`, ...spawnPosSet]);
    const passiveEvents = this.handlePassiveActivations(activatedCells, chain, directExclude, specialSnapshot);

    // Blocker processing for bomb blast + passives
    const initBlockerHits: BlockerHit[] = [];
    initBlockerHits.push(...this.processBlockers(activatedCells));
    for (const pe of passiveEvents) initBlockerHits.push(...this.processBlockers(pe.clearedCells));

    // Gravity + cascade
    const bombGravity = this.runGravity();
    const bombSnapshot = this.snapshotBoard();
    const cascadeSteps = this.runCascadeLoop(chain);

    // Merge all cleared cells: initial blast + passive chain cells.
    // This gives the animator complete colour info for particle effects.
    const allCleared: CellPos[] = [...activatedCells];
    const allClearedSet = new Set<string>(activatedCells.map(([c, r]) => `${c},${r}`));
    for (const pe of passiveEvents) {
      for (const [c, r] of pe.clearedCells) {
        const k = `${c},${r}`;
        if (!allClearedSet.has(k)) { allClearedSet.add(k); allCleared.push([c, r]); }
      }
    }
    const clearedInfos = this.toClearedCellInfos(allCleared, colourSnapshot);
    const endCondition = this.checkEndCondition();

    return {
      valid: true,
      type: 'directBomb',
      movesConsumed: true,
      initialActivation: {
        type: specialType,
        pos: bombPos,
        clearedCells: clearedInfos,
        score: actScore,
        passiveActivations: passiveEvents,
        gravity: bombGravity,
        boardSnapshot: bombSnapshot,
        blockerHits: initBlockerHits,
        spawnInfos: directSpawnInfos.length > 0 ? directSpawnInfos : undefined,
      },
      cascadeSteps,
      totalScore: this._score - scoreBeforeSwap,
      endCondition,
    };
  }

  // ─── Private: Normal Swap ───────────────────────────────

  private doNormalSwap(
    from: CellPos, to: CellPos,
    initialMatches: MatchDescriptor[],
    scoreBeforeSwap: number,
  ): SwapResult {
    // Normal swap uses the cascade loop directly since the first match
    // is essentially the first cascade step
    let chain = 0;
    let matches = initialMatches;
    const cascadeSteps: CascadeStep[] = [];
    let stepCount = 0;

    while (matches.length > 0 && stepCount++ < MAX_CASCADE_STEPS) {
      chain++;

      const clearedSet = new Set<string>();
      const clearedCells: CellPos[] = [];
      for (const m of matches) {
        for (const c of m.cells) {
          const k = `${c[0]},${c[1]}`;
          if (!clearedSet.has(k)) { clearedSet.add(k); clearedCells.push([c[0], c[1]]); }
        }
        this.addCollectToTracker(m.colour, m.cells.length);
      }

      // Spawn positions
      const spawnPositions: CellPos[] = [];
      const spawnPosSet = new Set<string>();
      for (const m of matches) {
        if (m.spawnsSpecial && m.spawnAt) {
          const spKey = `${m.spawnAt[0]},${m.spawnAt[1]}`;
          spawnPosSet.add(spKey);
          spawnPositions.push(m.spawnAt);
          const sc = getCell(this.board, m.spawnAt);
          if (sc?.gem) {
            sc.gem.colour = null;
            sc.gem.special = m.spawnsSpecial;
          }
          clearedSet.delete(spKey);
        }
      }

      // Score
      let stepScore = 0;
      for (const m of matches) stepScore += matchScore(m.shape, chain, 0, m.cells.length);
      this._score += stepScore;

      // Colour snapshot
      const colourSnapshot = this.snapshotColoursAt(clearedCells);

      // Special snapshot and in-match activations
      const specialSnapshot = this.snapshotSpecials(clearedCells);
      for (const sp of spawnPositions) specialSnapshot.delete(`${sp[0]},${sp[1]}`);

      // Capture preClearSnapshot BEFORE in-match activations run, so the
      // renderer can sync to a state where every gem is still visible.
      const preClearSnapshot = this.snapshotBoard();

      const specialActivations: SpecialActivationEvent[] = [];
      for (const [c, r] of clearedCells) {
        const k = `${c},${r}`;
        if (!clearedSet.has(k) || spawnPosSet.has(k)) continue;
        const cl = getCell(this.board, [c, r]);
        if (!cl?.gem?.special) continue;
        const sType = cl.gem.special;

        // Protect spawn positions
        const savedGems: Array<{ pos: CellPos; gem: any }> = [];
        for (const spKey of spawnPosSet) {
          const [scs, srs] = spKey.split(',');
          const spc = parseInt(scs);
          const spr = parseInt(srs);
          const spCell = getCell(this.board, [spc, spr]);
          if (spCell?.gem) {
            savedGems.push({ pos: [spc, spr], gem: spCell.gem });
            spCell.gem = null;
          }
        }

        // Activate
        let actResult: { clearedCells: CellPos[]; triggeredSpecials: CellPos[] };
        if (sType === 'lineH' || sType === 'lineV') {
          actResult = activateLineBomb(this.board, [c, r]);
        } else if (sType === 'area') {
          actResult = activateAreaBomb(this.board, [c, r]);
        } else {
          const present = new Set<GemColour>();
          for (let col = 0; col < this.board.width; col++) {
            for (let row = 0; row < this.board.height; row++) {
              const g = this.board.cells[col][row].gem;
              if (g?.colour) present.add(g.colour);
            }
          }
          const pool = [...present].sort();
          const target = pool.length > 0 ? pool[this.rngStreams.cascadeFill.int(0, pool.length)] : this.colours[0];
          actResult = activateColourGem(this.board, [c, r], target);
        }

        // Restore spawn gems
        for (const { pos, gem } of savedGems) {
          const restoreCell = getCell(this.board, pos);
          if (restoreCell && !restoreCell.gem) restoreCell.gem = gem;
        }

        for (const [ac, ar] of actResult.clearedCells) {
          const ak = `${ac},${ar}`;
          if (!clearedSet.has(ak)) { clearedSet.add(ak); clearedCells.push([ac, ar]); }
        }

        const actScore = specialActivationScore(actResult.clearedCells.length, chain, sType === 'colour');
        this._score += actScore;

        specialActivations.push({
          pos: [c, r],
          type: sType,
          clearedCells: actResult.clearedCells,
          score: actScore,
        });
      }

      // Clear cells
      for (const [c, r] of clearedCells) {
        if (spawnPosSet.has(`${c},${r}`)) continue;
        if (clearedSet.has(`${c},${r}`)) {
          const cl = getCell(this.board, [c, r]);
          if (cl) cl.gem = null;
        }
      }

      // Passive activations
      const actualCleared = clearedCells.filter(([c, r]) => !spawnPosSet.has(`${c},${r}`) && clearedSet.has(`${c},${r}`));
      const passiveActivations = this.handlePassiveActivations(actualCleared, chain, spawnPosSet, specialSnapshot);

      // Blocker processing for this normal-swap step (match + specials + passives)
      const stepBlockerHits: BlockerHit[] = [];
      stepBlockerHits.push(...this.processBlockers(actualCleared));
      for (const pe of passiveActivations) stepBlockerHits.push(...this.processBlockers(pe.clearedCells));

      // Gravity
      const gravity = this.runGravity();

      const clearedInfos = this.toClearedCellInfos(actualCleared, colourSnapshot);

      cascadeSteps.push({
        chain,
        matches,
        clearedCells: clearedInfos,
        spawnPositions,
        specialActivations,
        passiveActivations,
        score: stepScore,
        gravity,
        preClearSnapshot,
        boardSnapshot: this.snapshotBoard(),
        blockerHits: stepBlockerHits,
      });

      matches = detectMatches(this.board);
    }

    const endCondition = this.checkEndCondition();

    return {
      valid: true,
      type: 'normal',
      movesConsumed: true,
      cascadeSteps,
      totalScore: this._score - scoreBeforeSwap,
      endCondition,
    };
  }

  // ─── Private: Utility ───────────────────────────────────

  private getBlastTargets(pos: CellPos, type: 'lineH' | 'lineV' | 'area'): CellPos[] {
    const [col, row] = pos;
    const targets: CellPos[] = [];
    if (type === 'lineH') {
      for (let c = 0; c < this.board.width; c++) targets.push([c, row]);
    } else if (type === 'lineV') {
      for (let r = 0; r < this.board.height; r++) targets.push([col, r]);
    } else {
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const c = col + dc, r = row + dr;
          if (c >= 0 && c < this.board.width && r >= 0 && r < this.board.height) {
            targets.push([c, r]);
          }
        }
      }
    }
    return targets;
  }
}
