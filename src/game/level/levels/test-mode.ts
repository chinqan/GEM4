import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// 無解重洗測試 — levelId = -4
//
// 開局棋盤以 (col + row) % 5 循環五色填滿，數學上保證沒有任何
// 有效交換（任意相鄰交換後兩側鄰格的 mod-5 餘數均不相等）。
// 使用五色而非三色，讓洗牌成功率從 0% 提升到 ~5%/次，
// 確保寶石滑動動畫能順利執行而不走回淡出淡入的安全閥路徑。
//
// 預期行為：
//   - 嘗試移動任何寶石 → swap invalid，寶石回彈 → 觸發重洗滑動動畫
//   - 閒置 5 秒提示觸發 → hint.shown 事件 cells 為空 → 觸發重洗滑動動畫
//
// 棋盤配色（R G B Y P，col 橫 / row 縱）：
//   col:  0  1  2  3  4  5  6  7
//   row0: R  G  B  Y  P  R  G  B
//   row1: G  B  Y  P  R  G  B  Y
//   ...（(col+row)%5 循環）
// ═══════════════════════════════════════════════════════════════
registerLevel({
  id: -4,
  worldId: 0,
  name: { 'zh-TW': '無解重洗測試', en: 'Deadlock Reshuffle Test' },
  board: {
    width: 8, height: 8, empty: [],
    fixedGems: [
      { at: [0, 0], colour: 'R' }, { at: [1, 0], colour: 'G' }, { at: [2, 0], colour: 'B' }, { at: [3, 0], colour: 'Y' }, { at: [4, 0], colour: 'P' }, { at: [5, 0], colour: 'R' }, { at: [6, 0], colour: 'G' }, { at: [7, 0], colour: 'B' },  // row 0
      { at: [0, 1], colour: 'G' }, { at: [1, 1], colour: 'B' }, { at: [2, 1], colour: 'Y' }, { at: [3, 1], colour: 'P' }, { at: [4, 1], colour: 'R' }, { at: [5, 1], colour: 'G' }, { at: [6, 1], colour: 'B' }, { at: [7, 1], colour: 'Y' },  // row 1
      { at: [0, 2], colour: 'B' }, { at: [1, 2], colour: 'Y' }, { at: [2, 2], colour: 'P' }, { at: [3, 2], colour: 'R' }, { at: [4, 2], colour: 'G' }, { at: [5, 2], colour: 'B' }, { at: [6, 2], colour: 'Y' }, { at: [7, 2], colour: 'P' },  // row 2
      { at: [0, 3], colour: 'Y' }, { at: [1, 3], colour: 'P' }, { at: [2, 3], colour: 'R' }, { at: [3, 3], colour: 'G' }, { at: [4, 3], colour: 'B' }, { at: [5, 3], colour: 'Y' }, { at: [6, 3], colour: 'P' }, { at: [7, 3], colour: 'R' },  // row 3
      { at: [0, 4], colour: 'P' }, { at: [1, 4], colour: 'R' }, { at: [2, 4], colour: 'G' }, { at: [3, 4], colour: 'B' }, { at: [4, 4], colour: 'Y' }, { at: [5, 4], colour: 'P' }, { at: [6, 4], colour: 'R' }, { at: [7, 4], colour: 'G' },  // row 4
      { at: [0, 5], colour: 'R' }, { at: [1, 5], colour: 'G' }, { at: [2, 5], colour: 'B' }, { at: [3, 5], colour: 'Y' }, { at: [4, 5], colour: 'P' }, { at: [5, 5], colour: 'R' }, { at: [6, 5], colour: 'G' }, { at: [7, 5], colour: 'B' },  // row 5
      { at: [0, 6], colour: 'G' }, { at: [1, 6], colour: 'B' }, { at: [2, 6], colour: 'Y' }, { at: [3, 6], colour: 'P' }, { at: [4, 6], colour: 'R' }, { at: [5, 6], colour: 'G' }, { at: [6, 6], colour: 'B' }, { at: [7, 6], colour: 'Y' },  // row 6
      { at: [0, 7], colour: 'B' }, { at: [1, 7], colour: 'Y' }, { at: [2, 7], colour: 'P' }, { at: [3, 7], colour: 'R' }, { at: [4, 7], colour: 'G' }, { at: [5, 7], colour: 'B' }, { at: [6, 7], colour: 'Y' }, { at: [7, 7], colour: 'P' },  // row 7
    ],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: { type: 'score', target: 999999999 },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
});

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
// 炸彈發動 + 特殊寶石生成 綜合測試 — levelId = -2
//
// 四個情境驗證「炸彈發動時，concurrent match 的 spawn 位置落在爆炸範圍內，
// 應優先生成特殊寶石（不被清除）」的修復邏輯。
//
// 棋盤示意（8×8）：
//   col:  0   1   2   3   4   5   6   7
//   row0: [B] [G] [G] [G] [☆B][G]            ← 情境B
//   row1:      [B] [B] [B]
//   row2:                               [B]   ← 情境A blocker
//   row3:              [B] [R] [R] [R] [☆A]  ← 情境A
//   row4: [B]                           [R]   ← 情境C/A
//   row5: [G] [G] [G] [B]               [B]  ← 情境C
//   row6: [G] [B] [B] [B] [B] [B] [B]        ← 情境C/D blockers
//   row7: [☆C][G] [P] [P] [P] [P] [☆D][P]   ← 情境C / 情境D
//
// ── 情境 A：lineV + 四連消 → lineV ──────────────────────────
//   操作：(7,3)[lineV] 往下拖到 (7,4)[R]
//   → lineV 清除 col7；(4,3)-(7,3) 形成 R×4 → 生成 lineV
//
// ── 情境 B：area bomb + 四連消 → lineV ──────────────────────
//   操作：(4,0)[area] 往右拖到 (5,0)[G]
//   → area 清除 3×3；(1,0)-(4,0) 形成 G×4 → 生成 lineV
//
// ── 情境 C：area bomb + L形5格 → area bomb ──────────────────
//   操作：(0,7)[area] 往右拖到 (1,7)[G]
//   → area 清除 3×3；col0+row5 形成 G×5 L形 → 生成 area bomb
//
// ── 情境 D：area bomb + 直線5 → Colour Gem ──────────────────
//   操作：(6,7)[area] 往右拖到 (7,7)[P]
//   → area 清除 3×3；(2,7)-(6,7) 形成 P×5 直線 → 生成 Colour Gem
// ═══════════════════════════════════════════════════════════════
registerLevel({
  id: -2,
  worldId: 0,
  name: { 'zh-TW': '炸彈生成綜合測試', en: 'Bomb Spawn Test Suite' },
  board: {
    width: 8,
    height: 8,
    empty: [],
    fixedGems: [
      // ── 情境 A：lineV + 四連消 → lineV ───────────────────────
      { at: [7, 2], colour: 'B' },          // 防止 col7 縱向 3 連
      { at: [3, 3], colour: 'B' },          // 截斷左側防 5 連
      { at: [4, 3], colour: 'R' },
      { at: [5, 3], colour: 'R' },
      { at: [6, 3], colour: 'R' },
      { at: [7, 3], colour: null, special: 'lineV' }, // ← 拖到 (7,4)
      { at: [7, 4], colour: 'R' },          // 交換目標
      { at: [7, 5], colour: 'B' },          // 防止 col7 縱向 3 連

      // ── 情境 B：area bomb + 四連消 → lineV ───────────────────
      { at: [0, 0], colour: 'B' },          // 截斷左側防 5 連
      { at: [1, 0], colour: 'G' },
      { at: [2, 0], colour: 'G' },
      { at: [3, 0], colour: 'G' },
      { at: [4, 0], colour: null, special: 'area' }, // ← 拖到 (5,0)
      { at: [5, 0], colour: 'G' },          // 交換目標
      { at: [1, 1], colour: 'B' },          // 防止 col1-3 縱向 3 連
      { at: [2, 1], colour: 'B' },
      { at: [3, 1], colour: 'B' },

      // ── 情境 C：area bomb + L形5格 → area bomb ───────────────
      { at: [0, 4], colour: 'B' },          // 截斷 col0 向上延伸
      { at: [0, 5], colour: 'G' },          // L 交會點（row5 橫 + col0 縱）
      { at: [1, 5], colour: 'G' },
      { at: [2, 5], colour: 'G' },
      { at: [3, 5], colour: 'B' },          // 截斷右側防 4+ 連
      { at: [0, 6], colour: 'G' },
      { at: [1, 6], colour: 'B' },          // 防止 col1-2 縱向 3 連
      { at: [2, 6], colour: 'B' },
      { at: [0, 7], colour: null, special: 'area' }, // ← 拖到 (1,7)
      { at: [1, 7], colour: 'G' },          // 交換目標（兼作情境D左側擋板）

      // ── 情境 D：area bomb + 直線5 → Colour Gem ───────────────
      { at: [2, 7], colour: 'P' },
      { at: [3, 7], colour: 'P' },
      { at: [4, 7], colour: 'P' },
      { at: [5, 7], colour: 'P' },
      { at: [6, 7], colour: null, special: 'area' }, // ← 拖到 (7,7)
      { at: [7, 7], colour: 'P' },          // 交換目標
      { at: [3, 6], colour: 'B' },          // 防止 col3-6 縱向 P 3 連
      { at: [4, 6], colour: 'B' },
      { at: [5, 6], colour: 'B' },
      { at: [6, 6], colour: 'B' },
    ],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 9999 },
  objective: { type: 'score', target: 999999999 },
  stars: { one: 999999999, two: 999999999, three: 999999999, basis: 'score' },
});
