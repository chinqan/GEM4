// ─── 應用程式進入點 ─────────────────────────────────────────
// Bootstrap the game and handle fatal errors gracefully.

import { createGame } from './integration/game-integration';
import { playStone, preloadStoneSfx } from './audio/sfx-player';
import { preloadGemTextures } from './rendering/gem-sprites';

function createSfxTestPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'sfx-test-panel';
  panel.style.cssText =
    'position:fixed;left:8px;top:50%;transform:translateY(-50%);z-index:9999;' +
    'display:flex;flex-direction:column;gap:6px;pointer-events:auto;';

  const title = document.createElement('div');
  title.textContent = 'SFX Test';
  title.style.cssText =
    'color:#fff;font:bold 11px monospace;text-align:center;opacity:0.7;';
  panel.appendChild(title);

  for (let chain = 1; chain <= 7; chain++) {
    const base = Math.min(chain * 2 - 1, 9);
    const level = Math.min(base + 0, 10); // count=3, bonus=0
    const btn = document.createElement('button');
    btn.textContent = `C${chain}`;
    btn.title = `combo ${chain} · level ${level}`;
    btn.style.cssText =
      'width:44px;height:32px;border:1px solid rgba(255,255,255,0.25);border-radius:6px;' +
      'background:rgba(255,255,255,0.08);color:#fff;font:bold 12px monospace;cursor:pointer;' +
      'transition:background 0.1s;';
    btn.addEventListener('pointerenter', () => { btn.style.background = 'rgba(255,255,255,0.2)'; });
    btn.addEventListener('pointerleave', () => { btn.style.background = 'rgba(255,255,255,0.08)'; });
    btn.addEventListener('pointerdown', () => {
      playStone(level);
    });
    panel.appendChild(btn);
  }

  document.body.appendChild(panel);
}

async function main(): Promise<void> {
  try {
    console.log('Gem v1 — 啟動中...');
    await preloadGemTextures();
    const game = await createGame(document.body);
    console.log(`Gem v1 — 啟動完成 (phase: ${game.getPhase()})`);

    // 建立音效測試面板
    createSfxTestPanel();

    // 預渲染石頭音效（需要使用者互動後才能建立 AudioContext）
    document.addEventListener('pointerdown', () => { preloadStoneSfx(); }, { once: true });

    // Expose to console for debugging in dev mode
    (window as any).__gem = game;
  } catch (err) {
    console.error('Gem v1 — 啟動失敗:', err);

    // Show a minimal error message in the DOM
    const msg = document.createElement('div');
    msg.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
      'background:#0a0a1a;color:#ef5350;font-family:monospace;font-size:16px;padding:32px;text-align:center;';
    msg.textContent = `啟動失敗: ${err instanceof Error ? err.message : String(err)}`;
    document.body.appendChild(msg);
  }
}

main();
