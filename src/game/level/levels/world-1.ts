import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// World 1 — 失落的山嶺花園 (L1–L20)
// ═══════════════════════════════════════════════════════════════

// L1 — 初次相遇
registerLevel({
  id: 1,
  worldId: 1,
  name: { 'zh-TW': '初次相遇', en: 'First Encounter' },
  board: { width: 6, height: 6, empty: [] },
  gems: { colours: ['R', 'G', 'B'] },
  constraints: { moveBudget: 15 },
  objective: { type: 'score', target: 2000 },
  stars: { one: 2000, two: 3200, three: 5000, basis: 'score' },
});

// L2 — 第一次光柱
registerLevel({
  id: 2,
  worldId: 1,
  name: { 'zh-TW': '第一次光柱', en: 'First Beam' },
  board: { width: 6, height: 6, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 18 },
  objective: { type: 'score', target: 3500 },
  stars: { one: 3500, two: 5600, three: 8750, basis: 'score' },
});

// L3 — 一點點時間感
registerLevel({
  id: 3,
  worldId: 1,
  name: { 'zh-TW': '一點點時間感', en: 'A Touch of Time' },
  board: { width: 6, height: 6, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { timeBudget: 120 },
  objective: { type: 'score', target: 3000 },
  stars: { one: 3000, two: 4800, three: 7500, basis: 'score' },
});

// L4 — 彩虹的前兆
registerLevel({
  id: 4,
  worldId: 1,
  name: { 'zh-TW': '彩虹的前兆', en: 'Rainbow Omen' },
  board: { width: 7, height: 7, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'score', target: 5000 },
  stars: { one: 5000, two: 8000, three: 12500, basis: 'score' },
});

// L5 — T 字的震撼
registerLevel({
  id: 5,
  worldId: 1,
  name: { 'zh-TW': 'T 字的震撼', en: 'T-Shape Shock' },
  board: { width: 7, height: 7, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'score', target: 6000 },
  stars: { one: 6000, two: 9600, three: 15000, basis: 'score' },
});

// L6 — 光柱初試
registerLevel({
  id: 6,
  worldId: 1,
  name: { 'zh-TW': '光柱初試', en: 'First Beam Trial' },
  board: { width: 7, height: 7, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'], weights: { R: 1.5, G: 1.0, B: 1.0, Y: 1.0 } },
  constraints: { moveBudget: 20 },
  objective: { type: 'collect', target: [{ colour: 'R', count: 15 }] },
  stars: { one: 0, two: 5, three: 10, basis: 'movesRemaining' },
});

// L7 — 爆裂試煉
registerLevel({
  id: 7,
  worldId: 1,
  name: { 'zh-TW': '爆裂試煉', en: 'Blast Trial' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'collect', target: [{ colour: 'G', count: 10 }] },
  stars: { one: 0, two: 5, three: 11, basis: 'movesRemaining' },
});

// L8 — 彩虹試煉
registerLevel({
  id: 8,
  worldId: 1,
  name: { 'zh-TW': '彩虹試煉', en: 'Rainbow Trial' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'collect', target: [{ colour: 'B', count: 15 }] },
  stars: { one: 0, two: 5, three: 10, basis: 'movesRemaining' },
});

// L9 — 初次組合
registerLevel({
  id: 9,
  worldId: 1,
  name: { 'zh-TW': '初次組合', en: 'First Combo' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y'] },
  constraints: { moveBudget: 25 },
  objective: { type: 'score', target: 12000 },
  stars: { one: 12000, two: 19200, three: 30000, basis: 'score' },
});

// L10 — 雙重目標
registerLevel({
  id: 10,
  worldId: 1,
  name: { 'zh-TW': '雙重目標', en: 'Dual Objective' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 25 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 10000 },
      { type: 'collect', target: [{ colour: 'R', count: 20 }] },
    ],
  },
  stars: { one: 10000, two: 16000, three: 25000, basis: 'score' },
});

// L11 — 色彩交會
registerLevel({
  id: 11,
  worldId: 1,
  name: { 'zh-TW': '色彩交會', en: 'Colour Convergence' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'score', target: 9000 },
  stars: { one: 9000, two: 14400, three: 22500, basis: 'score' },
});

// L12 — 短手挑戰
registerLevel({
  id: 12,
  worldId: 1,
  name: { 'zh-TW': '短手挑戰', en: 'Short Moves Challenge' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'score', target: 11000 },
  stars: { one: 11000, two: 17600, three: 27500, basis: 'score' },
});

// L13 — 特殊接力
registerLevel({
  id: 13,
  worldId: 1,
  name: { 'zh-TW': '特殊接力', en: 'Special Relay' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 24 },
  objective: { type: 'collect', target: [{ colour: 'Y', count: 20 }] },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
});

// L14 — 時間壓力
registerLevel({
  id: 14,
  worldId: 1,
  name: { 'zh-TW': '時間壓力', en: 'Time Pressure' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { timeBudget: 100 },
  objective: { type: 'score', target: 8000 },
  stars: { one: 0, two: 25, three: 50, basis: 'timeRemaining' },
});

// L15 — 組合複習
registerLevel({
  id: 15,
  worldId: 1,
  name: { 'zh-TW': '組合複習', en: 'Combo Review' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 15000 },
    ],
  },
  stars: { one: 15000, two: 24000, three: 37500, basis: 'score' },
});

// L16 — Gate: 星門守護
registerLevel({
  id: 16,
  worldId: 1,
  name: { 'zh-TW': 'Gate: 星門守護', en: 'Gate: Star Guardian' },
  board: {
    width: 7,
    height: 7,
    empty: [[2, 2], [3, 2], [4, 2], [3, 3], [3, 4]],
    deliveryCells: [[2, 6], [3, 6], [4, 6]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 25 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 18000 },
      { type: 'drop', target: { count: 3 } },
    ],
  },
  stars: { one: 18000, two: 28800, three: 45000, basis: 'score' },
});

// L17 — 盤面變化
registerLevel({
  id: 17,
  worldId: 1,
  name: { 'zh-TW': '盤面變化', en: 'Board Variation' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 25 },
  objective: { type: 'score', target: 14000 },
  stars: { one: 14000, two: 22400, three: 35000, basis: 'score' },
});

// L18 — 顏色偏差
registerLevel({
  id: 18,
  worldId: 1,
  name: { 'zh-TW': '顏色偏差', en: 'Colour Bias' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'], weights: { R: 1.5 } },
  constraints: { moveBudget: 26 },
  objective: { type: 'collect', target: [{ colour: 'R', count: 25 }] },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
});

// L19 — 最後測試
registerLevel({
  id: 19,
  worldId: 1,
  name: { 'zh-TW': '最後測試', en: 'Final Test' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 20000 },
      { type: 'collect', target: [{ colour: 'P', count: 15 }] },
    ],
  },
  stars: { one: 20000, two: 32000, three: 50000, basis: 'score' },
});

// L20 — Boss: 花園守護者
registerLevel({
  id: 20,
  worldId: 1,
  name: { 'zh-TW': 'Boss: 花園守護者', en: 'Boss: Garden Guardian' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 30000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 15 }] },
    ],
  },
  stars: { one: 30000, two: 48000, three: 75000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [1, 0], layers: 1 },
    { type: 'jelly', at: [2, 0], layers: 1 },
    { type: 'jelly', at: [6, 0], layers: 1 },
    { type: 'jelly', at: [7, 0], layers: 1 },
    { type: 'jelly', at: [8, 0], layers: 1 },
    { type: 'jelly', at: [0, 8], layers: 1 },
    { type: 'jelly', at: [1, 8], layers: 1 },
    { type: 'jelly', at: [2, 8], layers: 1 },
    { type: 'jelly', at: [6, 8], layers: 1 },
    { type: 'jelly', at: [7, 8], layers: 1 },
    { type: 'jelly', at: [8, 8], layers: 1 },
    { type: 'jelly', at: [0, 4], layers: 1 },
    { type: 'jelly', at: [8, 4], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
  specialRules: ['immovableCore(3, 3, 3, 3)', 'coreColourShift(5)'],
});
