// ─── Staged Blast Timeline ──────────────────────────────────
// Pure function module for computing the three-phase timeline
// (Mark → Brew → Blast) used by Color Gem staged explosions.
//
// This module is intentionally free of side effects and PixiJS
// dependencies so it can be unit-tested and property-tested in
// isolation.

import type { CellPos } from '../types';
import type { SpecialActivationKind } from './design-tokens';
import { BREW_PHASE_DURATION_MS } from './design-tokens';

// ─── Constants ──────────────────────────────────────────────

/**
 * Radiation wave speed: milliseconds per Chebyshev-distance unit.
 * Mirrors the value in board-animator.ts so the pure function can
 * compute arrival times without depending on the animator module.
 */
export const CELL_RADIATION_SPEED_MS = 20;

// ─── Types ──────────────────────────────────────────────────

/** Minimal radiation event shape used for passive trigger scheduling. */
export interface RadiationEvent {
  pos: CellPos;
  type: SpecialActivationKind;
  clearedCells: CellPos[];
  score: number;
}

/** Output of the staged timeline computation. */
export interface StagedTimelinePhases {
  /** Mark phase: per-target arrival times sorted by distance. */
  markSchedule: Array<{ pos: CellPos; arriveAt: number }>;
  /** Mark phase end time = max(arriveAt) across all targets. */
  markEndTime: number;
  /** Brew phase start time (= markEndTime). */
  brewStartTime: number;
  /** Brew phase end time (= brewStartTime + BREW_PHASE_DURATION_MS). */
  brewEndTime: number;
  /** Blast phase start time (= brewEndTime). */
  blastStartTime: number;
  /** Passive trigger schedule starting from blastStartTime. */
  passiveSchedule: Array<{ event: RadiationEvent; triggerAt: number }>;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Chebyshev (chessboard) distance between two cell positions.
 * CellPos is [col, row].
 */
export function chebyshev(a: CellPos, b: CellPos): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

// ─── Main Function ──────────────────────────────────────────

/**
 * Compute the three-phase timeline for a Color Gem staged blast.
 *
 * Given the source position, target cells, and any passive radiation
 * events (special gems that trigger on blast), returns a fully
 * computed schedule with no gaps or overlaps between phases.
 *
 * @param source  - The Color Gem's cell position [col, row].
 * @param targets - All target gem positions to be marked and blasted.
 * @param passiveEvents - Radiation events triggered passively at blast time.
 * @returns A {@link StagedTimelinePhases} object describing the full timeline.
 */
export function computeStagedPhases(
  source: CellPos,
  targets: CellPos[],
  passiveEvents: RadiationEvent[],
): StagedTimelinePhases {
  // Compute mark arrival time for each target based on Chebyshev distance.
  const markSchedule = targets.map((pos) => ({
    pos,
    arriveAt: chebyshev(source, pos) * CELL_RADIATION_SPEED_MS,
  }));

  // Mark phase ends when the farthest target is reached.
  // If there are no targets, all times collapse to 0.
  const markEndTime =
    markSchedule.length > 0
      ? Math.max(...markSchedule.map((entry) => entry.arriveAt))
      : 0;

  // Brew phase immediately follows mark phase.
  const brewStartTime = markEndTime;
  const brewEndTime = brewStartTime + BREW_PHASE_DURATION_MS;

  // Blast phase immediately follows brew phase.
  const blastStartTime = brewEndTime;

  // Passive triggers fire at blastStartTime (all simultaneously).
  const passiveSchedule = passiveEvents.map((event) => ({
    event,
    triggerAt: blastStartTime,
  }));

  return {
    markSchedule,
    markEndTime,
    brewStartTime,
    brewEndTime,
    blastStartTime,
    passiveSchedule,
  };
}
