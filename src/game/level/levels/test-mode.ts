import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// Test Mode — 測試模式（無限制自由遊玩）
// levelId = -1, 不限手數/時間, 8×8 棋盤, 全 7 色
// ═══════════════════════════════════════════════════════════════

// levelId = -1：純自由遊玩（無阻擋物、無目標限制）
registerLevel({
  id: -1,
  worldId: 0,
  name: { 'zh-TW': '自由遊玩', en: 'Free Play' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: { type: 'score', target: 999999999 },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
});

// ═══════════════════════════════════════════════════════════════
// 果凍阻擋物測試 — levelId = -3
// 驗證果凍阻擋物各層的視覺、音效、消除行為
// ═══════════════════════════════════════════════════════════════
registerLevel({
  id: -3,
  worldId: 0,
  name: { 'zh-TW': '果凍阻擋物測試', en: 'Jelly Test' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 999999999 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 9 }] },
    ],
  },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
  blockers: [
    // 四角：3 層
    { type: 'jelly', at: [0, 0], layers: 3 },
    { type: 'jelly', at: [7, 0], layers: 3 },
    { type: 'jelly', at: [0, 7], layers: 3 },
    { type: 'jelly', at: [7, 7], layers: 3 },
    // 四邊中點：2 層
    { type: 'jelly', at: [3, 0], layers: 2 },
    { type: 'jelly', at: [4, 0], layers: 2 },
    { type: 'jelly', at: [0, 3], layers: 2 },
    { type: 'jelly', at: [7, 3], layers: 2 },
    // 中心：1 層
    { type: 'jelly', at: [3, 3], layers: 1 },
  ],
});

// ═══════════════════════════════════════════════════════════════
// 特殊寶石生成測試 — levelId = -2
//
// 驗證：移動觸發炸彈發動，同時旁邊形成 4 連，應正確生成 LineV 炸彈
//
// 初始配置：
//   col:  0  1  2  3   4  5  6  7
//   row3: ?  ?  ?  B   R  R  R [LineH]  ← (7,3) LineH 炸彈
//   row4: ?  ?  ?  ?   ?  ?  ?  R       ← (7,4) 交換目標
//
// 操作：把 (7,3) [LineH] 往下拖到 (7,4) [R]
//   → LineH 移到 (7,4) 發動，清除整列 row4（不影響 row3）
//   → (7,3) 出現 R，(4,3)(5,3)(6,3)(7,3) 形成 R×4 水平直線
//   → 應在 (7,3) 生成 LineV 炸彈 ✓（修復前：不生成）
// ═══════════════════════════════════════════════════════════════
registerLevel({
  id: -2,
  worldId: 0,
  name: { 'zh-TW': '炸彈＋生成測試', en: 'Bomb + Spawn Test' },
  board: {
    width: 8,
    height: 8,
    empty: [],
    fixedGems: [
      // row3 右側 3 個 R（與炸彈形成 4 連）
      { at: [4, 3], colour: 'R' },
      { at: [5, 3], colour: 'R' },
      { at: [6, 3], colour: 'R' },
      // (7,3)：LineH 炸彈（colour=null）→ 拖這顆往下
      { at: [7, 3], colour: null, special: 'lineH' },
      // 截斷左側（防止延伸成 5 連變 Colour Gem）
      { at: [3, 3], colour: 'B' },
      // (7,4)：交換目標
      { at: [7, 4], colour: 'R' },
      // 防止 col7 在交換後形成縱向 3 連
      { at: [7, 2], colour: 'B' },
      { at: [7, 5], colour: 'B' },
    ],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: { type: 'score', target: 999999999 },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
});
