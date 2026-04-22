import { registerLevel } from '../level-spec';

// ═══════════════════════════════════════════════════════════════
// World 4 — 星塵之塔 (L61–L80)
// ═══════════════════════════════════════════════════════════════

// L61 — 塔基
registerLevel({
  id: 61,
  worldId: 4,
  name: { 'zh-TW': '塔基', en: 'Tower Base' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 24 },
  objective: { type: 'clear', target: [{ blocker: 'jelly', count: 5 }, { blocker: 'lock', count: 5 }] },
  stars: { one: 0, two: 6, three: 12, basis: 'movesRemaining' },
  blockers: [
    // Stacked: lock + jelly on same cells
    { type: 'lock', at: [2, 2] },
    { type: 'jelly', at: [2, 2], layers: 1 },
    { type: 'lock', at: [5, 2] },
    { type: 'jelly', at: [5, 2], layers: 1 },
    { type: 'lock', at: [2, 5] },
    { type: 'jelly', at: [2, 5], layers: 1 },
    { type: 'lock', at: [5, 5] },
    { type: 'jelly', at: [5, 5], layers: 1 },
    { type: 'lock', at: [3, 3] },
    { type: 'jelly', at: [3, 3], layers: 1 },
  ],
});

// L62 — 雙塔攀登
registerLevel({
  id: 62,
  worldId: 4,
  name: { 'zh-TW': '雙塔攀登', en: 'Twin Tower Climb' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 30000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 8 }] },
    ],
  },
  stars: { one: 30000, two: 48000, three: 75000, basis: 'score' },
  blockers: [
    { type: 'jelly', at: [1, 1], layers: 2 },
    { type: 'jelly', at: [6, 1], layers: 2 },
    { type: 'jelly', at: [1, 6], layers: 2 },
    { type: 'jelly', at: [6, 6], layers: 2 },
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [4, 3], layers: 1 },
    { type: 'jelly', at: [3, 4], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L63 — 必 Combo
registerLevel({
  id: 63,
  worldId: 4,
  name: { 'zh-TW': '必 Combo', en: 'Combo Required' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 22 },
  objective: { type: 'score', target: 40000 },
  stars: { one: 40000, two: 64000, three: 100000, basis: 'score' },
  specialRules: ['combo-required'],
});

// L64 — 星光節拍
registerLevel({
  id: 64,
  worldId: 4,
  name: { 'zh-TW': '星光節拍', en: 'Starlight Beat' },
  board: { width: 8, height: 8, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 26 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'collect', target: [{ colour: 'W', count: 20 }] },
      { type: 'score', target: 25000 },
    ],
  },
  stars: { one: 25000, two: 40000, three: 62500, basis: 'score' },
});

// L65 — Gate: 半塔
registerLevel({
  id: 65,
  worldId: 4,
  name: { 'zh-TW': 'Gate: 半塔', en: 'Gate: Half Tower' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 45000 },
    ],
  },
  stars: { one: 45000, two: 72000, three: 112500, basis: 'score' },
});

// L66 — 分割星辰
registerLevel({
  id: 66,
  worldId: 4,
  name: { 'zh-TW': '分割星辰', en: 'Split Stars' },
  board: { width: 6, height: 6, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 30000 },
    ],
  },
  stars: { one: 30000, two: 48000, three: 75000, basis: 'score' },
  specialRules: ['splitBoard'],
});

// L67 — 開放之廳
registerLevel({
  id: 67,
  worldId: 4,
  name: { 'zh-TW': '開放之廳', en: 'Open Hall' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: { type: 'score', target: 50000 },
  stars: { one: 50000, two: 80000, three: 125000, basis: 'score' },
});

// L68 — 雙重災難
registerLevel({
  id: 68,
  worldId: 4,
  name: { 'zh-TW': '雙重災難', en: 'Double Disaster' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'generator', count: 3 }] },
    ],
  },
  stars: { one: 0, two: 7, three: 15, basis: 'movesRemaining' },
  blockers: [
    { type: 'generator', at: [2, 2], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [6, 2], generatorSpec: { spawnKind: 'lock', everyNMoves: 4 } },
    { type: 'generator', at: [4, 6], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'unstable', at: [3, 3], unstableSpec: { countdown: 6 } },
    { type: 'unstable', at: [5, 5], unstableSpec: { countdown: 6 } },
  ],
});

// L69 — 漸進風暴
registerLevel({
  id: 69,
  worldId: 4,
  name: { 'zh-TW': '漸進風暴', en: 'Rising Storm' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 32 },
  objective: { type: 'score', target: 60000 },
  stars: { one: 60000, two: 96000, three: 150000, basis: 'score' },
});

// L70 — Mid-Boss: 雙塔
registerLevel({
  id: 70,
  worldId: 4,
  name: { 'zh-TW': 'Mid-Boss: 雙塔', en: 'Mid-Boss: Twin Towers' },
  board: { width: 7, height: 7, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 35 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 70000 },
    ],
  },
  stars: { one: 70000, two: 112000, three: 175000, basis: 'score' },
  specialRules: ['splitBoard'],
});

// L71 — 雙塔之後
registerLevel({
  id: 71,
  worldId: 4,
  name: { 'zh-TW': '雙塔之後', en: 'After the Towers' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 28 },
  objective: { type: 'score', target: 60000 },
  stars: { one: 60000, two: 96000, three: 150000, basis: 'score' },
});

// L72 — 高塔壓力
registerLevel({
  id: 72,
  worldId: 4,
  name: { 'zh-TW': '高塔壓力', en: 'Tower Pressure' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: { type: 'collect', target: [{ colour: 'W', count: 30 }] },
  stars: { one: 0, two: 7, three: 15, basis: 'movesRemaining' },
});

// L73 — 終局之霧
registerLevel({
  id: 73,
  worldId: 4,
  name: { 'zh-TW': '終局之霧', en: 'Endgame Fog' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'jelly', count: 15 }] },
      { type: 'score', target: 50000 },
    ],
  },
  stars: { one: 50000, two: 80000, three: 125000, basis: 'score' },
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
    { type: 'jelly', at: [4, 0], layers: 1 },
    { type: 'jelly', at: [4, 8], layers: 1 },
    { type: 'jelly', at: [4, 4], layers: 1 },
  ],
});

// L74 — 時間決戰
registerLevel({
  id: 74,
  worldId: 4,
  name: { 'zh-TW': '時間決戰', en: 'Time Showdown' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { timeBudget: 140 },
  objective: { type: 'score', target: 55000 },
  stars: { one: 0, two: 35, three: 70, basis: 'timeRemaining' },
});

// L75 — Gate: 終關之門
registerLevel({
  id: 75,
  worldId: 4,
  name: { 'zh-TW': 'Gate: 終關之門', en: 'Gate: Final Gate' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 32 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 70000 },
    ],
  },
  stars: { one: 70000, two: 112000, three: 175000, basis: 'score' },
});

// L76 — 壓力山大
registerLevel({
  id: 76,
  worldId: 4,
  name: { 'zh-TW': '壓力山大', en: 'Under Pressure' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 32 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'clear', target: [{ blocker: 'jelly', count: 10 }, { blocker: 'lock', count: 6 }] },
    ],
  },
  stars: { one: 0, two: 8, three: 16, basis: 'movesRemaining' },
  blockers: [
    { type: 'lock', at: [2, 2] },
    { type: 'jelly', at: [2, 2], layers: 2 },
    { type: 'lock', at: [6, 2] },
    { type: 'jelly', at: [6, 2], layers: 2 },
    { type: 'lock', at: [2, 6] },
    { type: 'jelly', at: [2, 6], layers: 2 },
    { type: 'lock', at: [6, 6] },
    { type: 'jelly', at: [6, 6], layers: 2 },
    { type: 'lock', at: [4, 2] },
    { type: 'jelly', at: [4, 2], layers: 1 },
    { type: 'lock', at: [4, 6] },
    { type: 'jelly', at: [4, 6], layers: 1 },
    { type: 'jelly', at: [0, 0], layers: 1 },
    { type: 'jelly', at: [8, 0], layers: 1 },
    { type: 'jelly', at: [0, 8], layers: 1 },
    { type: 'jelly', at: [8, 8], layers: 1 },
  ],
});

// L77 — 最後準備
registerLevel({
  id: 77,
  worldId: 4,
  name: { 'zh-TW': '最後準備', en: 'Final Preparation' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 30 },
  objective: { type: 'score', target: 75000 },
  stars: { one: 75000, two: 120000, three: 187500, basis: 'score' },
});

// L78 — 光的終章
registerLevel({
  id: 78,
  worldId: 4,
  name: { 'zh-TW': '光的終章', en: 'Light Finale' },
  board: {
    width: 9,
    height: 9,
    empty: [],
    deliveryCells: [[1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [0, 8]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 32 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'drop', target: { count: 8 } },
      { type: 'score', target: 50000 },
    ],
  },
  stars: { one: 50000, two: 80000, three: 125000, basis: 'score' },
});

// L79 — 最終 Gate
registerLevel({
  id: 79,
  worldId: 4,
  name: { 'zh-TW': '最終 Gate', en: 'Final Gate' },
  board: { width: 9, height: 9, empty: [] },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 34 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 80000 },
    ],
  },
  stars: { one: 80000, two: 128000, three: 200000, basis: 'score' },
});

// L80 — Final Boss: 沉睡女神
registerLevel({
  id: 80,
  worldId: 4,
  name: { 'zh-TW': 'Final Boss: 沉睡女神', en: 'Final Boss: Sleeping Goddess' },
  board: {
    width: 9,
    height: 9,
    empty: [],
    deliveryCells: [[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8]],
  },
  gems: { colours: ['R', 'G', 'B', 'Y', 'P', 'W', 'O'] },
  constraints: { moveBudget: 40 },
  objective: {
    type: 'multi',
    objectives: [
      { type: 'score', target: 90000 },
      { type: 'clear', target: [{ blocker: 'jelly', count: 20 }, { blocker: 'lock', count: 8 }, { blocker: 'generator', count: 4 }] },
      { type: 'drop', target: { count: 10 } },
    ],
  },
  stars: { one: 90000, two: 144000, three: 225000, basis: 'score' },
  blockers: [
    // Generators at corners
    { type: 'generator', at: [0, 0], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [8, 0], generatorSpec: { spawnKind: 'jelly', everyNMoves: 3 } },
    { type: 'generator', at: [0, 8], generatorSpec: { spawnKind: 'lock', everyNMoves: 4 } },
    { type: 'generator', at: [8, 8], generatorSpec: { spawnKind: 'lock', everyNMoves: 4 } },
    // Stacked blockers around the core
    { type: 'lock', at: [2, 2] },
    { type: 'jelly', at: [2, 2], layers: 3 },
    { type: 'lock', at: [6, 2] },
    { type: 'jelly', at: [6, 2], layers: 3 },
    { type: 'lock', at: [2, 6] },
    { type: 'jelly', at: [2, 6], layers: 3 },
    { type: 'lock', at: [6, 6] },
    { type: 'jelly', at: [6, 6], layers: 3 },
    // Jelly ring
    { type: 'jelly', at: [1, 1], layers: 2 },
    { type: 'jelly', at: [7, 1], layers: 2 },
    { type: 'jelly', at: [1, 7], layers: 2 },
    { type: 'jelly', at: [7, 7], layers: 2 },
    { type: 'jelly', at: [4, 0], layers: 1 },
    { type: 'jelly', at: [0, 4], layers: 1 },
    { type: 'jelly', at: [8, 4], layers: 1 },
    { type: 'jelly', at: [4, 7], layers: 1 },
    // Locks around core
    { type: 'lock', at: [3, 2] },
    { type: 'lock', at: [5, 2] },
    { type: 'lock', at: [3, 6] },
    { type: 'lock', at: [5, 6] },
    // Unstable threats
    { type: 'unstable', at: [4, 1], unstableSpec: { countdown: 6 } },
    { type: 'unstable', at: [4, 7], unstableSpec: { countdown: 6 } },
    // Additional jelly
    { type: 'jelly', at: [3, 3], layers: 1 },
    { type: 'jelly', at: [5, 3], layers: 1 },
    { type: 'jelly', at: [3, 5], layers: 1 },
    { type: 'jelly', at: [5, 5], layers: 1 },
  ],
  specialRules: ['immovableCore(3, 3, 3, 3)', 'coreColourShift(5)'],
});
