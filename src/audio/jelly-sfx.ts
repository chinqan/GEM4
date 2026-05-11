// ─── Jelly Blocker SFX (synthesized) ────────────────────────
// Web Audio API oscillator-based sounds for jelly blockers.
// Frequency centers match spec §3.9: l3=180-250Hz / l2=280-380Hz / clear=450-700Hz
// Used as synthesis fallback until commissioned WAV files are delivered.

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) _ctx = new (window.AudioContext ?? (window as any).webkitAudioContext)();
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

/**
 * 嘗試移動果凍格被阻擋的黏稠阻力音。
 * 比 swap.invalid 更軟更黏：緩慢 attack，無剛性彈回聲。
 */
export function playBlockerImmovable(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g).connect(ctx.destination);
  o.type = 'triangle';
  o.frequency.setValueAtTime(165, now);
  o.frequency.exponentialRampToValueAtTime(135, now + 0.14);
  // Soft attack (no sharp transient)
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.16, now + 0.025);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
  o.start(now);
  o.stop(now + 0.20);
}

/**
 * 果凍格命中 / 消除合成音。頻率全程維持在規格範圍內。
 * @param fromLayer 命中前的層數 — 3 → l3音(180-250Hz)、2 → l2音(280-380Hz)、1 → clear音(450-700Hz)
 */
export function playJellyHit(fromLayer: 3 | 2 | 1): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (fromLayer === 3) {
    // Layer 3→2：厚重悶響，頻率中心 180-250 Hz
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(ctx.destination);
    o.type = 'triangle';
    o.frequency.setValueAtTime(245, now);
    o.frequency.exponentialRampToValueAtTime(188, now + 0.24); // stays 180-250 Hz
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    o.start(now);
    o.stop(now + 0.28);

  } else if (fromLayer === 2) {
    // Layer 2→1：緊繃彈性，頻率中心 280-380 Hz
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(ctx.destination);
    o.type = 'triangle';
    o.frequency.setValueAtTime(375, now);
    o.frequency.exponentialRampToValueAtTime(292, now + 0.18); // stays 280-380 Hz
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    o.start(now);
    o.stop(now + 0.22);

  } else {
    // Layer 1→0 (clear)：明亮上升「啵！」，頻率 450-700 Hz
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.connect(g1).connect(ctx.destination);
    o1.type = 'sine';
    o1.frequency.setValueAtTime(480, now);
    o1.frequency.exponentialRampToValueAtTime(690, now + 0.13); // ascending, 450-700 Hz
    g1.gain.setValueAtTime(0.28, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    o1.start(now);
    o1.stop(now + 0.24);

    // 泛音加強光感
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2).connect(ctx.destination);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(960, now);
    o2.frequency.exponentialRampToValueAtTime(1380, now + 0.10);
    g2.gain.setValueAtTime(0.10, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    o2.start(now);
    o2.stop(now + 0.16);
  }
}
