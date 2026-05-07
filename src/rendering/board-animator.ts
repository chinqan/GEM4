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
import { CELL_SIZE, GEM_COLOURS, getSpecialActivationDuration } from './design-tokens';
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

    // Handle initial activation (combo/colour/directBomb)
    if (result.initialActivation) {
      const { type, pos, clearedCells, score, passiveActivations, gravity } = result.initialActivation;

      if (type === 'combo') {
        playCombo();
      }

      // Play activation effect
      const kind = type as SpecialActivationKind;
      const dur = getSpecialActivationDuration(kind, false);
      const [cx, cy] = this.cellToPixel(pos);

      this.showFlavorText(kind, [pos]);

      await this.playAnims([
        createSpecialActivationEffect(cx, cy, 0xffffff, this.layers.boardLayer, dur),
        createBlastZoneOverlay(
          clearedCells.map(c => c.pos),
          this.layers.boardLayer,
          dur,
        ),
      ]);

      // SFX
      playMatchSfx(clearedCells.length, 1);

      // Clear animations + particles
      await this.playClearSequence(clearedCells, 1);

      // Score popup
      this.showScorePopup(score, clearedCells.map(c => c.pos), 1);

      // Passive activations
      await this.playPassiveActivations(passiveActivations, 1);

      // Sync renderer from snapshot after initial activation
      this.boardRenderer.syncFromSnapshot(result.initialActivation.boardSnapshot);

      // Gravity animation using the actual gravity result
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

    // Activation effect
    const dur = getSpecialActivationDuration(type, false);
    const [cx, cy] = this.cellToPixel(pos);

    await this.playAnims([
      createSpecialActivationEffect(cx, cy, 0xffffff, this.layers.boardLayer, dur),
      createBlastZoneOverlay(
        clearedCells.map(c => c.pos),
        this.layers.boardLayer,
        dur,
      ),
    ]);

    // SFX
    playMatchSfx(clearedCells.length, 1);

    // Clear animations + particles
    await this.playClearSequence(clearedCells, 1);

    // Score popup
    this.showScorePopup(score, clearedCells.map(c => c.pos), 1);

    // Passive activations
    await this.playPassiveActivations(passiveActivations, 1);

    // Sync from snapshot after activation clears
    this.boardRenderer.syncFromSnapshot(result.boardSnapshot);

    // Gravity animation using the actual gravity result
    await this.playGravityFromResult(gravity, board);

    // Cascade steps
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
      // Sync to pre-clear state: shows gems in correct positions with correct colors
      // (includes newly spawned specials, but before any clears happen)
      this.boardRenderer.syncFromSnapshot(step.preClearSnapshot);

      // Match SFX
      playMatchSfx(step.clearedCells.length, step.chain);

      // Clear animations
      await this.playClearSequence(step.clearedCells, step.chain);

      // Score popup
      this.showScorePopup(step.score, step.clearedCells.map(c => c.pos), step.chain);

      // Chain combo text
      this.showComboChainText(step.chain, step.clearedCells.map(c => c.pos));

      // In-match special activations
      for (const activation of step.specialActivations) {
        const dur = getSpecialActivationDuration(activation.type, true);
        const [ax, ay] = this.cellToPixel(activation.pos);

        this.showFlavorText(activation.type, [activation.pos], 30);

        await this.playAnims([
          createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
          createBlastZoneOverlay(activation.clearedCells, this.layers.boardLayer, dur),
        ]);

        playMatchSfx(activation.clearedCells.length, step.chain);
        this.showScorePopup(activation.score, activation.clearedCells, step.chain);
      }

      // Passive activations
      await this.playPassiveActivations(step.passiveActivations, step.chain);

      // Now sync to post-gravity snapshot (creates new gems at final positions)
      this.boardRenderer.syncFromSnapshot(step.boardSnapshot);

      // Gravity drop animation (moves new/fallen gems from fromRow to toRow)
      await this.playGravityFromResult(step.gravity, board);
    }
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

  // ─── Private: Clear Sequence ────────────────────────────

  private async playClearSequence(cells: ClearedCellInfo[], chain: number): Promise<void> {
    const anims: Animation[] = [];

    for (const { pos, colour } of cells) {
      const [c, r] = pos;
      const spr = this.boardRenderer.getSprite(c, r);
      if (spr) {
        anims.push(createMatchClearAnimation(spr as any));
      }

      // Spawn particles
      if (colour) {
        const fxLevel = Math.min(chain - 1, 3);
        const [px, py] = this.cellToPixel(pos);
        this.mergeFx.spawn(px, py, fxLevel, GEM_COLOURS[colour]);
      }
    }

    await this.playAnims(anims);
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

  // ─── Private: Passive Activations ───────────────────────

  private async playPassiveActivations(
    events: SpecialActivationEvent[],
    chain: number,
  ): Promise<void> {
    if (events.length === 0) return;

    for (const event of events) {
      const dur = getSpecialActivationDuration(event.type, true);
      const [ax, ay] = this.cellToPixel(event.pos);

      this.showFlavorText(event.type, [event.pos], 30);

      await this.playAnims([
        createSpecialActivationEffect(ax, ay, 0xffffff, this.layers.boardLayer, dur),
        createBlastZoneOverlay(event.clearedCells, this.layers.boardLayer, dur),
      ]);

      playMatchSfx(event.clearedCells.length, chain);

      if (event.score > 0) {
        this.showScorePopup(event.score, event.clearedCells, chain);
      }
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
