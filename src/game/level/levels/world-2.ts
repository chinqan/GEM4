import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// World 2 — 水晶之根 (L21–L40)
// ═══════════════════════════════════════════════════════════════

// L21 — 初見迷霧
registerLevel({
  id: 21,
  worldId: 2,
  name: { 'zh-TW': '初見迷霧', en: 'First Fog' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'clear', target: [{ blocker: 'jelly', count: 6 }] },
  stars: { one: 0, two: 5, three: 10, basis: 'movesRemaining' },
  blockers: [
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L22 — 深入霧林
registerLevel({
  id: 22,
  worldId: 2,
  name: { 'zh-TW': '深入霧林', en: 'Into the Fog' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'clear', target: [{ blocker: 'jelly', count: 8 }] },
  stars: { one: 0, two: 5, three: 10, basis: 'movesRemaining' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 3], layers: 1 },
    { type: 'jelly', at: [3, 4], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L23 — 雙重目標
registerLevel({
  id: 23,
  worldId: 2,
  name: { 'zh-TW': '雙重目標', en: 'Dual Objective' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 22 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 12000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 10 }] },
    ],
  },
  stars: { one: 12000, two: 19200, three: 30000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L24 — 水晶之憶
registerLevel({
  id: 24,
  worldId: 2,
  name: { 'zh-TW': '水晶之憶', en: 'Crystal Memory' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 20 },
  objective: { type: 'collect', target: [{ colour: 'B', count: 15 }] },
  stars: { one: 0, two: 5, three: 10, basis: 'movesRemaining' },
});

// L25 — Gate: 霧之門檻
registerLevel({
  id: 25,
  worldId: 2,
  name: { 'zh-TW': 'Gate: 霧之門檻', en: 'Gate: Fog Threshold' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 25 },
  objective: { type: 'score', target: 18000 },
  stars: { one: 18000, two: 28800, three: 45000, basis: 'score' },
});

// L26 — 初逢封鎖
registerLevel({
  id: 26,
  worldId: 2,
  name: { 'zh-TW': '初逢封鎖', en: 'First Lock' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'clear', target: [{ blocker: 'lock', count: 4 }] },
  stars: { one: 0, two: 5, three: 11, basis: 'movesRemaining' },
  blockers: [
    { type: 'lock', at: [3, 3] },
    { type: 'lock', at: [4, 3] },
    { type: 'lock', at: [3, 4] },
    { type: 'lock', at: [4, 4] },
  ],
});

// L27 — 時計首戰
registerLevel({
  id: 27,
  worldId: 2,
  name: { 'zh-TW': '時計首戰', en: 'First Timed Battle' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { timeBudget: 90 },
  objective: { type: 'score', target: 15000 },
  stars: { one: 0, two: 22, three: 45, basis: 'timeRemaining' },
});

// L28 — 霧鎖同行
registerLevel({
  id: 28,
  worldId: 2,
  name: { 'zh-TW': '霧鎖同行', en: 'Fog and Lock' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 22 },
  objective: {
    type: 'clear',
    target: [
      { blocker: 'jelly', count: 6 },
      { blocker: 'lock', count: 3 },
    ],
  },
  stars: { one: 0, two: 5, three: 11, basis: 'movesRemaining' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
    { type: 'lock', at: [3, 1] },
    { type: 'lock', at: [4, 6] },
    { type: 'lock', at: [0, 3] },
  ],
});

// L29 — 紅霧雙殺
registerLevel({
  id: 29,
  worldId: 2,
  name: { 'zh-TW': '紅霧雙殺', en: 'Red Fog Double' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 24 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 14000 },
      { type: 'collect', target: [{ colour: 'R', count: 15 }] },
    ],
  },
  stars: { one: 14000, two: 22400, three: 35000, basis: 'score' },
});

// L30 — Gate: 水晶之核
registerLevel({
  id: 30,
  worldId: 2,
  name: { 'zh-TW': 'Gate: 水晶之核', en: 'Gate: Crystal Core' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 22000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 12 }] },
    ],
  },
  stars: { one: 22000, two: 35200, three: 55000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [7, 0], layers: 1 },
    { type: 'jelly', at: [0, 7], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [7, 7], layers: 1 },
  ],
});

// L31 — 密度壓力
registerLevel({
  id: 31,
  worldId: 2,
  name: { 'zh-TW': '密度壓力', en: 'Density Pressure' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'score', target: 18000 },
  stars: { one: 18000, two: 28800, three: 45000, basis: 'score' },
});

// L32 — 鎖鏈追擊
registerLevel({
  id: 32,
  worldId: 2,
  name: { 'zh-TW': '鎖鏈追擊', en: 'Lock Chase' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 24 },
  objective: { type: 'clear', target: [{ blocker: 'lock', count: 6 }] },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
  blockers: [
    { type: 'lock', at: [1, 2] },
    { type: 'lock', at: [6, 2] },
    { type: 'lock', at: [1, 5] },
    { type: 'lock', at: [6, 5] },
    { type: 'lock', at: [3, 3] },
    { type: 'lock', at: [4, 4] },
  ],
});

// L33 — 時光霧夢
registerLevel({
  id: 33,
  worldId: 2,
  name: { 'zh-TW': '時光霧夢', en: 'Fog Dream' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { timeBudget: 80 },
  objective: { type: 'clear', target: [{ blocker: 'jelly', count: 10 }] },
  stars: { one: 0, two: 20, three: 40, basis: 'timeRemaining' },
  blockers: [
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [7, 0], layers: 1 },
    { type: 'jelly', at: [0, 7], layers: 1 },
    { type: 'jelly', at: [7, 7], layers: 1 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L34 — 洞穴迷宮
registerLevel({
  id: 34,
  worldId: 2,
  name: { 'zh-TW': '洞穴迷宮', en: 'Cave Maze' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 26 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 16000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 8 }] },
    ],
  },
  stars: { one: 16000, two: 25600, three: 40000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 0], layers: 1 },
    { type: 'jelly', at: [4, 0], layers: 1 },
    { type: 'jelly', at: [3, 7], layers: 1 },
    { type: 'jelly', at: [4, 7], layers: 1 },
  ],
});

// L35 — 雙層霧
registerLevel({
  id: 35,
  worldId: 2,
  name: { 'zh-TW': '雙層霧', en: 'Double Layer Fog' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 25 },
  objective: { type: 'clear', target: [{ blocker: 'jelly', count: 12 }] },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 2 },
    { type: 'jelly', at: [6, 1], layers: 2 },
    { type: 'jelly', at: [1, 6], layers: 2 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 3], layers: 1 },
    { type: 'jelly', at: [3, 4], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
  ],
});

// L36 — 速擊霧
registerLevel({
  id: 36,
  worldId: 2,
  name: { 'zh-TW': '速擊霧', en: 'Speed Fog' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { timeBudget: 110 },
  objective: { type: 'score', target: 20000 },
  stars: { one: 0, two: 27, three: 55, basis: 'timeRemaining' },
});

// L37 — 紫霧之心
registerLevel({
  id: 37,
  worldId: 2,
  name: { 'zh-TW': '紫霧之心', en: 'Purple Fog Heart' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 26 },
  objective: { type: 'collect', target: [{ colour: 'P', count: 20 }] },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
});

// L38 — 鎖陣之舞
registerLevel({
  id: 38,
  worldId: 2,
  name: { 'zh-TW': '鎖陣之舞', en: 'Lock Dance' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 26 },
  objective: { type: 'clear', target: [{ blocker: 'lock', count: 8 }] },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
  blockers: [
    { type: 'lock', at: [1, 1] },
    { type: 'lock', at: [6, 1] },
    { type: 'lock', at: [1, 6] },
    { type: 'lock', at: [6, 6] },
    { type: 'lock', at: [3, 2] },
    { type: 'lock', at: [4, 2] },
    { type: 'lock', at: [3, 5] },
    { type: 'lock', at: [4, 5] },
  ],
});

// L39 — Gate: 深淵階梯
registerLevel({
  id: 39,
  worldId: 2,
  name: { 'zh-TW': 'Gate: 深淵階梯', en: 'Gate: Abyss Stairs' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 26000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 10 }] },
    ],
  },
  stars: { one: 26000, two: 41600, three: 65000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [7, 0], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 2 },
    { type: 'jelly', at: [4, 4], layers: 2 },
    { type: 'jelly', at: [0, 7], layers: 1 },
    { type: 'jelly', at: [7, 7], layers: 1 },
  ],
});

// L40 — Boss: 霧之源泉
registerLevel({
  id: 40,
  worldId: 2,
  name: { 'zh-TW': 'Boss: 霧之源泉', en: 'Boss: Fog Fountain' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P'] },
  constraints: { moveBudget: 35 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 40000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 20 }] },
    ],
  },
  stars: { one: 40000, two: 64000, three: 100000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [0, 0], layers: 3 },
    { type: 'jelly', at: [8, 0], layers: 3 },
    { type: 'jelly', at: [0, 8], layers: 3 },
    { type: 'jelly', at: [8, 8], layers: 3 },
    { type: 'jelly', at: [1, 1], layers: 2 },
    { type: 'jelly', at: [7, 1], layers: 2 },
    { type: 'jelly', at: [1, 7], layers: 2 },
    { type: 'jelly', at: [7, 7], layers: 2 },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'jelly', at: [6, 2], layers: 1 },
    { type: 'jelly', at: [2, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [5, 3], layers: 1 },
    { type: 'jelly', at: [3, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [4, 0], layers: 1 },
    { type: 'jelly', at: [4, 8], layers: 1 },
    { type: 'jelly', at: [0, 4], layers: 1 },
    { type: 'jelly', at: [8, 4], layers: 1 },
  ],
});
