// ─── 應用程式進入點 ─────────────────────────────────────────
// Bootstrap the game and handle fatal errors gracefully.

import { createGame } from './integration/game-integration';

async function main(): Promise<void> {
  try {
    console.log('Gem v1 — 啟動中...');
    const game = await createGame(document.body);
    console.log(`Gem v1 — 啟動完成 (phase: ${game.getPhase()})`);

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
