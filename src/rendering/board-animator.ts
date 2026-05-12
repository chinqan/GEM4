// ─── Board Animator ─────────────────────────────────────────
// Consumes structured results from GameSessionController and
// orchestrates all board animations: swap, clear, cascade drop,
// special activation effects, particles, and score popups.
//
// This module decouples animation orchestration from game logic,
// making both independently testable.

import { Graphics } from 'pixi.js';
import type { Container } from 'pixi.js';
import type { CellPos, GemColour, SpecialGemType } from '../types';
import type { Board } from '../game/rules/board';
import type { BoardRenderer } from './board-renderer';
import type { LayerRefs } from './app-layers';
import type { Animation } from './animations';
import type {
  SwapResult,
  ActivateResult,
  CascadeStep,
  ClearedCellInfo,
  DropInfo,
  SpecialActivationEvent,
  GravityResult,
  BlockerHit,
} from '../game/runtime/game-session';
import type { ReshuffleMove } from '../game/runtime/reshuffle';
import type { SpecialActivationKind } from './design-tokens';

import {
  createSwapAnimation,
  createMatchClearAnimation,
  createCascadeDropAnimation,
  createSpecialActivationEffect,
  createBlastZoneOverlay,
  createMarkEffect,
  createBrewAnimation,
  createEnhancedBlastAnimation,
  createSpecialSpawnShockwave,
  createGemConvergeAnimation,
} from './animations';
import {
  CELL_SIZE,
  GEM_COLOURS,
  MATCH_CLEAR_DURATION_MS,
  GEM_CONVERGE_DURATION_MS,
  BREW_PHASE_DURATION_MS,
  BLAST_PARTICLE_MULTIPLIER,
  BLAST_ZONE_COLOUR_LINE_H,
  BLAST_ZONE_COLOUR_LINE_V,
  BLAST_ZONE_COLOUR_AREA,
  BLAST_ZONE_COLOUR_COLOUR,
  getSpecialActivationDuration,
} from './design-tokens';
import { computeStagedPhases } from './staged-blast';
import { detectPrefersReducedMotion } from './accessibility';
import { MergeParticleSystem, JellyParticleSystem } from './particles';
import { createScorePopup } from '../ui/juice/score-popup';
import {
  playMatchSfx,
  playSwap,
  playInvalid,
  playCombo,
  playLevelComplete,
  playLevelFail,
  playSpecialByKind,
  playEvent,
  playBlockerImmovable,
  playJellyHitByLayer,
} from '../audio/sfx-player';

// ─── Types ──────────────────────────────────────────────────

export interface BoardAnimatorConfig {
  boardRenderer: BoardRenderer;
  layers: LayerRefs;
  renderer: any; // PixiJS Renderer
}

// ─── Constants ──────────────────────────────────────────────

const STALL_TIMEOUT_MS = 10_000;
const GRAVITY_WAIT_MS = 80;

// ─── Radiation timeline tuning ──────────────────────────────

/** 各類型特殊寶石/組合的輻射擴散速度（ms/格 Chebyshev distance） */
const RADIATION_SPEED: Record<string, number> = {
  // 單體特殊寶石
  lineH:          50,
  lineV:          50,
  area:           150,
  colour:         150,

  // 組合（走 default combo path）
  'line.line':    50,   // 十字光束 — 快速
  'bomb.bomb':    120,  // 大範圍爆炸 — 稍慢
  'bomb.line':    70,   // 介於 bomb 和 line 之間

  // fallback
  combo:          150,
};

/** 取得輻射速度（ms/格），找不到時用 150ms */
function getRadiationSpeed(type: string, comboType?: string): number {
  if (type === 'combo' && comboType && RADIATION_SPEED[comboType] !== undefined) {
    return RADIATION_SPEED[comboType];
  }
  return RADIATION_SPEED[type] ?? 150;
}

// Stagger between simultaneous in-match (root) activations so multiple
// roots don't perfectly overlap.
const ROOT_STAGGER_MS = 80;
// Score popup is delayed past the wave's last cell so the number lands after
// the visual reads "everything blew up", not in the middle of it.
const SCORE_POPUP_TAIL_MS = 80;
// Extra buffer past the last shrink completion before resolving the timeline,
// so the next syncFromSnapshot doesn't destroy sprites mid-animation.
const TIMELINE_TAIL_GRACE_MS = 80;

// Area bomb charge-up duration (ms): red zone highlight before explosion.
const AREA_BOMB_CHARGE_MS = 100;

// A normalised activation event used by the radiation scheduler. Matches
// SpecialActivationEvent shape but allows 'combo' for the swap initial path.
interface RadiationEvent {
  pos: CellPos;
  type: SpecialActivationKind;
  comboType?: string;
  clearedCells: CellPos[];
  score: number;
}

interface ScheduledTask {
  time: number;
  fn: () => void;
}

// ─── Board Animator ─────────────────────────────────────────

/**
 * Orchestrates all visual feedback for board operations.
 *
 * Consumes the structured results from GameSessionController
 * and translates them into timed animation sequences.
 */
export class BoardAnimator {
  private readonly boardRenderer: BoardRenderer;
  private readonly layers: LayerRefs;
  private readonly mergeFx: MergeParticleSystem;
  private readonly jellyFx: JellyParticleSystem;

  private hintFlashGfx: Graphics[] = [];
  private hintFlashTime = 0;

  constructor(config: BoardAnimatorConfig) {
    this.boardRenderer = config.boardRenderer;
    this.layers = config.layers;
    this.mergeFx = new MergeParticleSystem(config.layers.boardLayer, config.renderer);
    this.jellyFx = new JellyParticleSystem(config.layers.boardLayer);
  }

  // ─── Public: Animate a Swap Result ────────────────────────

  /**
   * Animate the full result of a swap operation.
   * Call this after GameSessionController.executeSwap().
   *
   * @param result - The SwapResult from the session controller
   * @param from - Source cell position (for swap animation)
   * @param to - Target cell position (for swap animation)
   * @param board - Current board state (for sprite lookups after logic)
   */
  async animateSwap(
    result: SwapResult,
    from: CellPos,
    to: CellPos,
    board: Board,
  ): Promise<void> {
    if (!result.valid) {
      await this.playSwapSlide(from, to);
      result.type === 'jellyBlocked' ? playBlockerImmovable() : playInvalid();
      await this.playSwapSlide(to, from);
      return;
    }

    // Play initial swap slide
    await this.playSwapSlide(from, to);
    // Swap-slide moved sprites visually but didn't update the sprite-map
    // keys. Sync them now so getSprite(c,r) returns the sprite that's
    // actually at (c,r) — otherwise downstream shrink/effects fall on
    // the wrong cells.
    this.boardRenderer.swapSpriteKeys(from, to);

    // Handle initial activation (combo/colour/directBomb)
    if (result.initialActivation) {
      const { type, pos, clearedCells, passiveActivations, gravity, score } = result.initialActivation;

      if (type === 'combo') {
        playCombo(result.initialActivation.comboType);
      }

      // ── colour.line combo: staged Mark → Brew → Blast with line bomb conversion ──
      if (type === 'combo' && result.initialActivation.comboType === 'colour.line') {
        const colourByPos = new Map<string, GemColour | null>();
        for (const c of clearedCells) {
          if (c.colour) colourByPos.set(`${c.pos[0]},${c.pos[1]}`, c.colour);
        }

        // comboTargets = same-colour gems that were converted to line bombs
        const comboTargets = result.initialActivation.comboTargets ?? [];

        // Build radiation events for each converted line bomb target.
        // Each target fires a line bomb wave at blast time.
        const lineBombEvents: RadiationEvent[] = comboTargets.map(targetPos => {
          // Determine direction: same deterministic logic as colourTransform
          const direction: 'lineH' | 'lineV' = (targetPos[0] + targetPos[1]) % 2 === 0 ? 'lineH' : 'lineV';
          // Compute the cells this line bomb would clear
          const bombCells: CellPos[] = [];
          if (direction === 'lineH') {
            for (let c = 0; c < (result.initialActivation!.boardSnapshot.width ?? 8); c++) {
              bombCells.push([c, targetPos[1]]);
            }
          } else {
            for (let r = 0; r < (result.initialActivation!.boardSnapshot.height ?? 8); r++) {
              bombCells.push([targetPos[0], r]);
            }
          }
          return { pos: targetPos, type: direction as SpecialActivationKind, clearedCells: bombCells, score: 0 };
        });

        // Also include any passive activations (specials triggered by line bomb blasts)
        const allPassiveEvents = [
          ...lineBombEvents,
          ...passiveActivations.map(this.toRadiationEvent),
        ];

        await this.playColourLineComboStagedTimeline(
          pos,
          comboTargets,
          allPassiveEvents,
          colourByPos,
          1,
        );

        await this.afterClear(result.initialActivation.boardSnapshot, gravity, result.initialActivation.blockerHits);

      // ── colour.bomb combo: staged Mark → Brew → Blast with area bomb conversion ──
      } else if (type === 'combo' && result.initialActivation.comboType === 'colour.bomb') {
        const colourByPos = new Map<string, GemColour | null>();
        for (const c of clearedCells) {
          if (c.colour) colourByPos.set(`${c.pos[0]},${c.pos[1]}`, c.colour);
        }

        // comboTargets = same-colour gems that were converted to area bombs
        const comboTargets = result.initialActivation.comboTargets ?? [];

        // Build radiation events for each converted area bomb target.
        // Each target fires a 3×3 area bomb wave at blast time.
        const boardWidth = result.initialActivation.boardSnapshot.width ?? 8;
        const boardHeight = result.initialActivation.boardSnapshot.height ?? 8;
        const areaBombEvents: RadiationEvent[] = comboTargets.map(targetPos => {
          // Compute the 3×3 cells this area bomb would clear
          const bombCells: CellPos[] = [];
          for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
              const c = targetPos[0] + dc;
              const r = targetPos[1] + dr;
              if (c >= 0 && c < boardWidth && r >= 0 && r < boardHeight) {
                bombCells.push([c, r]);
              }
            }
          }
          return { pos: targetPos, type: 'area' as SpecialActivationKind, clearedCells: bombCells, score: 0 };
        });

        // Also include any passive activations (specials triggered by area bomb blasts)
        const allPassiveEvents = [
          ...areaBombEvents,
          ...passiveActivations.map(this.toRadiationEvent),
        ];

        await this.playColourBombComboStagedTimeline(
          pos,
          comboTargets,
          allPassiveEvents,
          colourByPos,
          1,
        );

        await this.afterClear(result.initialActivation.boardSnapshot, gravity, result.initialActivation.blockerHits);

      // ── colour.colour combo: staged Mark → Brew → Blast for entire board ──
      } else if (type === 'combo' && result.initialActivation.comboType === 'colour.colour') {
        const colourByPos = new Map<string, GemColour | null>();
        for (const c of clearedCells) {
          if (c.colour) colourByPos.set(`${c.pos[0]},${c.pos[1]}`, c.colour);
        }

        // colour.colour clears the ENTIRE board — targets are all non-empty cells
        // from clearedCells, excluding the source position (the swap target where combo triggered)
        const allTargets: CellPos[] = clearedCells
          .filter(c => !(c.pos[0] === pos[0] && c.pos[1] === pos[1]))
          .map(c => c.pos);

        // No passive radiation events needed — everything is being cleared simultaneously
        await this.playColourGemStagedTimeline(
          pos,
          allTargets,
          [],
          colourByPos,
          1,
        );

        await this.afterClear(result.initialActivation.boardSnapshot, gravity, result.initialActivation.blockerHits);
      } else {
        // Default combo / colour / directBomb path
        // The initial activation's clearedCells is the FULL set (initial blast +
        // every passive blast). For radiation we need just the initial blast.
        // IMPORTANT: keep each chained special's own pos inside the parent's
        // wave — that's what triggers the chain in scheduleEvent. Only strip
        // the chained's own blast cells (those belong to the chained's wave).
        const passiveBlastCells = new Set<string>();
        for (const p of passiveActivations) {
          for (const [c, r] of p.clearedCells) passiveBlastCells.add(`${c},${r}`);
        }
        const initialBlast: CellPos[] = clearedCells
          .filter(c => !passiveBlastCells.has(`${c.pos[0]},${c.pos[1]}`))
          .map(c => c.pos);

        // ── Show blast zone overlay for bomb/line combos ──────────
        const comboType = result.initialActivation.comboType;
        if (comboType === 'bomb.bomb' || comboType === 'line.line' || comboType === 'bomb.line') {
          const overlayCells = initialBlast as Array<[number, number]>;
          const overlayColour = comboType === 'line.line'
            ? BLAST_ZONE_COLOUR_LINE_H
            : comboType === 'bomb.bomb'
              ? BLAST_ZONE_COLOUR_AREA
              : BLAST_ZONE_COLOUR_LINE_V; // bomb.line uses line colour
          void this.playAnims([
            createBlastZoneOverlay(overlayCells, this.layers.boardLayer, 300, overlayColour),
          ]);
          await this.wait(120); // brief pause so player sees the zone before blast
        }

        const root: RadiationEvent = {
          pos,
          type: type as SpecialActivationKind,
          comboType: result.initialActivation.comboType,
          clearedCells: initialBlast,
          score,
        };

        const colourByPos = new Map<string, GemColour | null>();
        for (const c of clearedCells) {
          if (c.colour) colourByPos.set(`${c.pos[0]},${c.pos[1]}`, c.colour);
        }

        await this.playRadiationTimeline(
          [root],
          passiveActivations.map(this.toRadiationEvent),
          [],
          colourByPos,
          1,
          result.initialActivation.blockerHits,
          result.initialActivation.spawnInfos ?? [],
        );

        await this.afterClear(result.initialActivation.boardSnapshot, gravity, []);
      }
    } else {
      // Normal swap: play swap SFX
      playSwap();
    }

    // Animate cascade steps
    await this.animateCascadeSteps(result.cascadeSteps, board);
  }

  // ─── Public: Animate an Activation Result ─────────────────

  /**
   * Animate the result of a tap-activate operation.
   * Call this after GameSessionController.executeActivation().
   */
  async animateActivation(
    result: ActivateResult,
    board: Board,
  ): Promise<void> {
    if (!result.valid) return;

    const { type, pos, clearedCells, score, passiveActivations, gravity, cascadeSteps } = result;

    // Build root event = initial activation's own blast. Keep chained
    // specials' own positions in the parent's wave so scheduleEvent can
    // detect them and fire the chain; only strip cells that came from a
    // chained's blast.
    const passiveBlastCells = new Set<string>();
    for (const p of passiveActivations) {
      for (const [c, r] of p.clearedCells) passiveBlastCells.add(`${c},${r}`);
    }
    const initialBlast: CellPos[] = clearedCells
      .filter(c => !passiveBlastCells.has(`${c.pos[0]},${c.pos[1]}`))
      .map(c => c.pos);

    const root: RadiationEvent = { pos, type, clearedCells: initialBlast, score };

    const colourByPos = new Map<string, GemColour | null>();
    for (const c of clearedCells) {
      if (c.colour) colourByPos.set(`${c.pos[0]},${c.pos[1]}`, c.colour);
    }

    await this.playRadiationTimeline(
      [root],
      passiveActivations.map(this.toRadiationEvent),
      [],
      colourByPos,
      1,
      result.blockerHits,
    );

    await this.afterClear(result.boardSnapshot, gravity, []);
    await this.animateCascadeSteps(cascadeSteps, board);
  }

  // ─── Public: Update (per-frame) ───────────────────────────

  /**
   * Call each frame to update particle systems.
   */
  update(dtMs: number): void {
    this.mergeFx.update(dtMs);
    this.jellyFx.update(dtMs);

    if (this.hintFlashGfx.length > 0) {
      this.hintFlashTime += dtMs;
      // 900ms per cycle, alpha oscillates 0.04 → 0.22
      const alpha = 0.04 + 0.18 * (0.5 + 0.5 * Math.sin(this.hintFlashTime / 900 * Math.PI * 2));
      for (const gfx of this.hintFlashGfx) gfx.alpha = alpha;
    }
  }

  // ─── Public: Hint Flash ───────────────────────────────────

  showHintFlash(cells: CellPos[]): void {
    this.clearHintFlash();
    for (const [col, row] of cells) {
      const gfx = new Graphics();
      gfx.rect(0, 0, CELL_SIZE, CELL_SIZE).fill({ color: 0xffffff });
      gfx.position.set(col * CELL_SIZE, row * CELL_SIZE);
      gfx.alpha = 0.04;
      this.layers.cellLayer.addChild(gfx);
      this.hintFlashGfx.push(gfx);
    }
    this.hintFlashTime = 0;
  }

  clearHintFlash(): void {
    for (const gfx of this.hintFlashGfx) gfx.destroy();
    this.hintFlashGfx = [];
    this.hintFlashTime = 0;
  }

  // ─── Public: Reshuffle Animation ─────────────────────────

  /**
   * 重洗動畫（滑動版）：每顆寶石從舊位置滑動到新位置，完成後呼叫 syncFn。
   * moves 來自 session.checkAndReshuffle()；若為空陣列，退回淡出淡入。
   */
  async animateReshuffleSlide(moves: ReshuffleMove[], syncFn: () => void): Promise<void> {
    if (moves.length === 0) {
      await this.animateReshuffle(syncFn);
      return;
    }

    const SLIDE_MS = 400;
    const slideAnims: Animation[] = [];

    for (const { from, to } of moves) {
      const spr = this.boardRenderer.getSprite(from[0], from[1]);
      if (!spr) continue;

      const startX = (spr as any).position.x as number;
      const startY = (spr as any).position.y as number;
      const endX = to[0] * CELL_SIZE + CELL_SIZE / 2;
      const endY = to[1] * CELL_SIZE + CELL_SIZE / 2;

      slideAnims.push({
        elapsed: 0,
        duration: SLIDE_MS,
        update(dt: number): boolean {
          this.elapsed += dt;
          const t = Math.min(this.elapsed / SLIDE_MS, 1);
          const ease = 1 - (1 - t) * (1 - t); // ease-out quad
          (spr as any).position.set(startX + (endX - startX) * ease, startY + (endY - startY) * ease);
          return this.elapsed >= SLIDE_MS;
        },
        complete() {
          (spr as any).position.set(endX, endY);
        },
      });
    }

    await this.playAnims(slideAnims);
    syncFn();
  }

  private async animateReshuffle(doReshuffle: () => void): Promise<void> {
    await this.fadeLayer(1, 0.2, 220);
    doReshuffle();
    await this.fadeLayer(0.2, 1, 280);
  }

  private fadeLayer(fromAlpha: number, toAlpha: number, durationMs: number): Promise<void> {
    const layer = this.layers.boardLayer;
    layer.alpha = fromAlpha;

    const anim: import('./animations').Animation = {
      elapsed: 0,
      duration: durationMs,
      update(dt: number): boolean {
        this.elapsed += dt;
        const t = Math.min(this.elapsed / durationMs, 1);
        layer.alpha = fromAlpha + (toAlpha - fromAlpha) * t;
        return this.elapsed >= durationMs;
      },
      complete() { layer.alpha = toAlpha; },
    };

    return this.playAnims([anim]);
  }

  // ─── Public: Cleanup ──────────────────────────────────────

  destroy(): void {
    this.clearHintFlash();
    this.mergeFx.destroy();
    this.jellyFx.destroy();
  }

  // ─── Private: Cascade Steps ─────────────────────────────

  private async animateCascadeSteps(steps: CascadeStep[], board: Board): Promise<void> {
    for (const step of steps) {
      // Sync to pre-clear state: every gem still visible (including in-match
      // special blast targets — game-session captures preClearSnapshot before
      // running the in-match clears).
      this.boardRenderer.syncFromSnapshot(step.preClearSnapshot);

      // Pure-match cells = step.clearedCells minus every cell any activation
      // will clear. These shrink at T+0; activations radiate from their own
      // pos with per-cell delay.
      const allActivationCells = new Set<string>();
      for (const e of step.specialActivations) {
        allActivationCells.add(`${e.pos[0]},${e.pos[1]}`);
        for (const [c, r] of e.clearedCells) allActivationCells.add(`${c},${r}`);
      }
      for (const e of step.passiveActivations) {
        allActivationCells.add(`${e.pos[0]},${e.pos[1]}`);
        for (const [c, r] of e.clearedCells) allActivationCells.add(`${c},${r}`);
      }
      // Extract spawn infos first so we can exclude their cells from pureMatchCells
      const spawnInfos = step.matches
        .filter((m): m is typeof m & { spawnAt: CellPos; spawnsSpecial: SpecialGemType } =>
          m.spawnAt !== undefined && m.spawnsSpecial !== undefined,
        )
        .map(m => ({ pos: m.spawnAt, type: m.spawnsSpecial, cells: m.cells }));

      // Cells belonging to a spawn match animate via converge slide, not shrink-in-place
      const spawnMatchCellKeys = new Set<string>();
      for (const info of spawnInfos) {
        for (const c of info.cells) spawnMatchCellKeys.add(`${c[0]},${c[1]}`);
      }

      const pureMatchCells = step.clearedCells.filter(
        c => !allActivationCells.has(`${c.pos[0]},${c.pos[1]}`) &&
             !spawnMatchCellKeys.has(`${c.pos[0]},${c.pos[1]}`),
      );

      const colourByPos = this.buildColourMap(step.preClearSnapshot, step.clearedCells);

      if (pureMatchCells.length > 0) {
        playMatchSfx(pureMatchCells.length, step.chain);
      }
      // Play match.special emphasis when special gems are activated in this step
      if (step.specialActivations.length > 0) {
        playEvent('match.special');
      }
      this.showScorePopup(step.score, step.clearedCells.map(c => c.pos), step.chain);
      this.showComboChainText(step.chain, step.clearedCells.map(c => c.pos));

      await this.playRadiationTimeline(
        step.specialActivations.map(this.toRadiationEvent),
        step.passiveActivations.map(this.toRadiationEvent),
        pureMatchCells,
        colourByPos,
        step.chain,
        step.blockerHits,
        spawnInfos,
      );

      await this.afterClear(step.boardSnapshot, step.gravity, []);
    }
  }

  // ─── Private: Radiation Timeline ────────────────────────────

  private toRadiationEvent = (e: SpecialActivationEvent): RadiationEvent => ({
    pos: e.pos,
    type: e.type as SpecialActivationKind,
    clearedCells: e.clearedCells,
    score: e.score,
  });

  /**
   * 在清除動畫結束後、重力下落前：
   * 1. 即時更新 jelly overlay（syncBlockers）
   * 2. 播放 jelly 粒子特效與音效
   * 3. 重置寶石 sprite 到下落前狀態（syncFromSnapshot）
   * 4. 播放重力下落動畫
   */
  private async afterClear(
    snapshot: import('../game/runtime/game-session').BoardSnapshot,
    gravity: import('../game/runtime/game-session').GravityResult,
    blockerHits: BlockerHit[],
  ): Promise<void> {
    this.boardRenderer.applyBlockerHits(blockerHits);
    for (const { pos: [col, row], fromLayer, cleared } of blockerHits) {
      playJellyHitByLayer(cleared ? 1 : fromLayer as 3 | 2 | 1);
      this.jellyFx.spawn(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, cleared);
    }
    this.boardRenderer.syncFromSnapshot(snapshot);
    await this.playGravityFromResult(gravity);
  }

  private chebyshev(a: CellPos, b: CellPos): number {
    return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  }

  /** 建立單格 snapshot，用於在 timeline 中即時顯示新生成的特殊寶石 */
  private makeSingleCellSnapshot(pos: CellPos, type: SpecialGemType) {
    const [col, row] = pos;
    const cells: any[][] = [];
    for (let c = 0; c <= col; c++) {
      cells[c] = [];
      for (let r = 0; r <= row; r++) {
        cells[c][r] = { gem: null, isEmpty: false, deliveryItem: false };
      }
    }
    cells[col][row] = { gem: { colour: null, special: type }, isEmpty: false, deliveryItem: false };
    return { width: col + 1, height: row + 1, cells };
  }

  private async playRadiationTimeline(
    rootEvents: RadiationEvent[],
    passiveEvents: RadiationEvent[],
    pureMatchCells: ClearedCellInfo[],
    colourByPos: Map<string, GemColour | null>,
    chain: number,
    blockerHits: BlockerHit[] = [],
    spawnInfos: Array<{ pos: CellPos; type: SpecialGemType; cells: CellPos[] }> = [],
  ): Promise<void> {
    const eventByPos = new Map<string, RadiationEvent>();
    for (const e of rootEvents) eventByPos.set(`${e.pos[0]},${e.pos[1]}`, e);
    for (const e of passiveEvents) eventByPos.set(`${e.pos[0]},${e.pos[1]}`, e);

    const animatedClears = new Set<string>();
    const scheduledEvents = new Set<string>();
    const tasks: ScheduledTask[] = [];
    let endTime = MATCH_CLEAR_DURATION_MS;

    // Build pos → hit lookup so each cell can fire its blocker update inline.
    // Every hit pos is guaranteed to appear in either pureMatchCells or an
    // event's clearedCells, so callers can safely pass [] to afterClear.
    const blockerHitByPos = new Map<string, BlockerHit>();
    for (const hit of blockerHits) {
      blockerHitByPos.set(`${hit.pos[0]},${hit.pos[1]}`, hit);
    }

    // Pure-match cells clear immediately at T+0
    for (const c of pureMatchCells) {
      const k = `${c.pos[0]},${c.pos[1]}`;
      if (animatedClears.has(k)) continue;
      animatedClears.add(k);
      tasks.push({ time: 0, fn: () => this.shrinkCell(c.pos, c.colour, chain) });
      const pureHit = blockerHitByPos.get(k);
      if (pureHit) {
        const [hcol, hrow] = pureHit.pos;
        tasks.push({
          time: MATCH_CLEAR_DURATION_MS,
          fn: () => {
            this.boardRenderer.applyBlockerHits([pureHit]);
            playJellyHitByLayer(pureHit.cleared ? 1 : pureHit.fromLayer as 3 | 2 | 1);
            this.jellyFx.spawn(hcol * CELL_SIZE + CELL_SIZE / 2, hrow * CELL_SIZE + CELL_SIZE / 2, pureHit.cleared);
          },
        });
      }
    }

    // Collect async colour gem staged timeline promises to await alongside runTimeline
    const colourGemPromises: Promise<void>[] = [];

    const scheduleEvent = (event: RadiationEvent, startTime: number): void => {
      const ek = `${event.pos[0]},${event.pos[1]}`;
      if (scheduledEvents.has(ek)) return;
      scheduledEvents.add(ek);

      // ── Colour gem interception: delegate to staged timeline ──
      if (event.type === 'colour') {
        // Targets = clearedCells excluding the colour gem's own position
        const targets = event.clearedCells.filter(
          cell => !(cell[0] === event.pos[0] && cell[1] === event.pos[1]),
        );

        // Gather passive events: specials within the colour gem's cleared cells
        const colourPassiveEvents: RadiationEvent[] = [];
        for (const cell of event.clearedCells) {
          const ck = `${cell[0]},${cell[1]}`;
          if (ck === ek) continue; // skip the colour gem itself
          const chained = eventByPos.get(ck);
          if (chained) {
            colourPassiveEvents.push(chained);
            // Mark as scheduled so they aren't processed again by the normal path
            scheduledEvents.add(ck);
          }
        }

        // Mark all target cells as animated so the normal path doesn't shrink them
        for (const cell of event.clearedCells) {
          animatedClears.add(`${cell[0]},${cell[1]}`);
        }

        colourGemPromises.push(
          this.playColourGemStagedTimeline(event.pos, targets, colourPassiveEvents, colourByPos, chain),
        );
        return; // Don't proceed with the default per-cell shrink behaviour
      }

      // Area bomb: charge-up phase with red zone highlight before explosion
      // Line bomb: also show red zone highlight on the affected row/col
      const isArea = event.type === 'area';
      const isLine = event.type === 'lineH' || event.type === 'lineV';
      const chargeTime = isArea ? AREA_BOMB_CHARGE_MS : 0;
      const radiationSpeed = getRadiationSpeed(event.type, event.comboType);

      if (isArea || isLine) {
        // Show coloured overlay on affected cells
        const overlayCells: CellPos[] = [event.pos, ...event.clearedCells];
        const overlayDuration = isArea
          ? chargeTime
          : (Math.max(...overlayCells.map(c => this.chebyshev(event.pos, c))) * radiationSpeed + MATCH_CLEAR_DURATION_MS);
        const overlayColour = isArea
          ? BLAST_ZONE_COLOUR_AREA
          : event.type === 'lineH' ? BLAST_ZONE_COLOUR_LINE_H : BLAST_ZONE_COLOUR_LINE_V;
        tasks.push({
          time: startTime,
          fn: () => {
            void this.playAnims([
              createBlastZoneOverlay(
                overlayCells as Array<[number, number]>,
                this.layers.boardLayer,
                overlayDuration,
                overlayColour,
              ),
            ]);
          },
        });
      }

      // Wave start: ring effect + flavor text + special-clear SFX
      // (delayed by chargeTime for area bombs)
      tasks.push({
        time: startTime + chargeTime,
        fn: () => {
          const [ax, ay] = this.cellToPixel(event.pos);
          const dur = getSpecialActivationDuration(event.type, true);
          this.showFlavorText(event.type, [event.pos], 30);
          void this.playAnims([
            createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
          ]);
          // Skip SFX for 'combo' type — already played by playCombo() earlier
          if (event.type !== 'combo') {
            playSpecialByKind(event.type);
          }
        },
      });

      // Wave radiates outward — schedule each cell's clear at chebyshev * speed.
      let waveEnd = startTime + chargeTime;
      const allCells: CellPos[] = [event.pos, ...event.clearedCells];
      for (const cell of allCells) {
        const ck = `${cell[0]},${cell[1]}`;
        const dist = this.chebyshev(event.pos, cell);
        const arriveAt = startTime + chargeTime + dist * radiationSpeed;
        if (arriveAt > waveEnd) waveEnd = arriveAt;

        // Chain trigger: if the wave reaches another special's source, that
        // special radiates from its own pos starting at this arrival time.
        if (ck !== ek) {
          const chained = eventByPos.get(ck);
          if (chained) scheduleEvent(chained, arriveAt);
        }

        if (animatedClears.has(ck)) continue;
        animatedClears.add(ck);

        tasks.push({
          time: arriveAt,
          fn: () => this.shrinkCell(cell, colourByPos.get(ck) ?? null, chain),
        });
        // Fire blocker visual + SFX + particle the moment the wave arrives,
        // not after the entire radiation finishes.
        const radHit = blockerHitByPos.get(ck);
        if (radHit) {
          const [hcol, hrow] = radHit.pos;
          tasks.push({
            time: arriveAt,
            fn: () => {
              this.boardRenderer.applyBlockerHits([radHit]);
              playJellyHitByLayer(radHit.cleared ? 1 : radHit.fromLayer as 3 | 2 | 1);
              this.jellyFx.spawn(hcol * CELL_SIZE + CELL_SIZE / 2, hrow * CELL_SIZE + CELL_SIZE / 2, radHit.cleared);
            },
          });
        }
      }

      // Score popup lands just after the wave's last cell.
      if (event.score > 0) {
        tasks.push({
          time: waveEnd + SCORE_POPUP_TAIL_MS,
          fn: () => this.showScorePopup(event.score, event.clearedCells, chain),
        });
      }

      const candidateEnd = waveEnd + MATCH_CLEAR_DURATION_MS + TIMELINE_TAIL_GRACE_MS;
      if (candidateEnd > endTime) endTime = candidateEnd;
    };

    // ── Spawn VFX: 成員寶石聚合飛向定位點，全員抵達後生成特殊寶石 ──
    if (spawnInfos.length > 0 && GEM_CONVERGE_DURATION_MS > endTime) {
      endTime = GEM_CONVERGE_DURATION_MS;
    }
    for (const { pos, type, cells } of spawnInfos) {
      const [cx, cy] = this.cellToPixel(pos);

      // 所有成員（含定位點）同時啟動聚合動畫，持續 GEM_CONVERGE_DURATION_MS
      // 越遠的格子移動距離越長但時間相同 → 速度自然更快，精準同時抵達
      for (const cell of cells) {
        const [startX, startY] = this.cellToPixel(cell);
        tasks.push({
          time: 0,
          fn: () => {
            const spr = this.boardRenderer.getSprite(cell[0], cell[1]);
            if (spr) {
              void this.playAnims([
                createGemConvergeAnimation(spr as any, startX, startY, cx, cy),
              ]);
            }
          },
        });
      }

      // 全員消失完畢：揭示特殊寶石 + 震波 + SFX
      tasks.push({
        time: GEM_CONVERGE_DURATION_MS,
        fn: () => {
          const snap = this.makeSingleCellSnapshot(pos, type);
          this.boardRenderer.updateCell(pos[0], pos[1], snap as any);
          void this.playAnims([createSpecialSpawnShockwave(cx, cy, this.layers.boardLayer)]);
          const sfxKey = type === 'colour' ? 'special.spawn.colour'
                       : type === 'area'   ? 'special.spawn.bomb'
                       :                     'special.spawn.line';
          playEvent(sfxKey);
        },
      });
    }

    // Roots fire with a small stagger so simultaneous in-match specials don't
    // perfectly overlap.
    for (let i = 0; i < rootEvents.length; i++) {
      scheduleEvent(rootEvents[i], i * ROOT_STAGGER_MS);
    }

    // Await both the normal radiation timeline and any colour gem staged timelines
    await Promise.all([
      this.runTimeline(tasks, endTime),
      ...colourGemPromises,
    ]);
  }

  // ─── Private: Colour Gem Staged Timeline ──────────────────

  /**
   * Color Gem 專用的分階段輻射時間軸。
   *
   * 取代原本在 playRadiationTimeline 中對 colour 類型事件的處理，
   * 將「到達即清除」改為「標記 → 蓄力 → 同步爆破」。
   */
  private async playColourGemStagedTimeline(
    source: CellPos,
    targets: CellPos[],
    passiveEvents: RadiationEvent[],
    colourByPos: Map<string, GemColour | null>,
    chain: number,
  ): Promise<void> {
    // ── No-target fast path: just shrink the source gem and return ──
    if (targets.length === 0) {
      this.shrinkCell(source, null, chain);
      return;
    }

    // ── Compute staged phases ──
    const phases = computeStagedPhases(source, targets, passiveEvents);
    const { markSchedule, blastStartTime } = phases;

    const reducedMotion = detectPrefersReducedMotion();
    const tasks: ScheduledTask[] = [];

    // ── Activation burst: visual effect + SFX at source position (time 0) ──
    tasks.push({
      time: 0,
      fn: () => {
        const [sx, sy] = this.cellToPixel(source);
        void this.playAnims([
          createSpecialActivationEffect(sx, sy, BLAST_ZONE_COLOUR_COLOUR, this.layers.boardLayer, 600),
        ]);
        playSpecialByKind('colour');
        // Show blast zone overlay on all target cells
        const overlayCells = targets as Array<[number, number]>;
        if (overlayCells.length > 0) {
          const overlayDuration = blastStartTime + MATCH_CLEAR_DURATION_MS;
          void this.playAnims([
            createBlastZoneOverlay(overlayCells, this.layers.boardLayer, overlayDuration, BLAST_ZONE_COLOUR_COLOUR),
          ]);
        }
      },
    });

    // ── Mark Phase: schedule mark effects at each target's arrival time ──
    for (const { pos, arriveAt } of markSchedule) {
      const markDuration = blastStartTime - arriveAt;
      tasks.push({
        time: arriveAt,
        fn: () => {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) return;
          const colourHex = colourByPos.get(`${pos[0]},${pos[1]}`);
          const colourValue = colourHex ? GEM_COLOURS[colourHex] : 0xffffff;
          void this.playAnims([
            createMarkEffect({
              sprite: spr as any,
              duration: markDuration,
              colour: colourValue,
              reducedMotion,
            }),
          ]);
        },
      });
    }
    // Mark Phase SFX: play once when first target is marked
    if (markSchedule.length > 0) {
      tasks.push({
        time: markSchedule[0].arriveAt,
        fn: () => { playEvent('match.special'); },
      });
    }

    // ── Brew Phase: schedule brew animations for all marked gems ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
        playEvent('cascade.loop');
        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          void this.playAnims([
            createBrewAnimation({
              sprite: spr as any,
              duration: BREW_PHASE_DURATION_MS,
              reducedMotion,
            }),
          ]);
        }
      },
    });

    // ── Blast Phase: schedule enhanced blast for all marked gems ──
    tasks.push({
      time: blastStartTime,
      fn: () => {
        // Play dedicated blast sound for colour gem mass destruction
        playMatchSfx(targets.length, chain);
        playEvent('match.special');

        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;
          void this.playAnims([
            createEnhancedBlastAnimation({
              sprite: spr as any,
              colour: gemColour,
              particleMultiplier: BLAST_PARTICLE_MULTIPLIER,
              fxLayer: this.layers.fxLayer,
            }),
          ]);
          // Also fire particle FX via mergeFx
          if (gemColour) {
            const [px, py] = this.cellToPixel(pos);
            const fxLevel = Math.min(chain - 1, 3);
            this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[gemColour]);
          }
        }
        // Shrink the source gem itself at blast time
        this.shrinkCell(source, null, chain);
      },
    });

    // ── Passive triggers: fire chained specials at blastStartTime ──
    for (const { event, triggerAt } of phases.passiveSchedule) {
      tasks.push({
        time: triggerAt,
        fn: () => {
          const [ax, ay] = this.cellToPixel(event.pos);
          const dur = getSpecialActivationDuration(event.type, true);
          this.showFlavorText(event.type, [event.pos], 30);
          void this.playAnims([
            createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
          ]);
          playSpecialByKind(event.type);
        },
      });
    }

    // ── Score popup: show after blast completes ──
    const scorePopupTime = blastStartTime + MATCH_CLEAR_DURATION_MS + SCORE_POPUP_TAIL_MS;
    const totalScore = targets.length * 10 * chain; // approximate; actual score comes from caller
    tasks.push({
      time: scorePopupTime,
      fn: () => {
        this.showScorePopup(totalScore, targets, chain);
      },
    });

    // ── Run the timeline ──
    const endTime = scorePopupTime + TIMELINE_TAIL_GRACE_MS;
    await this.runTimeline(tasks, endTime);
  }

  // ─── Private: Colour + Line Combo Staged Timeline ─────────

  /**
   * colour.line 組合專用的分階段輻射時間軸。
   *
   * Mark Phase: 標記所有同色寶石（comboTargets）
   * Brew Phase: 蓄力動畫
   * Blast Phase: 將每個標記寶石轉換為 Line Bomb 視覺並觸發各自輻射波
   */
  private async playColourLineComboStagedTimeline(
    source: CellPos,
    targets: CellPos[],
    passiveEvents: RadiationEvent[],
    colourByPos: Map<string, GemColour | null>,
    chain: number,
  ): Promise<void> {
    // ── No-target fast path: just shrink the source gem and return ──
    if (targets.length === 0) {
      this.shrinkCell(source, null, chain);
      return;
    }

    // ── Compute staged phases (same timing as colour gem staged blast) ──
    const phases = computeStagedPhases(source, targets, passiveEvents);
    const { markSchedule, blastStartTime } = phases;

    const reducedMotion = detectPrefersReducedMotion();
    const tasks: ScheduledTask[] = [];

    // ── Activation burst: show source effect + target zone overlay at time 0 ──
    tasks.push({
      time: 0,
      fn: () => {
        const [sx, sy] = this.cellToPixel(source);
        void this.playAnims([
          createSpecialActivationEffect(sx, sy, BLAST_ZONE_COLOUR_COLOUR, this.layers.boardLayer, 600),
        ]);
        // Show all target positions as zone overlay (persists until blast ends)
        const overlayCells = targets as Array<[number, number]>;
        if (overlayCells.length > 0) {
          void this.playAnims([
            createBlastZoneOverlay(overlayCells, this.layers.boardLayer, blastStartTime + MATCH_CLEAR_DURATION_MS, BLAST_ZONE_COLOUR_COLOUR),
          ]);
        }
      },
    });

    // ── Mark Phase: immediately convert each target to Line Bomb visual on arrival ──
    for (const { pos, arriveAt } of markSchedule) {
      tasks.push({
        time: arriveAt,
        fn: () => {
          // Immediately replace sprite with standalone Line Bomb visual (emoji style)
          const direction: 'lineH' | 'lineV' = (pos[0] + pos[1]) % 2 === 0 ? 'lineH' : 'lineV';
          const singleCellSnapshot = {
            width: pos[0] + 1,
            height: pos[1] + 1,
            cells: (() => {
              const cells: any[][] = [];
              for (let c = 0; c <= pos[0]; c++) {
                cells[c] = [];
                for (let r = 0; r <= pos[1]; r++) {
                  cells[c][r] = { gem: null, isEmpty: false, deliveryItem: false };
                }
              }
              // colour: null triggers the standalone special item path (dark circle + emoji)
              cells[pos[0]][pos[1]] = { gem: { colour: null, special: direction }, isEmpty: false, deliveryItem: false };
              return cells;
            })(),
          };
          this.boardRenderer.updateCell(pos[0], pos[1], singleCellSnapshot as any);
        },
      });
    }
    // Mark Phase SFX: per-target spawn sound aligned with each gem's transform.
    // Volume decays so stacked plays don't pile up; rate detunes per-index for variety.
    for (let i = 0; i < markSchedule.length; i++) {
      const vol = Math.max(0.35, 1 - i * 0.12);
      const rate = 1 + ((i % 4) - 1.5) * 0.04;
      tasks.push({
        time: markSchedule[i].arriveAt,
        fn: () => { playEvent('special.spawn.line', vol, rate); },
      });
    }

    // ── Brew Phase: schedule brew animations for all converted bombs ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
        playEvent('cascade.loop');
        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          void this.playAnims([
            createBrewAnimation({
              sprite: spr as any,
              duration: BREW_PHASE_DURATION_MS,
              reducedMotion,
            }),
          ]);
        }
      },
    });

    // ── Blast Phase: fire Line Bomb effects with directional radiation ──
    tasks.push({
      time: blastStartTime,
      fn: () => {
        // Shrink the source gem (colour gem) at blast time
        this.shrinkCell(source, null, chain);

        for (const { pos } of markSchedule) {
          const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;
          const convertedSpr = this.boardRenderer.getSprite(pos[0], pos[1]);

          // Fire Line Bomb activation effect (expanding ring at bomb position)
          const [px, py] = this.cellToPixel(pos);
          const direction: 'lineH' | 'lineV' = (pos[0] + pos[1]) % 2 === 0 ? 'lineH' : 'lineV';
          const dur = getSpecialActivationDuration(direction, true);
          void this.playAnims([
            createSpecialActivationEffect(px, py, gemColour ? GEM_COLOURS[gemColour] : 0xffffff, this.layers.boardLayer, dur),
          ]);

          // Shrink the converted bomb sprite itself
          if (convertedSpr) {
            void this.playAnims([
              createEnhancedBlastAnimation({
                sprite: convertedSpr as any,
                colour: gemColour,
                particleMultiplier: BLAST_PARTICLE_MULTIPLIER,
                fxLayer: this.layers.fxLayer,
              }),
            ]);
          }

          // Particle FX at bomb position
          if (gemColour) {
            const fxLevel = Math.min(chain - 1, 3);
            this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[gemColour]);
          }
        }
      },
    });

    // ── Line Bomb blast zone overlay: show coloured highlight on affected row/col ──
    for (const { pos } of markSchedule) {
      const direction: 'lineH' | 'lineV' = (pos[0] + pos[1]) % 2 === 0 ? 'lineH' : 'lineV';

      // Compute all cells in the line (including the bomb itself)
      const blastZoneCells: Array<[number, number]> = [];
      if (direction === 'lineH') {
        const boardWidth = targets.reduce((max, t) => Math.max(max, t[0]), 0) + 2;
        const estimatedWidth = Math.max(boardWidth, 8);
        for (let c = 0; c < estimatedWidth; c++) {
          blastZoneCells.push([c, pos[1]]);
        }
      } else {
        const boardHeight = targets.reduce((max, t) => Math.max(max, t[1]), 0) + 2;
        const estimatedHeight = Math.max(boardHeight, 8);
        for (let r = 0; r < estimatedHeight; r++) {
          blastZoneCells.push([pos[0], r]);
        }
      }

      // Show coloured zone overlay at blast time (fades out over the radiation duration)
      const maxDist = blastZoneCells.reduce((max, cell) => Math.max(max, this.chebyshev(pos, cell)), 0);
      const radiationDuration = maxDist * getRadiationSpeed(direction) + MATCH_CLEAR_DURATION_MS;
      const zoneColour = direction === 'lineH' ? BLAST_ZONE_COLOUR_LINE_H : BLAST_ZONE_COLOUR_LINE_V;
      tasks.push({
        time: blastStartTime,
        fn: () => {
          void this.playAnims([
            createBlastZoneOverlay(blastZoneCells, this.layers.boardLayer, radiationDuration, zoneColour),
          ]);
        },
      });
    }

    // ── Line Bomb directional radiation: shrink cells along row/col from each bomb ──
    for (const { pos } of markSchedule) {
      const direction: 'lineH' | 'lineV' = (pos[0] + pos[1]) % 2 === 0 ? 'lineH' : 'lineV';
      const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;

      // Find all cells this line bomb would clear (from passiveEvents data)
      // Compute the line cells directly based on direction
      const lineCells: CellPos[] = [];
      if (direction === 'lineH') {
        // Clear entire row
        const boardWidth = targets.reduce((max, t) => Math.max(max, t[0]), 0) + 2;
        const estimatedWidth = Math.max(boardWidth, 8);
        for (let c = 0; c < estimatedWidth; c++) {
          if (c !== pos[0]) lineCells.push([c, pos[1]]);
        }
      } else {
        // Clear entire column
        const boardHeight = targets.reduce((max, t) => Math.max(max, t[1]), 0) + 2;
        const estimatedHeight = Math.max(boardHeight, 8);
        for (let r = 0; r < estimatedHeight; r++) {
          if (r !== pos[1]) lineCells.push([pos[0], r]);
        }
      }

      // Schedule each cell's shrink at chebyshev distance * radiation speed from blast time
      for (const cell of lineCells) {
        const dist = this.chebyshev(pos, cell);
        const arriveAt = blastStartTime + dist * getRadiationSpeed(direction);
        tasks.push({
          time: arriveAt,
          fn: () => {
            const cellColour = colourByPos.get(`${cell[0]},${cell[1]}`) ?? gemColour;
            this.shrinkCell(cell, cellColour, chain);
          },
        });
      }
    }

    // ── Line Bomb passive triggers (chained specials hit by line blasts) ──
    for (const { event, triggerAt } of phases.passiveSchedule) {
      tasks.push({
        time: triggerAt,
        fn: () => {
          const [ax, ay] = this.cellToPixel(event.pos);
          const dur = getSpecialActivationDuration(event.type, true);
          this.showFlavorText(event.type, [event.pos], 30);
          void this.playAnims([
            createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
          ]);
          playSpecialByKind(event.type);
        },
      });
    }

    // ── Score popup: show after blast completes ──
    const scorePopupTime = blastStartTime + MATCH_CLEAR_DURATION_MS + SCORE_POPUP_TAIL_MS;
    const totalScore = targets.length * 10 * chain;
    tasks.push({
      time: scorePopupTime,
      fn: () => {
        this.showScorePopup(totalScore, targets, chain);
      },
    });

    // ── Run the timeline ──
    const endTime = scorePopupTime + TIMELINE_TAIL_GRACE_MS;
    await this.runTimeline(tasks, endTime);
  }

  // ─── Private: Colour + Bomb Combo Staged Timeline ─────────

  /**
   * colour.bomb 組合專用的分階段輻射時間軸。
   *
   * Mark Phase: 標記所有同色寶石（comboTargets）
   * Brew Phase: 蓄力動畫
   * Blast Phase: 將每個標記寶石轉換為 Area Bomb 視覺並觸發各自 3×3 輻射波
   */
  private async playColourBombComboStagedTimeline(
    source: CellPos,
    targets: CellPos[],
    passiveEvents: RadiationEvent[],
    colourByPos: Map<string, GemColour | null>,
    chain: number,
  ): Promise<void> {
    // ── No-target fast path: just shrink the source gem and return ──
    if (targets.length === 0) {
      this.shrinkCell(source, null, chain);
      return;
    }

    // ── Compute staged phases (same timing as colour gem staged blast) ──
    const phases = computeStagedPhases(source, targets, passiveEvents);
    const { markSchedule, blastStartTime } = phases;

    const reducedMotion = detectPrefersReducedMotion();
    const tasks: ScheduledTask[] = [];

    // ── Activation burst: show source effect + target zone overlay at time 0 ──
    tasks.push({
      time: 0,
      fn: () => {
        const [sx, sy] = this.cellToPixel(source);
        void this.playAnims([
          createSpecialActivationEffect(sx, sy, BLAST_ZONE_COLOUR_COLOUR, this.layers.boardLayer, 600),
        ]);
        // Show all target positions as zone overlay (persists until blast ends)
        const overlayCells = targets as Array<[number, number]>;
        if (overlayCells.length > 0) {
          void this.playAnims([
            createBlastZoneOverlay(overlayCells, this.layers.boardLayer, blastStartTime + MATCH_CLEAR_DURATION_MS, BLAST_ZONE_COLOUR_COLOUR),
          ]);
        }
      },
    });

    // ── Mark Phase: immediately convert each target to Area Bomb visual on arrival ──
    for (const { pos, arriveAt } of markSchedule) {
      tasks.push({
        time: arriveAt,
        fn: () => {
          // Immediately replace sprite with standalone Area Bomb visual (emoji style)
          const singleCellSnapshot = {
            width: pos[0] + 1,
            height: pos[1] + 1,
            cells: (() => {
              const cells: any[][] = [];
              for (let c = 0; c <= pos[0]; c++) {
                cells[c] = [];
                for (let r = 0; r <= pos[1]; r++) {
                  cells[c][r] = { gem: null, isEmpty: false, deliveryItem: false };
                }
              }
              // colour: null triggers the standalone special item path (dark circle + emoji)
              cells[pos[0]][pos[1]] = { gem: { colour: null, special: 'area' }, isEmpty: false, deliveryItem: false };
              return cells;
            })(),
          };
          this.boardRenderer.updateCell(pos[0], pos[1], singleCellSnapshot as any);
        },
      });
    }
    // Mark Phase SFX: per-target spawn sound aligned with each gem's transform.
    // Volume decays so stacked plays don't pile up; rate detunes per-index for variety.
    for (let i = 0; i < markSchedule.length; i++) {
      const vol = Math.max(0.35, 1 - i * 0.12);
      const rate = 1 + ((i % 4) - 1.5) * 0.04;
      tasks.push({
        time: markSchedule[i].arriveAt,
        fn: () => { playEvent('special.spawn.bomb', vol, rate); },
      });
    }

    // ── Brew Phase: schedule brew animations for all converted bombs ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
        playEvent('cascade.loop');
        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          void this.playAnims([
            createBrewAnimation({
              sprite: spr as any,
              duration: BREW_PHASE_DURATION_MS,
              reducedMotion,
            }),
          ]);
        }
      },
    });

    // ── Blast Phase: fire Area Bomb effects ──
    tasks.push({
      time: blastStartTime,
      fn: () => {
        for (const { pos } of markSchedule) {
          const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;
          const convertedSpr = this.boardRenderer.getSprite(pos[0], pos[1]);

          // Fire Area Bomb activation effect (3×3 charge-up + explosion)
          const [px, py] = this.cellToPixel(pos);
          const dur = getSpecialActivationDuration('area', true);

          // Show red zone overlay for the 3×3 area
          const areaCells: Array<[number, number]> = [];
          for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
              const c = pos[0] + dc;
              const r = pos[1] + dr;
              if (c >= 0 && r >= 0) {
                areaCells.push([c, r]);
              }
            }
          }
          void this.playAnims([
            createBlastZoneOverlay(areaCells, this.layers.boardLayer, MATCH_CLEAR_DURATION_MS, BLAST_ZONE_COLOUR_AREA),
          ]);

          void this.playAnims([
            createSpecialActivationEffect(px, py, gemColour ? GEM_COLOURS[gemColour] : 0xffffff, this.layers.boardLayer, dur),
          ]);

          // Shrink the converted gem with enhanced blast
          if (convertedSpr) {
            void this.playAnims([
              createEnhancedBlastAnimation({
                sprite: convertedSpr as any,
                colour: gemColour,
                particleMultiplier: BLAST_PARTICLE_MULTIPLIER,
                fxLayer: this.layers.fxLayer,
              }),
            ]);
          }

          // Particle FX
          if (gemColour) {
            const fxLevel = Math.min(chain - 1, 3);
            this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[gemColour]);
          }
        }
        // Shrink the source gem (colour gem) at blast time
        this.shrinkCell(source, null, chain);
      },
    });

    // ── Area Bomb radiation waves: fire from each target at blast time ──
    for (const { event, triggerAt } of phases.passiveSchedule) {
      tasks.push({
        time: triggerAt,
        fn: () => {
          const [ax, ay] = this.cellToPixel(event.pos);
          const dur = getSpecialActivationDuration(event.type, true);
          this.showFlavorText(event.type, [event.pos], 30);
          void this.playAnims([
            createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
          ]);
          playSpecialByKind(event.type);
        },
      });
    }

    // ── Score popup: show after blast completes ──
    const scorePopupTime = blastStartTime + MATCH_CLEAR_DURATION_MS + SCORE_POPUP_TAIL_MS;
    const totalScore = targets.length * 10 * chain;
    tasks.push({
      time: scorePopupTime,
      fn: () => {
        this.showScorePopup(totalScore, targets, chain);
      },
    });

    // ── Run the timeline ──
    const endTime = scorePopupTime + TIMELINE_TAIL_GRACE_MS;
    await this.runTimeline(tasks, endTime);
  }

  private async runTimeline(tasks: ScheduledTask[], endTime: number): Promise<void> {
    if (tasks.length === 0 && endTime <= 0) return;
    tasks.sort((a, b) => a.time - b.time);
    const start = performance.now();
    let i = 0;
    return new Promise<void>(resolve => {
      const tick = (): void => {
        const elapsed = performance.now() - start;
        while (i < tasks.length && tasks[i].time <= elapsed) {
          try { tasks[i].fn(); } catch (e) { console.error('[runTimeline] task threw:', e); }
          i++;
        }
        if (i >= tasks.length && elapsed >= endTime) {
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  private shrinkCell(pos: CellPos, colour: GemColour | null, chain: number): void {
    const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
    if (spr) {
      void this.playAnims([createMatchClearAnimation(spr as any)]);
    }
    if (colour) {
      const fxLevel = Math.min(chain - 1, 3);
      const [px, py] = this.cellToPixel(pos);
      this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[colour]);
    }
  }

  private buildColourMap(
    snapshot: { width: number; height: number; cells: { gem: { colour: GemColour | null } | null }[][] },
    extra: ClearedCellInfo[],
  ): Map<string, GemColour | null> {
    const map = new Map<string, GemColour | null>();
    for (let c = 0; c < snapshot.width; c++) {
      for (let r = 0; r < snapshot.height; r++) {
        const cell = snapshot.cells[c]?.[r];
        const col = cell?.gem?.colour ?? null;
        if (col) map.set(`${c},${r}`, col);
      }
    }
    // Fill in from clearedCells where the snapshot had no colour (e.g. spawn
    // positions). Don't overwrite a known colour with null.
    for (const e of extra) {
      if (e.colour) map.set(`${e.pos[0]},${e.pos[1]}`, e.colour);
    }
    return map;
  }

  // ─── Private: Swap Slide ────────────────────────────────

  private async playSwapSlide(from: CellPos, to: CellPos): Promise<void> {
    const spriteA = this.boardRenderer.getSprite(from[0], from[1])
      || this.boardRenderer.getDeliverySprite(from[0], from[1]);
    const spriteB = this.boardRenderer.getSprite(to[0], to[1])
      || this.boardRenderer.getDeliverySprite(to[0], to[1]);

    if (spriteA && spriteB) {
      await this.playAnims([
        createSwapAnimation({
          spriteA: spriteA as any,
          spriteB: spriteB as any,
          posA: from,
          posB: to,
        }),
      ]);
    }
  }

  // ─── Private: Gravity From Result ─────────────────────────

  private async playGravityFromResult(gravity: GravityResult): Promise<void> {
    const dropAnims: Animation[] = [];

    for (const drop of gravity.drops) {
      const { col, toRow, distance, isDelivery } = drop;
      const fromRow = toRow - distance;

      if (isDelivery) {
        const spr = this.boardRenderer.getDeliverySprite(col, toRow);
        if (spr && distance > 0) {
          spr.position.set(col * CELL_SIZE + CELL_SIZE / 2, fromRow * CELL_SIZE + CELL_SIZE / 2);
          dropAnims.push(createCascadeDropAnimation({ sprite: spr as any, fromRow, toRow, col }));
        }
      } else {
        const spr = this.boardRenderer.getSprite(col, toRow);
        if (spr && distance > 0) {
          spr.position.set(col * CELL_SIZE + CELL_SIZE / 2, fromRow * CELL_SIZE + CELL_SIZE / 2);
          dropAnims.push(createCascadeDropAnimation({ sprite: spr as any, fromRow, toRow, col }));
        }
      }
    }

    if (dropAnims.length > 0) {
      await this.playAnims(dropAnims);
    } else {
      await this.wait(GRAVITY_WAIT_MS);
    }

    // Delivery collected popups
    for (const { pos } of gravity.deliveryCollected) {
      const [dc, dr] = pos;
      const popup = createScorePopup({
        text: '+1 送達',
        x: dc * CELL_SIZE + CELL_SIZE / 2,
        y: dr * CELL_SIZE + CELL_SIZE / 2,
        colour: 0xf6c453,
        fontSize: 24,
        floatDistance: 60,
        duration: 900,
      });
      this.layers.boardLayer.addChild(popup.container);
    }
  }

  // ─── Private: Score Popup ───────────────────────────────

  private showScorePopup(score: number, cells: CellPos[], chain: number): void {
    if (score <= 0 || cells.length === 0) return;

    const avgCol = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const avgRow = cells.reduce((s, c) => s + c[1], 0) / cells.length;

    const popup = createScorePopup({
      text: `+${score}`,
      x: avgCol * CELL_SIZE + CELL_SIZE / 2,
      y: avgRow * CELL_SIZE + CELL_SIZE / 2,
      colour: chain >= 3 ? 0xff6644 : 0xf6c453,
      fontSize: chain >= 2 ? 28 : 22,
    });
    this.layers.boardLayer.addChild(popup.container);
  }

  // ─── Private: Flavor Text ──────────────────────────────

  private static readonly SPECIAL_FLAVOR: Record<string, { text: string; colour: number }> = {
    lineH: { text: 'LINE BLAST!', colour: 0x44ddff },
    lineV: { text: 'LINE BLAST!', colour: 0x44ddff },
    area: { text: 'AREA BOMB!', colour: 0xff9944 },
    colour: { text: 'COLOR BURST!', colour: 0xff44ff },
    combo: { text: 'MEGA COMBO!', colour: 0xffd54a },
  };

  private showFlavorText(
    kind: string,
    cells: CellPos[],
    fontSize = 36,
  ): void {
    const flavor = BoardAnimator.SPECIAL_FLAVOR[kind];
    if (!flavor || cells.length === 0) return;

    const avgCol = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const avgRow = cells.reduce((s, c) => s + c[1], 0) / cells.length;

    const popup = createScorePopup({
      text: flavor.text,
      x: avgCol * CELL_SIZE + CELL_SIZE / 2,
      y: avgRow * CELL_SIZE + CELL_SIZE / 2 + -1.4 * CELL_SIZE,
      colour: flavor.colour,
      fontSize,
      floatDistance: 80,
      duration: 1100,
    });
    this.layers.boardLayer.addChild(popup.container);
  }

  private showComboChainText(chain: number, cells: CellPos[]): void {
    if (chain < 2 || cells.length === 0) return;

    const fontSize = Math.min(14 + chain * 4, 42);
    const colour =
      chain >= 5 ? 0xff2244
        : chain >= 4 ? 0xff5533
          : chain >= 3 ? 0xff8844
            : 0xffbb44;

    const avgCol = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const avgRow = cells.reduce((s, c) => s + c[1], 0) / cells.length;

    const popup = createScorePopup({
      text: `COMBO ×${chain}`,
      x: avgCol * CELL_SIZE + CELL_SIZE / 2,
      y: avgRow * CELL_SIZE + CELL_SIZE / 2 + -1.0 * CELL_SIZE,
      colour,
      fontSize,
      floatDistance: 80,
      duration: 1100,
    });
    this.layers.boardLayer.addChild(popup.container);
  }

  // ─── Private: Utilities ─────────────────────────────────

  private cellToPixel(pos: CellPos): [number, number] {
    return [
      pos[0] * CELL_SIZE + CELL_SIZE / 2,
      pos[1] * CELL_SIZE + CELL_SIZE / 2,
    ];
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Play a set of animations in parallel, resolving when all complete.
   * Includes a stall timeout to prevent infinite hangs.
   */
  private playAnims(anims: Animation[]): Promise<void> {
    if (anims.length === 0) return Promise.resolve();

    return new Promise<void>(resolve => {
      let last = performance.now();
      let totalElapsed = 0;

      const tick = (now: number) => {
        const dt = now - last;
        last = now;
        totalElapsed += dt;

        let allDone = true;
        for (const a of anims) {
          try {
            if (!a.update(dt)) allDone = false;
          } catch (err) {
            console.error('[BoardAnimator.playAnims] animation update threw:', err);
          }
        }

        if (allDone || totalElapsed > STALL_TIMEOUT_MS) {
          for (const a of anims) {
            try { a.complete(); } catch (err) {
              console.error('[BoardAnimator.playAnims] complete threw:', err);
            }
          }
          resolve();
        } else {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    });
  }
}
