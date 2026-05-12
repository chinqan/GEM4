// ─── Tweakpane Debug Panel ───────────────────────────────────
// Dev-only debug panel showing FPS, draw calls, particle count,
// AppState, intensity, and clock scale controls.
//
// Only instantiated when __ENABLE_DEVTOOLS__ is 'true'.

import type { AppStateKind } from '../state/app-state';

// ─── Types ──────────────────────────────────────────────────

/** Observable debug metrics updated each frame */
export interface DebugMetrics {
  fps: number;
  drawCalls: number;
  particleCount: number;
  appState: AppStateKind;
  intensity: number;
  chainCount: number;
  score: number;
  movesRemaining: number;
  clockScale: number;
}

/** Clock scale control for slow-mo / pause / frame-step */
export interface ClockControl {
  /** Current time scale (0 = paused, 0.25 = slow-mo, 1 = normal) */
  scale: number;
  /** Whether frame-stepping mode is active */
  frameStepping: boolean;
  /** Advance one frame (only in frame-stepping mode) */
  stepFrame: () => void;
}

/** Tweakpane panel interface (dev-only) */
export interface DebugPanel {
  /** Update metrics displayed in the panel */
  updateMetrics(metrics: Partial<DebugMetrics>): void;
  /** Get current clock control state */
  getClockControl(): ClockControl;
  /** Show/hide the panel */
  setVisible(visible: boolean): void;
  /** Destroy the panel and clean up DOM */
  destroy(): void;
}

// ─── Default Metrics ────────────────────────────────────────

function createDefaultMetrics(): DebugMetrics {
  return {
    fps: 60,
    drawCalls: 0,
    particleCount: 0,
    appState: 'splash',
    intensity: 0,
    chainCount: 0,
    score: 0,
    movesRemaining: 0,
    clockScale: 1,
  };
}

// ─── Tweakpane Panel Implementation ─────────────────────────

/**
 * Create the Tweakpane debug panel.
 *
 * Lazily imports Tweakpane to avoid bundling in production.
 * Returns null if Tweakpane is not available or devtools are disabled.
 */
export async function createDebugPanel(): Promise<DebugPanel | null> {
  let pane: any;
  try {
    const mod = await import('tweakpane');
    const PaneClass = mod.Pane;
    pane = new PaneClass({ title: 'Gem Debug', expanded: true });
    // 釘到右下角（蓋掉 tweakpane 預設的 top-right）
    const el = pane.element as HTMLElement | undefined;
    if (el) {
      el.style.position = 'fixed';
      el.style.right = '8px';
      el.style.bottom = '8px';
      el.style.top = 'auto';
      el.style.left = 'auto';
    }
  } catch {
    console.warn('[Debug] Tweakpane not available');
    return null;
  }

  const metrics = createDefaultMetrics();

  // ─── Performance folder ─────────────────────────────────
  const perfFolder = pane.addFolder({ title: 'Performance', expanded: true });
  perfFolder.addBinding(metrics, 'fps', { readonly: true, label: 'FPS' });
  perfFolder.addBinding(metrics, 'drawCalls', { readonly: true, label: 'Draw Calls' });
  perfFolder.addBinding(metrics, 'particleCount', { readonly: true, label: 'Particles' });

  // ─── Game State folder ──────────────────────────────────
  const stateFolder = pane.addFolder({ title: 'Game State', expanded: true });
  stateFolder.addBinding(metrics, 'appState', { readonly: true, label: 'State' });
  stateFolder.addBinding(metrics, 'intensity', {
    readonly: true,
    label: 'Intensity',
    min: 0,
    max: 1,
  });
  stateFolder.addBinding(metrics, 'chainCount', { readonly: true, label: 'Chain' });
  stateFolder.addBinding(metrics, 'score', { readonly: true, label: 'Score' });
  stateFolder.addBinding(metrics, 'movesRemaining', { readonly: true, label: 'Moves' });

  // ─── Clock Control folder ───────────────────────────────
  const clockFolder = pane.addFolder({ title: 'Clock Control', expanded: false });
  const clockControl: ClockControl = {
    scale: 1,
    frameStepping: false,
    stepFrame: () => {
      /* overridden by consumer */
    },
  };

  clockFolder
    .addBinding(metrics, 'clockScale', {
      label: 'Time Scale',
      min: 0,
      max: 2,
      step: 0.25,
    })
    .on('change', (ev: any) => {
      clockControl.scale = ev.value;
    });

  clockFolder.addButton({ title: 'Step Frame' }).on('click', () => {
    clockControl.stepFrame();
  });

  // ─── Panel API ──────────────────────────────────────────

  return {
    updateMetrics(partial: Partial<DebugMetrics>): void {
      Object.assign(metrics, partial);
      pane.refresh();
    },

    getClockControl(): ClockControl {
      return clockControl;
    },

    setVisible(visible: boolean): void {
      pane.hidden = !visible;
    },

    destroy(): void {
      pane.dispose();
    },
  };
}

// ─── Declare global for Vite define ─────────────────────────

declare const __ENABLE_DEVTOOLS__: string;
