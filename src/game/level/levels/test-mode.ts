import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// Test Mode — 測試模式（無限制自由遊玩）
// levelId = -1, 不限手數/時間, 8×8 棋盤, 全 7 色
// ═══════════════════════════════════════════════════════════════

registerLevel({
  id: -1,
  worldId: 0,
  name: { 'zh-TW': '測試模式', en: 'Test Mode' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: { type: 'score', target: 999999999 },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
});
