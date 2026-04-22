import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// World 3 — 月下神殿 (L41–L60)
// ═══════════════════════════════════════════════════════════════

// L41 — 橙光初現
registerLevel({
  id: 41,
  worldId: 3,
  name: { 'zh-TW': '橙光初現', en: 'Opal Dawn' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'collect', target: [{ colour: 'O', count: 10 }] },
  stars: { one: 0, two: 5, three: 11, basis: 'movesRemaining' },
});

// L42 — 七彩棋盤
registerLevel({
  id: 42,
  worldId: 3,
  name: { 'zh-TW': '七彩棋盤', en: 'Seven Colours' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'score', target: 18000 },
  stars: { one: 18000, two: 28800, three: 45000, basis: 'score' },
});

// L43 — 三重目標
registerLevel({
  id: 43,
  worldId: 3,
  name: { 'zh-TW': '三重目標', en: 'Triple Objective' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 25 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 20000 },
      { type: 'collect', target: [{ colour: 'O', count: 10 }] },
      { type: 'collect', target: [{ colour: 'B', count: 10 }] },
    ],
  },
  stars: { one: 20000, two: 32000, three: 50000, basis: 'score' },
});

// L44 — 送達之夢
registerLevel({
  id: 44,
  worldId: 3,
  name: { 'zh-TW': '送達之夢', en: 'Delivery Dream' },
  board: {
    width: 8,
    height: 8,
    empty: [],
    deliveryCells: [[3, 7], [4, 7]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'drop', target: { count: 2 } },
  stars: { one: 0, two: 5, three: 11, basis: 'movesRemaining' },
});

// L45 — Gate: 月門
registerLevel({
  id: 45,
  worldId: 3,
  name: { 'zh-TW': 'Gate: 月門', en: 'Gate: Moon Gate' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 24000 },
    ],
  },
  stars: { one: 24000, two: 38400, three: 60000, basis: 'score' },
});

// L46 — 霧源初現
registerLevel({
  id: 46,
  worldId: 3,
  name: { 'zh-TW': '霧源初現', en: 'Generator Appears' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 24 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'jelly', count: 10 }] },
      { type: 'clear', target: [{ blocker: 'generator', count: 2 }] },
    ],
  },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
  blockers: [
    { type: 'generator', at: [2, 2], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [5, 5], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
    { type: 'jelly', at: [3, 4], layers: 1 },
    { type: 'jelly', at: [4, 3], layers: 1 },
  ],
});

// L47 — 霧源對抗
registerLevel({
  id: 47,
  worldId: 3,
  name: { 'zh-TW': '霧源對抗', en: 'Generator Battle' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { timeBudget: 100 },
  objective: { type: 'score', target: 22000 },
  stars: { one: 0, two: 25, three: 50, basis: 'timeRemaining' },
  blockers: [
    { type: 'generator', at: [3, 3], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
  ],
});

// L48 — 源與鎖
registerLevel({
  id: 48,
  worldId: 3,
  name: { 'zh-TW': '源與鎖', en: 'Generator and Lock' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'jelly', count: 10 }] },
      { type: 'clear', target: [{ blocker: 'lock', count: 4 }] },
    ],
  },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
  blockers: [
    { type: 'generator', at: [4, 4], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [6, 1], layers: 1 },
    { type: 'jelly', at: [1, 6], layers: 1 },
    { type: 'jelly', at: [6, 6], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [5, 3], layers: 1 },
    { type: 'jelly', at: [3, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [7, 7], layers: 1 },
    { type: 'lock', at: [2, 3] },
    { type: 'lock', at: [5, 2] },
    { type: 'lock', at: [2, 5] },
    { type: 'lock', at: [5, 6] },
  ],
});

// L49 — 中盤壓力
registerLevel({
  id: 49,
  worldId: 3,
  name: { 'zh-TW': '中盤壓力', en: 'Mid-Game Pressure' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: { type: 'score', target: 28000 },
  stars: { one: 28000, two: 44800, three: 70000, basis: 'score' },
});

// L50 — Gate: 半程水月
registerLevel({
  id: 50,
  worldId: 3,
  name: { 'zh-TW': 'Gate: 半程水月', en: 'Gate: Half Moon' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 32000 },
    ],
  },
  stars: { one: 32000, two: 51200, three: 80000, basis: 'score' },
});

// L51 — 橙光風暴
registerLevel({
  id: 51,
  worldId: 3,
  name: { 'zh-TW': '橙光風暴', en: 'Opal Storm' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: { type: 'collect', target: [{ colour: 'O', count: 25 }] },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
});

// L52 — 色偏挑戰
registerLevel({
  id: 52,
  worldId: 3,
  name: { 'zh-TW': '色偏挑戰', en: 'Colour Bias Challenge' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { timeBudget: 120 },
  objective: { type: 'score', target: 26000 },
  stars: { one: 0, two: 30, three: 60, basis: 'timeRemaining' },
});

// L53 — 鎖源雙煞
registerLevel({
  id: 53,
  worldId: 3,
  name: { 'zh-TW': '鎖源雙煞', en: 'Lock and Generator' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'lock', count: 8 }] },
      { type: 'clear', target: [{ blocker: 'generator', count: 3 }] },
    ],
  },
  stars: { one: 0, two: 7, three: 14, basis: 'movesRemaining' },
  blockers: [
    { type: 'generator', at: [2, 2], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [6, 2], generatorSpec: { spawnKind: 'lock', everyNMoves: 4 } },
    { type: 'generator', at: [4, 6], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'lock', at: [1, 1] },
    { type: 'lock', at: [7, 1] },
    { type: 'lock', at: [1, 7] },
    { type: 'lock', at: [7, 7] },
    { type: 'lock', at: [3, 3] },
    { type: 'lock', at: [5, 3] },
    { type: 'lock', at: [3, 5] },
    { type: 'lock', at: [5, 5] },
  ],
});

// L54 — 雙重送達
registerLevel({
  id: 54,
  worldId: 3,
  name: { 'zh-TW': '雙重送達', en: 'Double Delivery' },
  board: {
    width: 9,
    height: 9,
    empty: [],
    deliveryCells: [[2, 8], [4, 8], [6, 8], [3, 8]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: { type: 'drop', target: { count: 4 } },
  stars: { one: 0, two: 6, three: 13, basis: 'movesRemaining' },
});

// L55 — 不穩之始
registerLevel({
  id: 55,
  worldId: 3,
  name: { 'zh-TW': '不穩之始', en: 'Unstable Beginning' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 24 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'collect', target: [{ colour: 'R', count: 20 }] },
    ],
  },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
  blockers: [
    { type: 'unstable', at: [3, 3], unstableSpec: { countdown: 6 } },
    { type: 'unstable', at: [4, 4], unstableSpec: { countdown: 6 } },
  ],
});

// L56 — 不穩擴散
registerLevel({
  id: 56,
  worldId: 3,
  name: { 'zh-TW': '不穩擴散', en: 'Unstable Spread' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: { type: 'score', target: 30000 },
  stars: { one: 30000, two: 48000, three: 75000, basis: 'score' },
  blockers: [
    { type: 'unstable', at: [2, 2], unstableSpec: { countdown: 6 } },
    { type: 'unstable', at: [5, 5], unstableSpec: { countdown: 6 } },
    { type: 'unstable', at: [5, 2], unstableSpec: { countdown: 6 } },
  ],
});

// L57 — 三重威脅
registerLevel({
  id: 57,
  worldId: 3,
  name: { 'zh-TW': '三重威脅', en: 'Triple Threat' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'jelly', count: 8 }] },
      { type: 'clear', target: [{ blocker: 'lock', count: 4 }] },
    ],
  },
  stars: { one: 0, two: 7, three: 14, basis: 'movesRemaining' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 2 },
    { type: 'jelly', at: [7, 1], layers: 2 },
    { type: 'jelly', at: [1, 7], layers: 2 },
    { type: 'jelly', at: [7, 7], layers: 2 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [5, 3], layers: 1 },
    { type: 'jelly', at: [3, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'lock', at: [4, 2] },
    { type: 'lock', at: [2, 4] },
    { type: 'lock', at: [6, 4] },
    { type: 'lock', at: [4, 6] },
    { type: 'unstable', at: [4, 4], unstableSpec: { countdown: 6 } },
  ],
});

// L58 — 月光破曉
registerLevel({
  id: 58,
  worldId: 3,
  name: { 'zh-TW': '月光破曉', en: 'Moonlight Dawn' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { timeBudget: 110 },
  objective: { type: 'score', target: 34000 },
  stars: { one: 0, two: 27, three: 55, basis: 'timeRemaining' },
});

// L59 — Gate: 聖殿之門
registerLevel({
  id: 59,
  worldId: 3,
  name: { 'zh-TW': 'Gate: 聖殿之門', en: 'Gate: Temple Gate' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 32 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 38000 },
    ],
  },
  stars: { one: 38000, two: 60800, three: 95000, basis: 'score' },
});

// L60 — Boss: 月蝕之環
registerLevel({
  id: 60,
  worldId: 3,
  name: { 'zh-TW': 'Boss: 月蝕之環', en: 'Boss: Lunar Eclipse' },
  board: {
    width: 9,
    height: 9,
    empty: [],
    deliveryCells: [[2, 8], [4, 8], [6, 8], [3, 8], [5, 8]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 38 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 55000 },
      { type: 'drop', target: { count: 5 } },
      { type: 'clear', target: [{ blocker: 'jelly', count: 12 }, { blocker: 'generator', count: 2 }] },
    ],
  },
  stars: { one: 55000, two: 88000, three: 137500, basis: 'score' },
  blockers: [
    { type: 'generator', at: [2, 2], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [6, 6], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'jelly', at: [0, 0], layers: 2 },
    { type: 'jelly', at: [8, 0], layers: 2 },
    { type: 'jelly', at: [0, 8], layers: 2 },
    { type: 'jelly', at: [8, 8], layers: 2 },
    { type: 'jelly', at: [1, 1], layers: 1 },
    { type: 'jelly', at: [7, 1], layers: 1 },
    { type: 'jelly', at: [1, 7], layers: 1 },
    { type: 'jelly', at: [7, 7], layers: 1 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
  ],
});
