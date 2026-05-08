// ─── Board Animator ─────────────────────────────────────────
// Consumes structured results from GameSessionController and
// orchestrates all board animations: swap, clear, cascade drop,
// special activation effects, particles, and score popups.
//
// This module decouples animation orchestration from game logic,
// making both independently testable.

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
} from '../game/runtime/game-session';
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
} from './animations';
import {
  CELL_SIZE,
  GEM_COLOURS,
  MATCH_CLEAR_DURATION_MS,
  BREW_PHASE_DURATION_MS,
  BLAST_PARTICLE_MULTIPLIER,
  getSpecialActivationDuration,
} from './design-tokens';
import { computeStagedPhases } from './staged-blast';
import { detectPrefersReducedMotion } from './accessibility';
import { MergeParticleSystem } from './particles';
import { createScorePopup } from '../ui/juice/score-popup';
import {
  playMatchSfx,
  playSwap,
  playInvalid,
  playCombo,
  playLevelComplete,
  playLevelFail,
} from '../audio/synth-sfx';

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
// Lightning-like outward radiation from each special's centre. Each cell's
// match-clear fires when the wave reaches it: arriveAt = startTime +
// chebyshev(source, cell) * CELL_RADIATION_SPEED_MS.
const CELL_RADIATION_SPEED_MS = 20;
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
const AREA_BOMB_CHARGE_MS = 350;

// A normalised activation event used by the radiation scheduler. Matches
// SpecialActivationEvent shape but allows 'combo' for the swap initial path.
interface RadiationEvent {
  pos: CellPos;
  type: SpecialActivationKind;
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

  constructor(config: BoardAnimatorConfig) {
    this.boardRenderer = config.boardRenderer;
    this.layers = config.layers;
    this.mergeFx = new MergeParticleSystem(config.layers.boardLayer, config.renderer);
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
      // Invalid swap: play swap animation then revert
      await this.playSwapSlide(from, to);
      playInvalid();
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
        playCombo();
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

        this.boardRenderer.syncFromSnapshot(result.initialActivation.boardSnapshot);
        await this.playGravityFromResult(gravity, board);

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

        this.boardRenderer.syncFromSnapshot(result.initialActivation.boardSnapshot);
        await this.playGravityFromResult(gravity, board);

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

        this.boardRenderer.syncFromSnapshot(result.initialActivation.boardSnapshot);
        await this.playGravityFromResult(gravity, board);
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

        const root: RadiationEvent = {
          pos,
          type: type as SpecialActivationKind,
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
        );

        this.boardRenderer.syncFromSnapshot(result.initialActivation.boardSnapshot);
        await this.playGravityFromResult(gravity, board);
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
    );

    this.boardRenderer.syncFromSnapshot(result.boardSnapshot);
    await this.playGravityFromResult(gravity, board);
    await this.animateCascadeSteps(cascadeSteps, board);
  }

  // ─── Public: Update (per-frame) ───────────────────────────

  /**
   * Call each frame to update particle systems.
   */
  update(dtMs: number): void {
    this.mergeFx.update(dtMs);
  }

  // ─── Public: Cleanup ──────────────────────────────────────

  destroy(): void {
    this.mergeFx.destroy();
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
      const pureMatchCells = step.clearedCells.filter(
        c => !allActivationCells.has(`${c.pos[0]},${c.pos[1]}`),
      );

      const colourByPos = this.buildColourMap(step.preClearSnapshot, step.clearedCells);

      if (pureMatchCells.length > 0) {
        playMatchSfx(pureMatchCells.length, step.chain);
      }
      this.showScorePopup(step.score, step.clearedCells.map(c => c.pos), step.chain);
      this.showComboChainText(step.chain, step.clearedCells.map(c => c.pos));

      await this.playRadiationTimeline(
        step.specialActivations.map(this.toRadiationEvent),
        step.passiveActivations.map(this.toRadiationEvent),
        pureMatchCells,
        colourByPos,
        step.chain,
      );

      this.boardRenderer.syncFromSnapshot(step.boardSnapshot);
      await this.playGravityFromResult(step.gravity, board);
    }
  }

  // ─── Private: Radiation Timeline ────────────────────────────

  private toRadiationEvent = (e: SpecialActivationEvent): RadiationEvent => ({
    pos: e.pos,
    type: e.type as SpecialActivationKind,
    clearedCells: e.clearedCells,
    score: e.score,
  });

  private chebyshev(a: CellPos, b: CellPos): number {
    return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  }

  private async playRadiationTimeline(
    rootEvents: RadiationEvent[],
    passiveEvents: RadiationEvent[],
    pureMatchCells: ClearedCellInfo[],
    colourByPos: Map<string, GemColour | null>,
    chain: number,
  ): Promise<void> {
    const eventByPos = new Map<string, RadiationEvent>();
    for (const e of rootEvents) eventByPos.set(`${e.pos[0]},${e.pos[1]}`, e);
    for (const e of passiveEvents) eventByPos.set(`${e.pos[0]},${e.pos[1]}`, e);

    const animatedClears = new Set<string>();
    const scheduledEvents = new Set<string>();
    const tasks: ScheduledTask[] = [];
    let endTime = MATCH_CLEAR_DURATION_MS;

    // Pure-match cells clear immediately at T+0
    for (const c of pureMatchCells) {
      const k = `${c.pos[0]},${c.pos[1]}`;
      if (animatedClears.has(k)) continue;
      animatedClears.add(k);
      tasks.push({ time: 0, fn: () => this.shrinkCell(c.pos, c.colour, chain) });
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
      const isArea = event.type === 'area';
      const chargeTime = isArea ? AREA_BOMB_CHARGE_MS : 0;

      if (isArea) {
        // Show red overlay on affected cells during charge-up
        const allCells: CellPos[] = [event.pos, ...event.clearedCells];
        tasks.push({
          time: startTime,
          fn: () => {
            void this.playAnims([
              createBlastZoneOverlay(
                allCells as Array<[number, number]>,
                this.layers.boardLayer,
                chargeTime,
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
          playMatchSfx(event.clearedCells.length, chain);
        },
      });

      // Wave radiates outward — schedule each cell's clear at chebyshev * speed.
      let waveEnd = startTime + chargeTime;
      const allCells: CellPos[] = [event.pos, ...event.clearedCells];
      for (const cell of allCells) {
        const ck = `${cell[0]},${cell[1]}`;
        const dist = this.chebyshev(event.pos, cell);
        const arriveAt = startTime + chargeTime + dist * CELL_RADIATION_SPEED_MS;
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

    // ── Brew Phase: schedule brew animations for all marked gems ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
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
          playMatchSfx(event.clearedCells.length, chain);
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

    // ── Brew Phase: schedule brew animations for all marked gems ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
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

    // ── Blast Phase: convert each target to Line Bomb visual and fire radiation ──
    tasks.push({
      time: blastStartTime,
      fn: () => {
        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;

          // Enhanced blast animation (line bomb conversion + explosion)
          void this.playAnims([
            createEnhancedBlastAnimation({
              sprite: spr as any,
              colour: gemColour,
              particleMultiplier: BLAST_PARTICLE_MULTIPLIER,
              fxLayer: this.layers.fxLayer,
            }),
          ]);

          // Particle FX
          if (gemColour) {
            const [px, py] = this.cellToPixel(pos);
            const fxLevel = Math.min(chain - 1, 3);
            this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[gemColour]);
          }
        }
        // Shrink the source gem (colour gem) at blast time
        this.shrinkCell(source, null, chain);
      },
    });

    // ── Line Bomb radiation waves: fire from each target at blast time ──
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
          playMatchSfx(event.clearedCells.length, chain);
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

    // ── Brew Phase: schedule brew animations for all marked gems ──
    tasks.push({
      time: phases.brewStartTime,
      fn: () => {
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

    // ── Blast Phase: convert each target to Area Bomb visual and fire radiation ──
    tasks.push({
      time: blastStartTime,
      fn: () => {
        for (const { pos } of markSchedule) {
          const spr = this.boardRenderer.getSprite(pos[0], pos[1]);
          if (!spr) continue;
          const gemColour = colourByPos.get(`${pos[0]},${pos[1]}`) ?? null;

          // Enhanced blast animation (area bomb conversion + explosion)
          void this.playAnims([
            createEnhancedBlastAnimation({
              sprite: spr as any,
              colour: gemColour,
              particleMultiplier: BLAST_PARTICLE_MULTIPLIER,
              fxLayer: this.layers.fxLayer,
            }),
          ]);

          // Particle FX
          if (gemColour) {
            const [px, py] = this.cellToPixel(pos);
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
          playMatchSfx(event.clearedCells.length, chain);
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

  private async playGravityFromResult(gravity: GravityResult, board: Board): Promise<void> {
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
