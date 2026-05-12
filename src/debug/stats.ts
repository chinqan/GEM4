// ─── Stats.js Integration ───────────────────────────────────
// FPS/MS/MB monitor toggled via Cmd+Shift+S (Mac) or Ctrl+Shift+S.
// Only active when __ENABLE_DEVTOOLS__ is 'true'.

// ─── Types ──────────────────────────────────────────────────

/** Stats panel interface */
export interface StatsPanel {
  /** Call at the start of each frame */
  begin(): void;
  /** Call at the end of each frame */
  end(): void;
  /** Show/hide the stats panel */
  setVisible(visible: boolean): void;
  /** Destroy the panel and clean up */
  destroy(): void;
}

// ─── Stats.js Panel ─────────────────────────────────────────

/**
 * Create a Stats.js performance monitor.
 *
 * Lazily imports stats.js to avoid bundling in production.
 * Toggles visibility with Cmd+Shift+S / Ctrl+Shift+S.
 *
 * @returns StatsPanel or null if devtools are disabled
 */
export async function createStatsPanel(): Promise<StatsPanel | null> {
  let StatsModule: any;
  try {
    StatsModule = await import('stats.js');
  } catch {
    console.warn('[Debug] stats.js not available');
    return null;
  }

  // stats.js default export varies by bundler
  const StatsConstructor = StatsModule.default ?? StatsModule;
  const stats = new StatsConstructor();

  // Style the panel
  const dom = stats.dom as HTMLElement;
  dom.style.position = 'fixed';
  dom.style.top = '0';
  dom.style.left = '0';
  dom.style.zIndex = '10000';

  let visible = false;

  // Keyboard toggle: Cmd+Shift+S (Mac) or Ctrl+Shift+S
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      visible = !visible;
      dom.style.display = visible ? 'block' : 'none';
    }
  };

  document.addEventListener('keydown', onKeyDown);

  // Initially hidden
  dom.style.display = 'none';
  document.body.appendChild(dom);

  return {
    begin(): void {
      stats.begin();
    },

    end(): void {
      stats.end();
    },

    setVisible(show: boolean): void {
      visible = show;
      dom.style.display = visible ? 'block' : 'none';
    },

    destroy(): void {
      document.removeEventListener('keydown', onKeyDown);
      dom.remove();
    },
  };
}

// ─── Clock Scale Control ────────────────────────────────────

/**
 * Clock scale controller for debug time manipulation.
 *
 * Supports:
 * - Normal speed (1.0)
 * - Slow motion (0.25, 0.5)
 * - Pause (0.0)
 * - Frame stepping (advance one tick at a time)
 */
export class ClockScaleController {
  private _scale = 1.0;
  private _frameStepping = false;
  private _pendingSteps = 0;

  /** Current time scale (0 = paused, 1 = normal) */
  get scale(): number {
    if (this._frameStepping) {
      if (this._pendingSteps > 0) {
        this._pendingSteps--;
        return 1.0; // Run one frame at normal speed
      }
      return 0; // Paused between steps
    }
    return this._scale;
  }

  /** Set time scale */
  setScale(value: number): void {
    this._scale = Math.max(0, Math.min(4, value));
    this._frameStepping = false;
  }

  /** Enable frame-stepping mode */
  enableFrameStepping(): void {
    this._frameStepping = true;
    this._pendingSteps = 0;
  }

  /** Disable frame-stepping mode */
  disableFrameStepping(): void {
    this._frameStepping = false;
  }

  /** Queue one frame step (only in frame-stepping mode) */
  stepFrame(): void {
    if (this._frameStepping) {
      this._pendingSteps++;
    }
  }

  /** Whether frame-stepping is active */
  get isFrameStepping(): boolean {
    return this._frameStepping;
  }
}

// ─── Draw Call Counter ──────────────────────────────────────

/**
 * Read the current draw call count from the PixiJS 8 renderer internals.
 *
 * In PixiJS 8, the BatcherPipe at `renderer.renderPipes.batch` holds a
 * `_batchersByInstructionSet` map. Each batcher's `batchIndex` is the
 * number of batches (≈ draw calls) it produced in the last frame.
 *
 * We sum across all active batchers to get the total draw call count.
 *
 * @returns Draw call count, or -1 if unavailable.
 */
export function getDrawCallCount(renderer: any): number {
  // PixiJS 8.x: BatcherPipe._batchersByInstructionSet → { [uid]: { [name]: Batcher } }
  const batcherPipe = renderer?.renderPipes?.batch;
  if (!batcherPipe) return -1;

  const byInstructionSet = batcherPipe._batchersByInstructionSet;
  if (!byInstructionSet) return -1;

  let total = 0;
  for (const uid in byInstructionSet) {
    const batchers = byInstructionSet[uid];
    for (const name in batchers) {
      const batcher = batchers[name];
      if (typeof batcher?.batchIndex === 'number') {
        total += batcher.batchIndex;
      }
    }
  }

  return total > 0 ? total : -1;
}

// ─── Declare global for Vite define ─────────────────────────

declare const __ENABLE_DEVTOOLS__: string;
