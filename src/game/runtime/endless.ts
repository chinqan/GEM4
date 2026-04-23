// ─── 36. Endless 模式實作 ───────────────────────────────────
// 36.1 難度升階系統（1–15 級，每 5000 分升級）
// 36.2 漸進式參數調整（顏色數、blocker 生成、棋盤大小）
// 36.3 結束條件（3 次重洗用盡、玩家退出、120 秒無操作）
// 36.4 本機排行榜（高分/最長連鎖/最多特殊 各前 10）
// 36.5 endlessEnd 畫面與紀錄比對

import type { GemColour, BlockerKind, EndlessRunState } from '../../types';
import type { EndlessBestRecords } from '../../state/save-state';

// ─── 36.1 難度升階系統 ─────────────────────────────────────

/** 每 5000 分升一級 */
export const POINTS_PER_LEVEL = 5000;

/** 最大難度等級 */
export const MAX_DIFFICULTY = 15;

/** 最大重洗次數 */
export const MAX_RESHUFFLES = 3;

/** 無操作超時（毫秒） */
export const IDLE_TIMEOUT_MS = 120_000;

/**
 * 根據分數計算難度等級（1–15）。
 */
export function calculateDifficulty(score: number): number {
  const level = Math.floor(score / POINTS_PER_LEVEL) + 1;
  return Math.min(level, MAX_DIFFICULTY);
}

// ─── 36.2 漸進式參數調整 ──────────────────────────────────

/** 難度等級對應的遊戲參數 */
export interface DifficultyParams {
  /** 難度等級 (1–15) */
  level: number;
  /** 可用寶石顏色數 (4–7) */
  colourCount: number;
  /** 可用寶石顏色 */
  colours: GemColour[];
  /** 棋盤寬度 */
  boardWidth: number;
  /** 棋盤高度 */
  boardHeight: number;
  /** 是否生成 blocker */
  blockersEnabled: boolean;
  /** 可生成的 blocker 種類 */
  blockerKinds: BlockerKind[];
  /** Blocker 生成頻率（每 N 手生成一個，0=不生成） */
  blockerSpawnEveryNMoves: number;
}

/** 所有 7 色寶石，依引入順序排列 */
const ALL_COLOURS: GemColour[] = ['R', 'G', 'B', 'Y', 'P', 'W', 'O'];

/**
 * 根據難度等級取得遊戲參數。
 *
 * 漸進式調整：
 * - Level 1–3:  4 色, 7×7, 無 blocker
 * - Level 4–6:  5 色, 7×7, jelly
 * - Level 7–9:  6 色, 8×8, jelly + lock
 * - Level 10–12: 6 色, 8×8, jelly + lock + generator
 * - Level 13–15: 7 色, 9×9, 全部 blocker
 */
export function getDifficultyParams(level: number): DifficultyParams {
  const clamped = Math.max(1, Math.min(level, MAX_DIFFICULTY));

  let colourCount: number;
  let boardWidth: number;
  let boardHeight: number;
  let blockerKinds: BlockerKind[];
  let blockerSpawnEveryNMoves: number;

  if (clamped <= 3) {
    colourCount = 4;
    boardWidth = 7;
    boardHeight = 7;
    blockerKinds = [];
    blockerSpawnEveryNMoves = 0;
  } else if (clamped <= 6) {
    colourCount = 5;
    boardWidth = 7;
    boardHeight = 7;
    blockerKinds = ['jelly'];
    blockerSpawnEveryNMoves = 8;
  } else if (clamped <= 9) {
    colourCount = 6;
    boardWidth = 8;
    boardHeight = 8;
    blockerKinds = ['jelly', 'lock'];
    blockerSpawnEveryNMoves = 6;
  } else if (clamped <= 12) {
    colourCount = 6;
    boardWidth = 8;
    boardHeight = 8;
    blockerKinds = ['jelly', 'lock', 'generator'];
    blockerSpawnEveryNMoves = 5;
  } else {
    colourCount = 7;
    boardWidth = 9;
    boardHeight = 9;
    blockerKinds = ['jelly', 'lock', 'generator', 'unstable'];
    blockerSpawnEveryNMoves = 4;
  }

  return {
    level: clamped,
    colourCount,
    colours: ALL_COLOURS.slice(0, colourCount),
    boardWidth,
    boardHeight,
    blockersEnabled: blockerKinds.length > 0,
    blockerKinds,
    blockerSpawnEveryNMoves,
  };
}

// ─── 36.3 結束條件 ─────────────────────────────────────────

/** Endless 模式結束原因 */
export type EndlessEndReason =
  | 'reshufflesExhausted'  // 3 次重洗用盡
  | 'playerQuit'           // 玩家主動退出
  | 'idleTimeout';         // 120 秒無操作

/**
 * 檢查 Endless 模式是否應該結束。
 *
 * @param reshufflesUsed 已使用的重洗次數
 * @param lastActionMs 最後一次操作的時間戳（ms）
 * @param nowMs 當前時間戳（ms）
 * @returns 結束原因，或 null 表示繼續
 */
export function checkEndlessEndCondition(
  reshufflesUsed: number,
  lastActionMs: number,
  nowMs: number,
): EndlessEndReason | null {
  if (reshufflesUsed >= MAX_RESHUFFLES) {
    return 'reshufflesExhausted';
  }
  if (nowMs - lastActionMs >= IDLE_TIMEOUT_MS) {
    return 'idleTimeout';
  }
  return null;
}

// ─── Endless 執行狀態管理 ──────────────────────────────────

/**
 * Endless 模式執行狀態。
 */
export class EndlessRunner {
  score = 0;
  chainMax = 0;
  specialSpawnedCount = 0;
  reshufflesUsed = 0;
  difficulty = 1;
  lastActionMs: number;
  startMs: number;
  ended = false;
  endReason: EndlessEndReason | null = null;

  constructor(nowMs: number = Date.now()) {
    this.startMs = nowMs;
    this.lastActionMs = nowMs;
  }

  /** 取得目前 EndlessRunState */
  getRunState(): EndlessRunState {
    return {
      phase: this.ended ? 'gameOver' : 'playing',
      score: this.score,
      chainMax: this.chainMax,
      difficulty: this.difficulty,
      reshufflesUsed: this.reshufflesUsed,
      reshufflesMax: MAX_RESHUFFLES,
    };
  }

  /** 加分並更新難度 */
  addScore(points: number): void {
    this.score += points;
    this.difficulty = calculateDifficulty(this.score);
  }

  /** 記錄連鎖 */
  recordChain(chain: number): void {
    if (chain > this.chainMax) {
      this.chainMax = chain;
    }
  }

  /** 記錄特殊寶石生成 */
  recordSpecialSpawn(): void {
    this.specialSpawnedCount++;
  }

  /** 記錄重洗 */
  recordReshuffle(): void {
    this.reshufflesUsed++;
  }

  /** 記錄玩家操作（重置 idle 計時器） */
  recordAction(nowMs: number): void {
    this.lastActionMs = nowMs;
  }

  /** 取得目前難度參數 */
  getDifficultyParams(): DifficultyParams {
    return getDifficultyParams(this.difficulty);
  }

  /**
   * 檢查並處理結束條件。
   * @returns 結束原因，或 null 表示繼續
   */
  checkEnd(nowMs: number): EndlessEndReason | null {
    if (this.ended) return this.endReason;

    const reason = checkEndlessEndCondition(
      this.reshufflesUsed,
      this.lastActionMs,
      nowMs,
    );

    if (reason) {
      this.ended = true;
      this.endReason = reason;
    }

    return reason;
  }

  /** 玩家主動退出 */
  quit(): void {
    this.ended = true;
    this.endReason = 'playerQuit';
  }

  /** 取得遊戲時長（毫秒） */
  getDurationMs(nowMs: number): number {
    return nowMs - this.startMs;
  }
}

// ─── 36.4 本機排行榜 ──────────────────────────────────────

/** 排行榜每類最多紀錄數 */
export const LEADERBOARD_MAX_ENTRIES = 10;

/**
 * 更新排行榜紀錄。
 *
 * 將新紀錄插入排序後的陣列，保留前 10 名。
 *
 * @param records 現有紀錄（降序排列）
 * @param newValue 新紀錄值
 * @returns 更新後的紀錄陣列（降序，最多 10 筆）
 */
export function updateLeaderboard(records: number[], newValue: number): number[] {
  const updated = [...records, newValue];
  updated.sort((a, b) => b - a);
  return updated.slice(0, LEADERBOARD_MAX_ENTRIES);
}

/**
 * 取得新紀錄在排行榜中的排名。
 *
 * @param records 現有紀錄（降序排列）
 * @param value 要查詢的值
 * @returns 排名（1-based），若未上榜回傳 null
 */
export function getLeaderboardRank(records: number[], value: number): number | null {
  const updated = updateLeaderboard(records, value);
  const index = updated.indexOf(value);
  if (index === -1 || index >= LEADERBOARD_MAX_ENTRIES) return null;
  return index + 1;
}

/**
 * 更新 EndlessBestRecords。
 *
 * @param current 現有最佳紀錄
 * @param score 本次分數
 * @param chainMax 本次最長連鎖
 * @param specialCount 本次特殊寶石數
 * @returns 更新後的最佳紀錄
 */
export function updateEndlessBestRecords(
  current: EndlessBestRecords,
  score: number,
  chainMax: number,
  specialCount: number,
): EndlessBestRecords {
  return {
    highScores: updateLeaderboard(current.highScores, score),
    longestChains: updateLeaderboard(current.longestChains, chainMax),
    mostSpecials: updateLeaderboard(current.mostSpecials, specialCount),
  };
}

// ─── 36.5 endlessEnd 畫面資料 ─────────────────────────────

/** Endless 結束畫面所需資料 */
export interface EndlessEndScreenData {
  score: number;
  chainMax: number;
  specialSpawnedCount: number;
  difficulty: number;
  durationMs: number;
  endReason: EndlessEndReason;
  /** 各類排名（null = 未上榜） */
  scoreRank: number | null;
  chainRank: number | null;
  specialRank: number | null;
  /** 是否為新紀錄 */
  isNewHighScore: boolean;
  isNewChainRecord: boolean;
  isNewSpecialRecord: boolean;
}

/**
 * 建立 Endless 結束畫面資料。
 */
export function createEndlessEndScreenData(
  runner: EndlessRunner,
  bestRecords: EndlessBestRecords,
  nowMs: number,
): EndlessEndScreenData {
  const scoreRank = getLeaderboardRank(bestRecords.highScores, runner.score);
  const chainRank = getLeaderboardRank(bestRecords.longestChains, runner.chainMax);
  const specialRank = getLeaderboardRank(bestRecords.mostSpecials, runner.specialSpawnedCount);

  return {
    score: runner.score,
    chainMax: runner.chainMax,
    specialSpawnedCount: runner.specialSpawnedCount,
    difficulty: runner.difficulty,
    durationMs: runner.getDurationMs(nowMs),
    endReason: runner.endReason ?? 'playerQuit',
    scoreRank,
    chainRank,
    specialRank,
    isNewHighScore: scoreRank === 1,
    isNewChainRecord: chainRank === 1,
    isNewSpecialRecord: specialRank === 1,
  };
}
