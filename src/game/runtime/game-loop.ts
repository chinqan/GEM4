// ─── 遊戲迴圈與指令處理 ─────────────────────────────────────
// 純 TypeScript，零瀏覽器依賴
// CommandQueue + RulesEngine：指令佇列、規則步進、事件發射

import type {
  CellPos,
  GemColour,
  MatchDescriptor,
  LevelResult,
  ObjectiveDelta,
  ColumnDrop,
  SpecialGemType,
  ComboType,
} from '../../types';
import type { Board } from '../rules/board';
import { getCell, isValidPos, getNeighbors, cloneBoard } from '../rules/board';
import { detectMatches } from '../rules/match-detect';
import { runCascade } from '../rules/cascade';
import {
  matchScore,
  specialActivationScore,
  comboScore,
  remainingMovesBonus,
  remainingTimeBonus,
  chainMultiplier,
} from '../rules/scoring';
import { resolveCombo } from '../rules/combo-matrix';
import { processBlockersOnClear } from '../../game/level/blocker';
import { findValidSwaps } from './reshuffle';
import type { LevelSpec } from '../level/level-spec';
import type { ObjectiveTracker } from '../level/objective';
import { createTracker, calculateStars, ScoreTracker, CollectTracker } from '../level/objective';
import type { Mulberry32 } from '../rules/rng';

// ─── Event Bus 最小介面 ─────────────────────────────────────

/** 遊戲事件聯集型別（最小子集，供 RulesEngine 使用） */
export type GameEvent =
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
  | { kind: 'intensity.updated'; value: number }
  | { kind: 'command.applied'; command: Command; tick: number };

/** RulesEngine 所需的 event bus 最小介面 */
export interface GameEventBus {
  emit(event: GameEvent): void;
}

// ─── 15.1 CommandQueue ──────────────────────────────────────

/** 指令型別 */
export type Command =
  | { kind: 'swap'; from: CellPos; to: CellPos }
  | { kind: 'activateSpecial'; at: CellPos }
  | { kind: 'advanceResolving' }
  | { kind: 'requestHint' }
  | { kind: 'requestReshuffle' }
  | { kind: 'pause' }
  | { kind: 'resume' };

const MAX_QUEUE_DEPTH = 8;

/**
 * FIFO 指令佇列，深度上限 8。
 * 用於緩衝玩家輸入，由 RulesEngine 每次 advance() 消耗一個。
 */
export class CommandQueue {
  private queue: Command[] = [];

  /** 入列。佇列已滿時回傳 false。 */
  enqueue(cmd: Command): boolean {
    if (this.queue.length >= MAX_QUEUE_DEPTH) return false;
    this.queue.push(cmd);
    return true;
  }

  /** 取出下一個指令，佇列為空時回傳 undefined。 */
  drain(): Command | undefined {
    return this.queue.shift();
  }

  /** 清空佇列。 */
  clear(): void {
    this.queue.length = 0;
  }

  /** 目前佇列長度。 */
  get length(): number {
    return this.queue.length;
  }
}

// ─── 15.2–15.6 RulesEngine ─────────────────────────────────

/** RulesEngine 建構參數 */
export interface RulesEngineConfig {
  board: Board;
  spec: LevelSpec;
  cascadeRng: Mulberry32;
  eventBus: GameEventBus;
  commandQueue: CommandQueue;
}

/**
 * 純邏輯規則引擎。
 * 每次 advance() 從 CommandQueue drain 一個指令並執行對應規則。
 * 管理棋盤狀態、分數、手數、連鎖、resolving 狀態、intensity。
 */
export class RulesEngine {
  // ─── 公開狀態 ──────────────────────────────────────────
  board: Board;
  score = 0;
  movesRemaining: number;
  /** 計時關卡剩餘秒數；非計時關卡為 Infinity */
  timeRemaining: number;
  chainCount = 0;
  cascadeDepth = 0;
  resolving = false;
  paused = false;
  settled = false; // 關卡已結算
  tick = 0;

  // ─── intensity 追蹤 ────────────────────────────────────
  private _intensity = 0;
  private recentChains: number[] = [];
  private scoreMomentum = 0;
  private lastScore = 0;

  // ─── 內部 ──────────────────────────────────────────────
  private readonly spec: LevelSpec;
  private readonly cascadeRng: Mulberry32;
  private readonly eventBus: GameEventBus;
  private readonly commandQueue: CommandQueue;
  public readonly tracker: ObjectiveTracker;
  private readonly colours: GemColour[];

  constructor(config: RulesEngineConfig) {
    this.board = config.board;
    this.spec = config.spec;
    this.cascadeRng = config.cascadeRng;
    this.eventBus = config.eventBus;
    this.commandQueue = config.commandQueue;
    this.movesRemaining = config.spec.constraints.moveBudget ?? Infinity;
    this.timeRemaining = config.spec.constraints.timeBudget ?? Infinity;
    this.tracker = createTracker(config.spec.objective);
    this.colours = [...config.spec.gems.colours];
  }

  /** 目前 intensity 值 (0..1) */
  get intensity(): number {
    return this._intensity;
  }

  // ─── 15.2 advance() ───────────────────────────────────

  /**
   * 每個固定時間步呼叫一次。
   * Drain 一個指令並執行對應規則邏輯。
   */
  advance(): void {
    if (this.settled || this.paused) return;

    this.tick++;

    const cmd = this.commandQueue.drain();
    if (!cmd) return;

    this.eventBus.emit({ kind: 'command.applied', command: cmd, tick: this.tick });

    switch (cmd.kind) {
      case 'swap':
        this.processSwap(cmd.from, cmd.to);
        break;
      case 'activateSpecial':
        this.processActivateSpecial(cmd.at);
        break;
      case 'pause':
        this.paused = true;
        break;
      case 'resume':
        this.paused = false;
        break;
      case 'requestReshuffle':
        this.processReshuffle();
        break;
      case 'requestHint':
        // Hint 由 HintTimer 處理，此處不做額外動作
        break;
      case 'advanceResolving':
        // 外部推進 resolving 動畫步驟（渲染層使用）
        break;
    }
  }

  // ─── 15.3 Swap 指令處理 ────────────────────────────────

  private processSwap(from: CellPos, to: CellPos): void {
    // 15.4: resolving 期間拒絕 swap
    if (this.resolving) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 驗證：座標有效
    if (!isValidPos(this.board, from) || !isValidPos(this.board, to)) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 驗證：相鄰
    if (!this.isAdjacent(from, to)) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    const cellFrom = getCell(this.board, from)!;
    const cellTo = getCell(this.board, to)!;

    // 驗證：非空格
    if (cellFrom.isEmpty || cellTo.isEmpty) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 驗證：有寶石
    // 允許傳送道具與寶石交換（一邊有 gem，另一邊有 deliveryItem）
    if (!cellFrom.gem && !cellFrom.deliveryItem) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }
    if (!cellTo.gem && !cellTo.deliveryItem) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 驗證：非 locked
    if (cellFrom.gem?.locked || cellTo.gem?.locked) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 驗證：非 lock blocker
    if (cellFrom.blocker?.kind === 'lock' || cellTo.blocker?.kind === 'lock') {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 檢查是否為特殊寶石組合
    if (cellFrom.gem?.special && cellTo.gem?.special) {
      this.processComboSwap(from, to);
      return;
    }

    // 執行交換（支援 gem ↔ deliveryItem 互換）
    const tempGem = cellFrom.gem;
    const tempDelivery = cellFrom.deliveryItem;
    cellFrom.gem = cellTo.gem;
    cellFrom.deliveryItem = cellTo.deliveryItem;
    cellTo.gem = tempGem;
    cellTo.deliveryItem = tempDelivery;

    // 偵測消除
    const matches = detectMatches(this.board, { swapPos: to });

    if (matches.length === 0) {
      // 無消除 → 交換回來（無效交換）
      cellTo.gem = cellFrom.gem;
      cellTo.deliveryItem = cellFrom.deliveryItem;
      cellFrom.gem = tempGem;
      cellFrom.deliveryItem = tempDelivery;
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 有效交換：扣手數
    this.movesRemaining--;

    // 進入 resolving
    this.resolving = true;
    this.chainCount = 0;
    this.cascadeDepth = 0;

    // 處理消除 + cascade
    this.processMatchesAndCascade(matches);

    // 結束 resolving
    this.resolving = false;

    // 更新 intensity
    this.updateIntensity();

    // 15.5: 檢查關卡結束
    this.checkEndOfLevel();
  }

  private processComboSwap(from: CellPos, to: CellPos): void {
    const cellFrom = getCell(this.board, from)!;
    const cellTo = getCell(this.board, to)!;

    const result = resolveCombo(this.board, from, to, this.cascadeRng);
    if (!result || result.clearedCells.length === 0) {
      this.eventBus.emit({ kind: 'swap.invalid', from, to });
      return;
    }

    // 有效組合：扣手數
    this.movesRemaining--;

    this.resolving = true;
    this.chainCount = 1;
    this.cascadeDepth = 0;

    this.eventBus.emit({
      kind: 'combo.triggered',
      type: this.getComboType(cellFrom.gem!.special!, cellTo.gem!.special!),
      originCells: [from, to],
    });

    // 計分
    const comboType = this.getComboType(cellFrom.gem!.special!, cellTo.gem!.special!);
    if (comboType) {
      this.score += comboScore(comboType, this.chainCount);
    }

    // 處理 blocker
    processBlockersOnClear(this.board, result.clearedCells);

    // 更新目標追蹤
    this.updateObjectiveFromCleared(result.clearedCells);

    // 執行 cascade
    const cascadeResult = runCascade(
      this.board,
      this.cascadeRng,
      this.colours,
      this.chainCount,
    );

    this.processCascadeResult(cascadeResult);

    this.resolving = false;
    this.updateIntensity();
    this.checkEndOfLevel();
  }

  private getComboType(a: SpecialGemType, b: SpecialGemType): ComboType {
    // 正規化
    const normalize = (t: SpecialGemType): 'line' | 'bomb' | 'colour' => {
      if (t === 'lineH' || t === 'lineV') return 'line';
      if (t === 'area') return 'bomb';
      return 'colour';
    };
    const na = normalize(a);
    const nb = normalize(b);
    const order: Record<string, number> = { line: 0, bomb: 1, colour: 2 };
    const first = order[na] >= order[nb] ? na : nb;
    const second = order[na] >= order[nb] ? nb : na;
    return `${first}.${second}` as ComboType;
  }

  // ─── 消除 + Cascade 處理 ──────────────────────────────

  private processMatchesAndCascade(initialMatches: MatchDescriptor[]): void {
    this.chainCount = 1;

    // 處理初始消除
    this.processMatches(initialMatches, this.chainCount);

    // 執行 cascade
    const cascadeResult = runCascade(
      this.board,
      this.cascadeRng,
      this.colours,
      this.chainCount,
    );

    this.processCascadeResult(cascadeResult);
  }

  private processMatches(matches: MatchDescriptor[], chain: number): void {
    this.eventBus.emit({ kind: 'match.landed', matches, chain });

    // 計分
    for (const match of matches) {
      this.score += matchScore(match.shape, chain, this.cascadeDepth);

      // 特殊寶石生成事件
      if (match.spawnsSpecial && match.spawnAt) {
        this.eventBus.emit({
          kind: 'special.spawned',
          at: match.spawnAt,
          type: match.spawnsSpecial,
        });
      }
    }

    // 收集所有被消除的格子
    const allClearedCells: CellPos[] = [];
    const seen = new Set<string>();
    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell[0]},${cell[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          allClearedCells.push(cell);
        }
      }
    }

    // 處理 blocker
    processBlockersOnClear(this.board, allClearedCells);

    // 更新目標追蹤
    this.updateObjectiveFromCleared(allClearedCells);
    this.updateObjectiveFromMatches(matches);

    // 清除寶石（cascade 的 runCascade 會處理後續，但初始消除需要手動清除）
    for (const pos of allClearedCells) {
      const cell = getCell(this.board, pos);
      if (cell) {
        // 保留 spawnAt 位置的特殊寶石
        const isSpawnAt = matches.some(
          (m) =>
            m.spawnAt &&
            m.spawnsSpecial &&
            m.spawnAt[0] === pos[0] &&
            m.spawnAt[1] === pos[1],
        );
        if (!isSpawnAt) {
          cell.gem = null;
        } else if (cell.gem) {
          // 設定特殊寶石
          const match = matches.find(
            (m) =>
              m.spawnAt &&
              m.spawnsSpecial &&
              m.spawnAt[0] === pos[0] &&
              m.spawnAt[1] === pos[1],
          );
          if (match?.spawnsSpecial) {
            cell.gem.special = match.spawnsSpecial;
          }
        }
      }
    }
  }

  private processCascadeResult(result: ReturnType<typeof runCascade>): void {
    for (const step of result.steps) {
      const prevChain = this.chainCount;
      this.chainCount = step.chain;
      this.cascadeDepth = step.step;

      if (step.chain > prevChain) {
        this.eventBus.emit({
          kind: 'chain.escalated',
          from: prevChain,
          to: step.chain,
        });
      }

      this.eventBus.emit({
        kind: 'cascade.stepBegan',
        step: step.step,
        drops: step.drops,
      });

      // 計分
      for (const match of step.matches) {
        this.score += matchScore(match.shape, step.chain, step.step);
      }

      // 處理 blocker
      processBlockersOnClear(this.board, step.clearedCells);

      // 更新目標
      this.updateObjectiveFromCleared(step.clearedCells);
      this.updateObjectiveFromMatches(step.matches);

      this.eventBus.emit({ kind: 'cascade.stepEnded', step: step.step });
    }

    // 記錄 chain 供 intensity 計算
    if (result.totalChain > 0) {
      this.recentChains.push(result.totalChain);
      // 只保留最近 10 次
      if (this.recentChains.length > 10) {
        this.recentChains.shift();
      }
    }
  }

  // ─── 目標追蹤 ─────────────────────────────────────────

  private updateObjectiveFromCleared(clearedCells: CellPos[]): void {
    // 更新 score tracker
    if (this.tracker instanceof ScoreTracker) {
      (this.tracker as ScoreTracker).updateScore(this.score);
    }
    // Multi tracker 中的 ScoreTracker 也需要更新
    this.updateScoreInTracker();
  }

  private updateObjectiveFromMatches(matches: MatchDescriptor[]): void {
    // 更新 collect tracker
    if (this.tracker instanceof CollectTracker) {
      for (const match of matches) {
        (this.tracker as CollectTracker).addCollected(match.colour, match.cells.length);
      }
    }
  }

  private updateScoreInTracker(): void {
    // 遞迴更新所有 ScoreTracker
    const updateTracker = (t: ObjectiveTracker) => {
      if (t instanceof ScoreTracker) {
        t.updateScore(this.score);
      }
      if ('getTrackers' in t && typeof (t as any).getTrackers === 'function') {
        for (const sub of (t as any).getTrackers()) {
          updateTracker(sub);
        }
      }
    };
    updateTracker(this.tracker);
  }

  // ─── 特殊寶石啟動 ─────────────────────────────────────

  private processActivateSpecial(at: CellPos): void {
    if (this.resolving) return;

    const cell = getCell(this.board, at);
    if (!cell?.gem?.special) return;

    // 扣手數
    this.movesRemaining--;
    this.resolving = true;
    this.chainCount = 1;
    this.cascadeDepth = 0;

    this.eventBus.emit({
      kind: 'special.activated',
      at,
      type: cell.gem.special,
    });

    // cascade 會處理後續
    const cascadeResult = runCascade(
      this.board,
      this.cascadeRng,
      this.colours,
      this.chainCount,
    );

    this.processCascadeResult(cascadeResult);

    this.resolving = false;
    this.updateIntensity();
    this.checkEndOfLevel();
  }

  // ─── 重洗 ─────────────────────────────────────────────

  private processReshuffle(): void {
    this.eventBus.emit({ kind: 'reshuffle.triggered', reason: 'manual' });
  }

  // ─── 15.4 Resolving 狀態管理 ──────────────────────────
  // resolving 標誌在 processSwap / processComboSwap / processActivateSpecial
  // 的開頭設為 true，結尾設為 false。
  // advance() 中 swap 指令會在 resolving 時被拒絕。

  // ─── 計時關卡時間遞減 ─────────────────────────────────

  /**
   * 計時關卡每幀呼叫，遞減剩餘時間並在歸零時結算失敗。
   * 暫停 / resolving / 非計時關卡 / 已結算 → no-op。
   */
  tickTime(deltaSeconds: number): void {
    if (this.settled || this.paused) return;
    if (this.timeRemaining === Infinity) return;
    if (deltaSeconds <= 0) return;
    this.timeRemaining = Math.max(0, this.timeRemaining - deltaSeconds);
    if (this.timeRemaining === 0) {
      this.checkEndOfLevel();
    }
  }

  // ─── 15.5 End-of-level 時序 ───────────────────────────

  private checkEndOfLevel(): void {
    if (this.settled) return;

    // resolving 期間不結算（cascade 必須完成）
    // 此方法在 resolving = false 後才被呼叫，所以 cascade 已完成

    const objectiveComplete = this.tracker.isComplete();
    const outOfMoves =
      this.movesRemaining !== Infinity && this.movesRemaining <= 0;
    const outOfTime =
      this.timeRemaining !== Infinity && this.timeRemaining <= 0;

    const movesRem = this.movesRemaining === Infinity ? 0 : this.movesRemaining;
    const timeRem = this.timeRemaining === Infinity ? 0 : this.timeRemaining;

    if (objectiveComplete) {
      // 關卡通過：加上剩餘手數 / 剩餘時間獎勵
      this.score += remainingMovesBonus(movesRem);
      this.score += remainingTimeBonus(timeRem);
      this.updateScoreInTracker();

      const stars = calculateStars(this.spec.stars, this.score, movesRem, timeRem);

      this.settled = true;
      this.eventBus.emit({
        kind: 'level.resolved',
        result: {
          levelId: this.spec.id,
          cleared: true,
          stars,
          score: this.score,
          chainMax: Math.max(...this.recentChains, this.chainCount, 0),
          movesRemaining: movesRem,
          timeRemaining: timeRem,
          specialSpawnedCount: 0, // TODO: 追蹤
          durationMs: 0, // TODO: 追蹤
        },
      });
    } else if (outOfMoves || outOfTime) {
      // 手數或時間用盡且目標未達成
      this.settled = true;
      this.eventBus.emit({
        kind: 'level.resolved',
        result: {
          levelId: this.spec.id,
          cleared: false,
          stars: 0,
          score: this.score,
          chainMax: Math.max(...this.recentChains, this.chainCount, 0),
          movesRemaining: 0,
          timeRemaining: 0,
          specialSpawnedCount: 0,
          durationMs: 0,
        },
      });
    }
  }

  // ─── 15.6 Intensity 計算 ──────────────────────────────

  /**
   * Intensity 公式：基於最近連鎖數、cascade 深度、分數動量。
   * 值域 [0, 1]，用於驅動自適應音樂層疊。
   *
   * 計算方式：
   * - chainFactor: 最近連鎖的平均值 / 10（上限 0.4）
   * - cascadeFactor: 最近 cascade 深度 / 20（上限 0.3）
   * - momentumFactor: 最近分數增量 / 5000（上限 0.3）
   * - intensity = chainFactor + cascadeFactor + momentumFactor
   */
  private updateIntensity(): void {
    // Chain factor
    const avgChain =
      this.recentChains.length > 0
        ? this.recentChains.reduce((a, b) => a + b, 0) / this.recentChains.length
        : 0;
    const chainFactor = Math.min(avgChain / 10, 0.4);

    // Cascade factor
    const cascadeFactor = Math.min(this.cascadeDepth / 20, 0.3);

    // Score momentum
    const scoreDelta = this.score - this.lastScore;
    this.lastScore = this.score;
    // Exponential moving average
    this.scoreMomentum = this.scoreMomentum * 0.7 + scoreDelta * 0.3;
    const momentumFactor = Math.min(this.scoreMomentum / 5000, 0.3);

    const newIntensity = Math.max(0, Math.min(1, chainFactor + cascadeFactor + momentumFactor));

    // 只在顯著變化時 emit（差異 > 0.02）
    if (Math.abs(newIntensity - this._intensity) > 0.02) {
      this._intensity = newIntensity;
      this.eventBus.emit({ kind: 'intensity.updated', value: this._intensity });
    }
  }

  // ─── 輔助 ─────────────────────────────────────────────

  private isAdjacent(a: CellPos, b: CellPos): boolean {
    const dc = Math.abs(a[0] - b[0]);
    const dr = Math.abs(a[1] - b[1]);
    return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
  }
}

// ─── 15.7 固定時間步迴圈 ────────────────────────────────────

/** 渲染器最小介面（尚未實作的系統） */
export interface Renderer {
  render(alpha: number): void;
}

/** 音訊系統最小介面（尚未實作的系統） */
export interface AudioSystem {
  update(): void;
}

/** 遙測系統最小介面（尚未實作的系統） */
export interface TelemetrySystem {
  tick(now: number): void;
}

/** EventBus 最小介面（供 GameLoop 使用） */
export interface EventBus {
  emit(event: GameEvent): void;
}

/** 固定時間步（16.667ms ≈ 60Hz） */
export const FIXED_DT = 1000 / 60;

/** 累加器上限（防止 tab 回來後暴衝） */
export const MAX_ACCUMULATOR = 250;

/**
 * 固定時間步遊戲迴圈。
 *
 * 使用 requestAnimationFrame 驅動渲染，以固定 60Hz 步進執行規則引擎。
 * 累加器上限 250ms 防止 tab 切回後的暴衝。
 *
 * 核心邏輯（tick 方法）可透過直接呼叫進行測試，不依賴 rAF。
 */
export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private rules: RulesEngine,
    private renderer: Renderer,
    private audio: AudioSystem,
    private telemetry: TelemetrySystem,
    private eventBus: EventBus,
  ) {}

  /** 啟動遊戲迴圈 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** 停止遊戲迴圈 */
  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  /** 是否正在運行 */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * 單幀 tick。
   *
   * 可直接呼叫以進行測試（繞過 rAF）。
   * 在正常運行時由 requestAnimationFrame 回呼。
   */
  tick = (now: number): void => {
    if (!this.running) return;

    // 計算 delta time，上限為 MAX_ACCUMULATOR 防止暴衝
    const dt = Math.min(now - this.lastTime, MAX_ACCUMULATOR);
    this.lastTime = now;
    this.accumulator += dt;

    // 1. Rules step — 固定 60Hz
    while (this.accumulator >= FIXED_DT) {
      this.rules.tickTime?.(FIXED_DT / 1000);
      this.rules.advance();
      this.accumulator -= FIXED_DT;
    }

    // 2. Audio step
    this.audio.update();

    // 3. Render step — 以 accumulator/FIXED_DT 做插值
    const alpha = this.accumulator / FIXED_DT;
    this.renderer.render(alpha);

    // 4. Telemetry step
    this.telemetry.tick(now);

    // 排程下一幀
    this.rafId = requestAnimationFrame(this.tick);
  };

  /** 取得目前累加器值（供測試用） */
  getAccumulator(): number {
    return this.accumulator;
  }
}
