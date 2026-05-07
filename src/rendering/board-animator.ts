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
} from './animations';
import {
  CELL_SIZE,
  GEM_COLOURS,
  MATCH_CLEAR_DURATION_MS,
  getSpecialActivationDuration,
} from './design-tokens';
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
const CELL_RADIATION_SPEED_MS = 30;
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

    const scheduleEvent = (event: RadiationEvent, startTime: number): void => {
      const ek = `${event.pos[0]},${event.pos[1]}`;
      if (scheduledEvents.has(ek)) return;
      scheduledEvents.add(ek);

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
