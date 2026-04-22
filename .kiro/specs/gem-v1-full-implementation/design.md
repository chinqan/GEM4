# 技術設計文件：Gem v1 完整實作

## 1. 系統架構概覽

### 1.1 高階架構

```
┌─────────────────────────────────────────────────────┐
│                    瀏覽器環境                         │
│  ┌───────────┐  ┌───────────┐  ┌──────────────────┐ │
│  │  Input    │  │  Audio    │  │  Rendering       │ │
│  │  System   │  │  System   │  │  (PixiJS 8)      │ │
│  └─────┬─────┘  └─────┬─────┘  └────────┬─────────┘ │
│        │              │                  │           │
│        ▼              ▼                  ▼           │
│  ┌─────────────── Event Bus ──────────────────────┐ │
│  └─────────────────────┬──────────────────────────┘ │
│                        │                             │
│  ┌─────────────────────▼──────────────────────────┐ │
│  │              Game Runtime                       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │ │
│  │  │ Command  │ │ Game     │ │ State Machine  │  │ │
│  │  │ Queue    │ │ Loop     │ │                │  │ │
│  │  └────┬─────┘ └────┬─────┘ └────────────────┘  │ │
│  │       │            │                            │ │
│  │       ▼            ▼                            │ │
│  │  ┌──────────────────────────────────────────┐   │ │
│  │  │         Rules Engine (純邏輯)             │   │ │
│  │  │  board │ match-detect │ cascade │ scoring │   │ │
│  │  │  special-gems │ combo-matrix │ rng       │   │ │
│  │  └──────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐│
│  │  State   │  │  Save    │  │  i18n / Telemetry    ││
│  │  Store   │  │  System  │  │                      ││
│  └──────────┘  └──────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 1.2 核心設計原則

1. **規則與渲染分離**：`game/rules/` 為純 TypeScript，零瀏覽器依賴，可獨立測試
2. **事件驅動通訊**：各子系統透過 typed event bus 溝通，不直接互相引用
3. **固定時間步**：規則以 60Hz 固定步進執行，渲染以 rAF 插值
4. **確定性優先**：給定種子與指令序列，規則輸出 bit-exact 可重現
5. **物件池化**：hot path 零 GC 壓力，所有頻繁建立的物件皆池化

---

## 2. 資料模型

### 2.1 棋盤狀態

```typescript
// src/game/rules/board.ts

/** 格子座標，(0,0) 為左上角 */
export type CellPos = [col: number, row: number];

/** 單一格子的完整狀態 */
export interface Cell {
  gem: Gem | null;          // null = 空格（永久或暫時）
  blocker: BlockerState | null;
  isDelivery: boolean;      // Drop 目標格
  isEmpty: boolean;         // 永久空格（不可放置寶石）
}

/** 寶石 */
export interface Gem {
  colour: GemColour | null; // null 僅用於 Colour Gem
  special: SpecialGemType | null;
  locked: boolean;
  unstable: UnstableState | null;
}

/** Blocker 狀態 */
export type BlockerState =
  | { kind: 'jelly'; layers: 1 | 2 | 3 }
  | { kind: 'lock' }
  | { kind: 'generator'; spawnKind: BlockerKind; everyNMoves: number; movesSinceLastSpawn: number }
  | { kind: 'unstable'; countdown: number };

/** 不穩定寶石狀態 */
export interface UnstableState {
  countdown: number;  // 剩餘手數，歸零時爆炸
}

/** 棋盤 */
export interface Board {
  width: number;
  height: number;
  cells: Cell[][];    // cells[col][row]，column-major
}
```

### 2.2 型別定義（與 GDD 對齊）

```typescript
// src/types/index.ts

export type GemColour = 'R' | 'G' | 'B' | 'Y' | 'P' | 'W' | 'O';
export type SpecialGemType = 'lineH' | 'lineV' | 'area' | 'colour';
export type BlockerKind = 'jelly' | 'lock' | 'generator' | 'unstable';

export type ComboType =
  | 'line.line' | 'bomb.line' | 'bomb.bomb'
  | 'colour.line' | 'colour.bomb' | 'colour.colour';

export type MatchShape = 'straight3' | 'straight4' | 'straight5' | 'T' | 'L' | 'cross';

export interface MatchDescriptor {
  cells: CellPos[];
  shape: MatchShape;
  colour: GemColour;
  spawnsSpecial?: SpecialGemType;
  spawnAt?: CellPos;
}
```

### 2.3 關卡規格

```typescript
// src/game/level/level-spec.ts

export interface LevelSpec {
  id: number;
  worldId: number;
  name: { 'zh-TW': string; en: string };
  board: {
    width: number;
    height: number;
    empty: CellPos[];
    deliveryCells?: CellPos[];
    preSeeded?: Array<{ pos: CellPos; gem: Gem }>;
  };
  gems: {
    colours: GemColour[];
    weights?: Partial<Record<GemColour, number>>;
  };
  constraints: {
    moveBudget?: number;
    timeBudget?: number;
  };
  objective: Objective;
  stars: { one: number; two: number; three: number; basis: StarBasis };
  blockers?: BlockerPlacement[];
  specialRules?: string[];
  seed?: bigint;
}

export type StarBasis = 'score' | 'movesRemaining' | 'timeRemaining';

export type Objective =
  | { type: 'score'; target: number }
  | { type: 'clear'; target: Array<{ blocker: BlockerKind; count: number }> }
  | { type: 'collect'; target: Array<{ colour: GemColour; count: number }> }
  | { type: 'drop'; target: { count: number } }
  | { type: 'multi'; objectives: Exclude<Objective, { type: 'multi' }>[] };
```

---

## 3. 核心演算法

### 3.1 消除偵測（match-detect）

```
輸入：Board
輸出：MatchDescriptor[]

演算法：
1. 水平掃描：逐列從左到右，找連續同色 ≥3 的區段
2. 垂直掃描：逐行從上到下，找連續同色 ≥3 的區段
3. 形狀合併：
   a. 檢查水平+垂直是否構成 T/L/十字形
   b. 合併重疊的 match 為複合形狀
4. 分類：依格數與形狀判定 straight3/4/5、T、L、cross
5. 特殊寶石決定：依優先序 Colour > Area > Line 指派
6. 生成位置決定：
   - swap 觸發：玩家交換後到達該連線的寶石位置
   - cascade 觸發：圖案中央格
```

**複雜度**：O(W × H)，W=寬、H=高，最大 9×9=81 格

### 3.2 Cascade 流程

```
輸入：Board（消除後有空格）
輸出：一系列 CascadeStep

迴圈：
  1. 重力下落：每欄從底部往上掃，將寶石向下填入空格
  2. 頂端補充：空格從頂端以 RNG 生成新寶石
  3. 消除偵測：對新棋盤執行 match-detect
  4. 若有消除：
     a. chain++
     b. 執行消除（含特殊寶石被動啟動）
     c. 記錄 CascadeStep
     d. 回到步驟 1
  5. 若無消除：cascade 結束

安全上限：50 個 sub-step；超過則中止並 emit bug.cascadeOverrun
```

### 3.3 特殊寶石啟動

```
Line Bomb (H)：清除 bomb 所在列的所有格（0..width-1, bomb.row）
Line Bomb (V)：清除 bomb 所在行的所有格（bomb.col, 0..height-1）
Area Bomb：清除以 bomb 為中心的 3×3（裁切邊界）
Colour Gem：清除棋盤上所有 colour == target 的寶石

啟動順序：
1. 收集所有待啟動的特殊寶石（含被動觸發的）
2. 依位置排序（左上到右下）確保確定性
3. 依序啟動，每次啟動可能觸發新的被動啟動
4. 遞迴直到無更多待啟動
```

### 3.4 組合矩陣

```typescript
// src/game/rules/combo-matrix.ts

export function resolveCombo(a: SpecialGemType, b: SpecialGemType, origin: CellPos, board: Board): ClearResult {
  const key = comboKey(a, b); // 正規化為對稱 key
  switch (key) {
    case 'line.line':    return crossClear(origin, board);
    case 'bomb.line':    return wideCorsClear(origin, board, 3);
    case 'bomb.bomb':    return areaClear(origin, board, 5);
    case 'colour.line':  return colourTransform(origin, board, 'lineH'); // 隨機 H/V
    case 'colour.bomb':  return colourTransform(origin, board, 'area');
    case 'colour.colour': return fullBoardClear(board);
  }
}
```

### 3.5 計分引擎

```typescript
// src/game/rules/scoring.ts

export function chainMultiplier(chain: number): number {
  return Math.min(1.0 + (chain - 1) * 0.5, 4.0);
}

export function matchScore(shape: MatchShape, chain: number, cascadeStep: number): number {
  const base = BASE_SCORES[shape]; // 60/120/200/200/300
  const mult = chainMultiplier(chain);
  const cascadeBonus = cascadeStep > 0 ? 50 : 0;
  return Math.round(base * mult + cascadeBonus);
}

export function specialActivationScore(clearedCount: number, chain: number, isColour: boolean): number {
  const base = 60 * clearedCount + (isColour ? 500 : 0);
  return Math.round(base * chainMultiplier(chain));
}

export function comboScore(type: ComboType, chain: number): number {
  return Math.round(COMBO_BASE[type] * chainMultiplier(chain));
}
```

### 3.6 RNG 系統

```typescript
// src/game/rules/rng.ts

/** Mulberry32 PRNG — 32-bit state，可序列化 */
export class Mulberry32 {
  constructor(private state: number) {}

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 回傳 [min, max) 的整數 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min));
  }

  /** 從陣列中隨機選一個 */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)];
  }

  /** 序列化當前狀態 */
  serialize(): number { return this.state; }

  /** 從序列化狀態還原 */
  static deserialize(state: number): Mulberry32 {
    return new Mulberry32(state);
  }
}

/** 從 64-bit 種子建立 4 個獨立串流 */
export function createRngStreams(seed: bigint): RngStreams {
  const s = Number(seed & 0xFFFFFFFFn);
  return {
    boardInit:   new Mulberry32(s ^ 0x12345678),
    cascadeFill: new Mulberry32(s ^ 0x9ABCDEF0),
    juice:       new Mulberry32(s ^ 0xFEDCBA98),
    misc:        new Mulberry32(s ^ 0x76543210),
  };
}
```

---

## 4. 事件系統

### 4.1 Event Bus 實作

```typescript
// src/state/events.ts

export type GameEvent =
  | { kind: 'app.loaded'; ts: number; durationMs: number }
  | { kind: 'level.started'; levelId: number; seed: bigint }
  | { kind: 'command.applied'; command: Command; tick: number }
  | { kind: 'swap.invalid'; from: CellPos; to: CellPos }
  | { kind: 'match.landed'; matches: MatchDescriptor[]; chain: number }
  | { kind: 'cascade.stepBegan'; step: number; drops: ColumnDrop[] }
  | { kind: 'cascade.stepEnded'; step: number }
  | { kind: 'chain.escalated'; from: number; to: number }
  | { kind: 'special.spawned'; at: CellPos; type: SpecialGemType }
  | { kind: 'special.activated'; at: CellPos; type: SpecialGemType }
  | { kind: 'combo.triggered'; type: ComboType; originCells: CellPos[] }
  | { kind: 'objective.progressed'; delta: ObjectiveDelta }
  | { kind: 'level.resolved'; result: LevelResult }
  | { kind: 'reshuffle.triggered'; reason: 'noMoves' | 'manual' }
  | { kind: 'hint.shown'; cells: CellPos[] }
  | { kind: 'intensity.updated'; value: number }
  | { kind: 'visibility.resumed'; awayMs: number };

/** 輕量同步 event bus，pool 化事件物件 */
export class EventBusImpl implements EventBus {
  private handlers = new Map<string, Set<Function>>();

  emit(event: GameEvent): void {
    const set = this.handlers.get(event.kind);
    if (set) set.forEach(fn => fn(event));
  }

  on<K extends GameEvent['kind']>(
    kind: K,
    handler: (e: Extract<GameEvent, { kind: K }>) => void
  ): Unsubscribe {
    if (!this.handlers.has(kind)) this.handlers.set(kind, new Set());
    this.handlers.get(kind)!.add(handler);
    return () => this.handlers.get(kind)?.delete(handler);
  }

  once<K extends GameEvent['kind']>(
    kind: K,
    handler: (e: Extract<GameEvent, { kind: K }>) => void
  ): Unsubscribe {
    const unsub = this.on(kind, (e) => { unsub(); handler(e); });
    return unsub;
  }
}
```

### 4.2 Command Queue

```typescript
// src/game/runtime/command-queue.ts

export type Command =
  | { kind: 'swap'; from: CellPos; to: CellPos }
  | { kind: 'activateSpecial'; at: CellPos }
  | { kind: 'advanceResolving' }
  | { kind: 'requestHint' }
  | { kind: 'requestReshuffle' }
  | { kind: 'pause' }
  | { kind: 'resume' };

const MAX_QUEUE_DEPTH = 8;

export class CommandQueue {
  private queue: Command[] = [];

  enqueue(cmd: Command): boolean {
    if (this.queue.length >= MAX_QUEUE_DEPTH) return false;
    this.queue.push(cmd);
    return true;
  }

  drain(): Command | undefined {
    return this.queue.shift();
  }

  clear(): void {
    this.queue.length = 0;
  }

  get length(): number {
    return this.queue.length;
  }
}
```

---

## 5. 遊戲迴圈

### 5.1 固定時間步迴圈

```typescript
// src/game/runtime/game-loop.ts

const FIXED_DT = 1000 / 60;  // 16.667ms
const MAX_ACCUMULATOR = 250;  // 防止 tab 回來後暴衝

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private rules: RulesEngine,
    private renderer: Renderer,
    private audio: AudioSystem,
    private telemetry: TelemetrySystem,
    private eventBus: EventBus,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const dt = Math.min(now - this.lastTime, MAX_ACCUMULATOR);
    this.lastTime = now;
    this.accumulator += dt;

    // 1. Input step（由 input system 外部推入 command queue）

    // 2. Rules step — 固定 60Hz
    while (this.accumulator >= FIXED_DT) {
      this.rules.advance();
      this.accumulator -= FIXED_DT;
    }

    // 3. Audio step
    this.audio.update();

    // 4. Render step — 以 accumulator/FIXED_DT 做插值
    const alpha = this.accumulator / FIXED_DT;
    this.renderer.render(alpha);

    // 5. Telemetry step（內部 1Hz 節流）
    this.telemetry.tick(now);

    requestAnimationFrame(this.tick);
  };
}
```

---

## 6. 狀態機

### 6.1 狀態定義

```typescript
// src/state/app-state.ts
// 完整定義見 GDD 06§2.1，此處為實作摘要

export type AppStateKind =
  | 'splash' | 'menu' | 'worldMap' | 'levelSelect'
  | 'game' | 'pause' | 'levelComplete' | 'levelFail'
  | 'endless' | 'endlessEnd' | 'settings' | 'credits';
```

### 6.2 轉換表實作

```typescript
// src/state/state-machine.ts

const LEGAL_TRANSITIONS: Record<AppStateKind, AppStateKind[]> = {
  splash:        ['menu'],
  menu:          ['worldMap', 'settings', 'credits', 'endless'],
  worldMap:      ['levelSelect', 'menu', 'settings', 'worldMap'],
  levelSelect:   ['game', 'worldMap'],
  game:          ['pause', 'levelComplete', 'levelFail', 'settings'],
  pause:         ['game', 'menu', 'levelSelect', 'settings'],
  levelComplete: ['levelSelect', 'worldMap', 'game'],
  levelFail:     ['game', 'levelSelect'],
  endless:       ['pause', 'endlessEnd'],
  endlessEnd:    ['menu'],
  settings:      [], // 動態：returnTo 決定
  credits:       ['menu'],
};

export function transition(from: AppState, to: AppState): AppState {
  // settings 的 returnTo 特殊處理
  if (to.kind === 'settings') {
    if (from.kind === 'settings') throw new Error('settings 不可轉換至自身');
    return { kind: 'settings', returnTo: from };
  }
  if (from.kind === 'settings') {
    // 只能回到 returnTo
    return from.returnTo;
  }

  const allowed = LEGAL_TRANSITIONS[from.kind];
  if (!allowed.includes(to.kind)) {
    throw new Error(`非法轉換：${from.kind} → ${to.kind}`);
  }

  // pause 不變式檢查
  if (to.kind === 'pause') {
    if (from.kind !== 'game' && from.kind !== 'endless') {
      throw new Error('pause.previous 僅能是 game 或 endless');
    }
    return { kind: 'pause', previous: from };
  }

  return to;
}
```


---

## 7. 渲染架構

### 7.1 圖層階層

```typescript
// src/rendering/app-layers.ts

export function createLayerHierarchy(stage: Container): LayerRefs {
  const background = new Container();     // 世界背景
  const boardLayer = new Container();     // 棋盤容器
  const cellLayer = new Container();      // 格線（debug）
  const gemLayer = new Container();       // 寶石批次渲染
  const glowLayer = new Container();      // BlurFilter 光暈
  const specialOverlay = new Container(); // 特殊寶石動畫
  const selectionRing = new Container();  // 選取環
  const particleLayer = new Container();  // 粒子效果
  const fxLayer = new Container();        // 震波/色差
  const hudLayer = new Container();       // HUD
  const uiLayer = new Container();        // 浮動 UI
  const debugLayer = new Container();     // dev 模式

  boardLayer.addChild(cellLayer, gemLayer, glowLayer, specialOverlay, selectionRing);
  stage.addChild(background, boardLayer, particleLayer, fxLayer, hudLayer, uiLayer, debugLayer);

  return { background, boardLayer, cellLayer, gemLayer, glowLayer,
           specialOverlay, selectionRing, particleLayer, fxLayer,
           hudLayer, uiLayer, debugLayer };
}
```

### 7.2 圖形預設

```typescript
// src/rendering/design-tokens.ts

export const GRAPHICS_PRESETS = {
  low:    { glow: false, bloom: false, shimmer: false, particleCap: 100, targetFps: 30 },
  medium: { glow: true,  bloom: false, shimmer: false, particleCap: 300, targetFps: 60 },
  high:   { glow: true,  bloom: true,  shimmer: true,  particleCap: 500, targetFps: 60 },
} as const;
```

### 7.3 Viewport 與縮放

```typescript
// src/rendering/viewport.ts

/**
 * 計算 letterbox 縮放，確保棋盤在 1200×800 最低解析度下完整可見。
 * 棋盤置中，兩側留白。
 */
export function calculateViewport(
  canvasWidth: number,
  canvasHeight: number,
  boardWidth: number,
  boardHeight: number,
  cellSize: number,
): { scale: number; offsetX: number; offsetY: number } {
  const boardPixelW = boardWidth * cellSize;
  const boardPixelH = boardHeight * cellSize;
  const scale = Math.min(canvasWidth / boardPixelW, canvasHeight / boardPixelH) * 0.85;
  const offsetX = (canvasWidth - boardPixelW * scale) / 2;
  const offsetY = (canvasHeight - boardPixelH * scale) / 2;
  return { scale, offsetX, offsetY };
}
```

### 7.4 粒子系統（物件池）

```typescript
// src/rendering/particles.ts

export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private cap: number;

  constructor(cap: number) {
    this.cap = cap;
    for (let i = 0; i < cap; i++) {
      this.pool.push(new Particle());
    }
  }

  spawn(config: ParticleConfig): Particle | null {
    if (this.active.length >= this.cap) return null;
    const p = this.pool.pop();
    if (!p) return null;
    p.init(config);
    this.active.push(p);
    return p;
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(dt);
      if (p.isDead) {
        this.active.splice(i, 1);
        p.reset();
        this.pool.push(p);
      }
    }
  }
}
```

---

## 8. 音訊系統

### 8.1 架構

```typescript
// src/audio/audio-system.ts

export class AudioSystem {
  private unlocked = false;
  private intensity = 0;

  constructor(
    private eventBus: EventBus,
    private sfxCatalog: SfxCatalog,
    private adaptiveMusic: AdaptiveMusic,
  ) {
    this.setupEventListeners();
    this.setupAutoplayUnlock();
  }

  private setupAutoplayUnlock(): void {
    const unlock = () => {
      if (this.unlocked) return;
      Howler.ctx?.resume();
      this.unlocked = true;
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
  }

  private setupEventListeners(): void {
    this.eventBus.on('match.landed', (e) => {
      this.sfxCatalog.play(e.chain >= 3 ? 'chain.stinger' : 'match.base');
    });
    this.eventBus.on('special.spawned', () => this.sfxCatalog.play('special.spawn'));
    this.eventBus.on('special.activated', () => this.sfxCatalog.play('special.activate'));
    this.eventBus.on('combo.triggered', () => this.sfxCatalog.play('combo.blast'));
    this.eventBus.on('swap.invalid', () => this.sfxCatalog.play('swap.invalid'));
    this.eventBus.on('intensity.updated', (e) => { this.intensity = e.value; });
  }

  update(): void {
    this.adaptiveMusic.setIntensity(this.intensity);
  }

  suspend(): void {
    Howler.ctx?.suspend();
  }

  resume(): void {
    if (this.unlocked) Howler.ctx?.resume();
  }
}
```

### 8.2 自適應音樂

```typescript
// src/audio/adaptive-music.ts

/**
 * 垂直層疊音樂系統。
 * 每首曲目有 3-4 個同步播放的音軌層，
 * 依 intensity 值控制各層音量。
 */
export class AdaptiveMusic {
  private layers: Howl[] = [];
  private intensity = 0;

  setIntensity(value: number): void {
    this.intensity = Math.max(0, Math.min(1, value));
    // 層 0：永遠播放（基底）
    // 層 1：intensity > 0.3 時淡入
    // 層 2：intensity > 0.6 時淡入
    // 層 3：intensity > 0.85 時淡入
    const thresholds = [0, 0.3, 0.6, 0.85];
    this.layers.forEach((layer, i) => {
      const target = this.intensity >= thresholds[i] ? 1 : 0;
      layer.volume(target); // 實際實作用 lerp 平滑過渡
    });
  }
}
```

---

## 9. 輸入系統

### 9.1 統一指標抽象

```typescript
// src/input/input-system.ts

export interface NormalizedPointer {
  x: number;
  y: number;
  pointerId: number;
  type: 'down' | 'up' | 'move' | 'cancel';
  source: 'mouse' | 'touch' | 'pen';
}

export class InputSystem {
  constructor(
    private canvas: HTMLCanvasElement,
    private commandQueue: CommandQueue,
    private boardInput: BoardInput,
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
    this.canvas.addEventListener('pointerup', this.onPointer);
    this.canvas.addEventListener('pointercancel', this.onPointer);
    document.addEventListener('keydown', this.onKey);
  }

  private onPointer = (e: PointerEvent): void => {
    const normalized: NormalizedPointer = {
      x: e.offsetX, y: e.offsetY,
      pointerId: e.pointerId,
      type: e.type.replace('pointer', '') as NormalizedPointer['type'],
      source: e.pointerType as NormalizedPointer['source'],
    };
    this.boardInput.handlePointer(normalized);
  };

  private onKey = (e: KeyboardEvent): void => {
    // 鍵盤導航與快捷鍵處理
    // 方向鍵 → 移動游標
    // Space/Enter → 選取/交換
    // ESC → 暫停
    // M → 靜音
    // P → 暫停/繼續
  };
}
```

---

## 10. 存檔系統

### 10.1 讀寫策略

```typescript
// src/state/save-state.ts

const SAVE_KEY = 'gem.save.v1';
const DEBOUNCE_MS = 500;

export class SaveManager {
  private dirty = false;
  private debounceTimer: number | null = null;

  load(): SaveState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSaveState();
      return migrate(JSON.parse(raw));
    } catch {
      return defaultSaveState();
    }
  }

  save(state: SaveState, immediate = false): void {
    this.dirty = true;
    if (immediate) {
      this.flush(state);
      return;
    }
    if (this.debounceTimer !== null) return;
    this.debounceTimer = window.setTimeout(() => {
      this.flush(state);
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  private flush(state: SaveState): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      this.dirty = false;
    } catch {
      // localStorage 滿或被封鎖 → 顯示 toast 警告
      console.warn('無法儲存進度');
    }
  }
}
```

### 10.2 版本遷移

```typescript
// src/state/migrations.ts

export function migrate(data: unknown): SaveState {
  if (!isObject(data)) return defaultSaveState();
  const v = (data as { version?: unknown }).version;
  if (v === undefined) return defaultSaveState();
  if (v === 1) return data as SaveState;
  // 未知版本 → escrow 保存，啟用新存檔
  console.warn(`未知存檔版本 ${v}；保留至 escrow，啟用新存檔。`);
  try {
    localStorage.setItem(`gem.save.v1.escrow.${Date.now()}`, JSON.stringify(data));
  } catch { /* 忽略 */ }
  return defaultSaveState();
}
```

---

## 11. 國際化

```typescript
// src/i18n/translator.ts

export class Translator {
  private locale: string;
  private strings: Record<string, string> = {};

  constructor(defaultLocale: string) {
    this.locale = defaultLocale;
  }

  async load(locale: string): Promise<void> {
    const mod = await import(`./locales/${locale}.json`);
    this.strings = mod.default;
    this.locale = locale;
  }

  t(key: string, params?: Record<string, string | number>): string {
    let str = this.strings[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }
}
```

---

## 12. 關鍵流程時序圖

### 12.1 玩家交換寶石

```
玩家操作          Input System       Command Queue      Rules Engine        Event Bus          Renderer
   │                  │                   │                  │                  │                  │
   ├─ tap/drag ──────▶│                   │                  │                  │                  │
   │                  ├─ normalize ──────▶│                  │                  │                  │
   │                  │                   ├─ enqueue(swap) ─▶│                  │                  │
   │                  │                   │                  ├─ validate        │                  │
   │                  │                   │                  │  ├─ 無效 ────────▶ emit swap.invalid │
   │                  │                   │                  │  │               │ ─────────────────▶ 抖動動畫
   │                  │                   │                  │  │               │                  │
   │                  │                   │                  │  ├─ 有效         │                  │
   │                  │                   │                  │  │  moves--      │                  │
   │                  │                   │                  │  │  match-detect │                  │
   │                  │                   │                  │  │  ├─ 有消除 ──▶ emit match.landed │
   │                  │                   │                  │  │  │            │ ─────────────────▶ 消除動畫
   │                  │                   │                  │  │  │  cascade   │                  │
   │                  │                   │                  │  │  │  ├─ 掉落 ─▶ emit cascade.step │
   │                  │                   │                  │  │  │  │         │ ─────────────────▶ 掉落動畫
   │                  │                   │                  │  │  │  └─ 遞迴   │                  │
   │                  │                   │                  │  │  └─ 無消除    │                  │
   │                  │                   │                  │  │     回 playing │                  │
```

### 12.2 關卡結束流程

```
Rules Engine                    Event Bus                    State Machine
     │                              │                              │
     ├─ 偵測 outOfMoves             │                              │
     │  ├─ resolving 中？            │                              │
     │  │  是 → 等 cascade 完成      │                              │
     │  │  否 → 立即結算             │                              │
     │  │                           │                              │
     │  ├─ 目標達成？                │                              │
     │  │  是 → 播剩餘手數獎勵      │                              │
     │  │       emit level.resolved  │                              │
     │  │       (cleared: true) ────▶│ ────────────────────────────▶ levelComplete
     │  │                           │                              │
     │  │  否 → emit level.resolved  │                              │
     │  │       (cleared: false) ───▶│ ────────────────────────────▶ levelFail
```

---

## 13. 測試策略

### 13.1 單元測試（Vitest）

| 模組 | 測試重點 | 覆蓋率目標 |
|---|---|---|
| `game/rules/board` | 棋盤建立、格子操作、有效性檢查 | 100% |
| `game/rules/match-detect` | 所有形狀偵測（3/4/5/T/L/cross） | 100% |
| `game/rules/cascade` | 重力、補充、遞迴消除、安全上限 | 100% |
| `game/rules/scoring` | 倍率公式、各事件計分、邊界值 | 100% |
| `game/rules/special-gems` | 生成優先序、啟動效果、被動觸發 | 100% |
| `game/rules/combo-matrix` | 6 種組合、對稱性、效果正確性 | 100% |
| `game/rules/rng` | 確定性、分佈均勻性、序列化 | 100% |
| `game/level/objective` | 5 種目標類型的進度追蹤與完成判定 | 100% |
| `game/level/blocker` | 4 種 blocker 行為、交互矩陣 | 100% |
| `state/state-machine` | 合法轉換、不變式、邊界情況 | 100% |
| `state/save-state` | 讀寫、遷移、降級 | 95%+ |

### 13.2 Property-Based Testing

| 屬性 | 對應 CP | 測試方式 |
|---|---|---|
| 棋盤有效性不變式 | CP-1 | 隨機操作序列後驗證棋盤狀態 |
| 分數單調性 | CP-2 | 隨機遊玩序列中追蹤分數變化 |
| 連鎖倍率邊界 | CP-3 | 任意 chain count 驗證倍率範圍 |
| 手數計數一致性 | CP-4 | 隨機指令序列驗證手數遞減規則 |
| Cascade 完成保證 | CP-5 | 模擬 outOfMoves 期間的 cascade |
| 特殊寶石優先序確定性 | CP-6 | 相同輸入多次執行比對輸出 |
| 狀態機轉換合法性 | CP-7 | 隨機轉換序列驗證不變式 |
| RNG 確定性 | CP-8 | 相同種子+指令序列比對事件日誌 |
| 組合對稱性 | CP-9 | 所有組合對驗證 A×B == B×A |
| Blocker 層級完整性 | CP-10 | 多重清除來源命中同格驗證層數 |

### 13.3 確定性 CI 測試

```typescript
// tests/unit/determinism.test.ts

test('相同種子與指令序列產生相同事件日誌', () => {
  const seed = 42n;
  const commands = generateFixedCommands(100);

  const log1 = runSimulation(seed, commands);
  const log2 = runSimulation(seed, commands);
  const log3 = runSimulation(seed, commands);

  // 排除 juice 串流事件後 bit-exact 比對
  expect(filterNonJuice(log1)).toEqual(filterNonJuice(log2));
  expect(filterNonJuice(log2)).toEqual(filterNonJuice(log3));
});
```

### 13.4 E2E 測試（Playwright）

| 場景 | 驗證重點 |
|---|---|
| 首次啟動到完成 L1 | 完整 onboarding 流程 |
| 特殊寶石生成與啟動 | 視覺回饋正確性 |
| 暫停/繼續/重試 | 狀態機轉換 |
| 設定變更 | 持久化與即時生效 |
| 瀏覽器相容性 | Chrome/Firefox/Safari/Edge |

---

## 14. 效能最佳化策略

| 策略 | 適用範圍 | 說明 |
|---|---|---|
| 物件池化 | 粒子、事件、MatchDescriptor | 避免 hot path 上的 GC |
| ParticleContainer | 寶石渲染 | 批次渲染減少 draw calls |
| Filter 層級套用 | BlurFilter、Bloom | 套用於圖層而非個別物件 |
| 固定時間步 | 規則引擎 | 與幀率解耦，確保一致性 |
| Lazy loading | 世界 bundle | 僅在進入世界時載入 |
| Atlas 打包 | 所有圖像資產 | 減少 HTTP 請求與紋理切換 |
| Debounced 存檔 | localStorage | 避免連鎖期間高頻寫入 |
| 累加器上限 | 遊戲迴圈 | 防止 tab 回來後暴衝 |
