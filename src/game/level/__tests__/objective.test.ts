import { describe, it, expect } from 'vitest';
import {
  ScoreTracker,
  ClearTracker,
  CollectTracker,
  DropTracker,
  MultiTracker,
  createTracker,
  calculateStars,
} from '../objective';

// ─── 1. ScoreTracker ────────────────────────────────────────

describe('ScoreTracker', () => {
  it('初始未完成，進度為 0', () => {
    const t = new ScoreTracker(1000);
    expect(t.isComplete()).toBe(false);
    expect(t.getProgress()).toBe(0);
  });

  it('更新分數後完成', () => {
    const t = new ScoreTracker(1000);
    t.updateScore(1000);
    expect(t.isComplete()).toBe(true);
    expect(t.getProgress()).toBe(1);
  });

  it('進度計算正確（部分完成）', () => {
    const t = new ScoreTracker(1000);
    t.updateScore(500);
    expect(t.getProgress()).toBeCloseTo(0.5);
    expect(t.isComplete()).toBe(false);
  });

  it('超過目標時進度 capped 在 1', () => {
    const t = new ScoreTracker(1000);
    t.updateScore(2000);
    expect(t.getProgress()).toBe(1);
    expect(t.isComplete()).toBe(true);
  });

  it('getDelta 回傳正確格式', () => {
    const t = new ScoreTracker(1000);
    t.updateScore(250);
    const delta = t.getDelta();
    expect(delta.type).toBe('score');
    expect(delta.progress).toBeCloseTo(0.25);
  });
});

// ─── 2. ClearTracker ────────────────────────────────────────

describe('ClearTracker', () => {
  it('單一 blocker 類型：初始未完成', () => {
    const t = new ClearTracker([{ blocker: 'jelly', count: 5 }]);
    expect(t.isComplete()).toBe(false);
    expect(t.getProgress()).toBe(0);
  });

  it('單一 blocker 類型：清除足夠數量後完成', () => {
    const t = new ClearTracker([{ blocker: 'jelly', count: 3 }]);
    t.addCleared('jelly', 3);
    expect(t.isComplete()).toBe(true);
    expect(t.getProgress()).toBe(1);
  });

  it('多種 blocker 類型：全部完成才算完成', () => {
    const t = new ClearTracker([
      { blocker: 'jelly', count: 3 },
      { blocker: 'lock', count: 2 },
    ]);
    t.addCleared('jelly', 3);
    expect(t.isComplete()).toBe(false);
    t.addCleared('lock', 2);
    expect(t.isComplete()).toBe(true);
  });

  it('部分完成進度計算正確', () => {
    const t = new ClearTracker([
      { blocker: 'jelly', count: 4 },
      { blocker: 'lock', count: 2 },
    ]);
    t.addCleared('jelly', 2); // 2/4 = 0.5
    t.addCleared('lock', 1); // 1/2 = 0.5
    // 平均 = (0.5 + 0.5) / 2 = 0.5
    expect(t.getProgress()).toBeCloseTo(0.5);
  });

  it('空目標列表視為完成', () => {
    const t = new ClearTracker([]);
    expect(t.isComplete()).toBe(true);
    expect(t.getProgress()).toBe(1);
  });

  it('getDelta 包含 completedSubObjectives', () => {
    const t = new ClearTracker([
      { blocker: 'jelly', count: 2 },
      { blocker: 'lock', count: 3 },
    ]);
    t.addCleared('jelly', 2);
    const delta = t.getDelta();
    expect(delta.type).toBe('clear');
    expect(delta.completedSubObjectives).toBe(1);
  });
});

// ─── 3. CollectTracker ──────────────────────────────────────

describe('CollectTracker', () => {
  it('單色收集：初始未完成', () => {
    const t = new CollectTracker([{ colour: 'R', count: 10 }]);
    expect(t.isComplete()).toBe(false);
    expect(t.getProgress()).toBe(0);
  });

  it('單色收集：達到目標後完成', () => {
    const t = new CollectTracker([{ colour: 'R', count: 5 }]);
    t.addCollected('R', 5);
    expect(t.isComplete()).toBe(true);
  });

  it('多色收集：全部達標才完成', () => {
    const t = new CollectTracker([
      { colour: 'R', count: 3 },
      { colour: 'B', count: 4 },
    ]);
    t.addCollected('R', 3);
    expect(t.isComplete()).toBe(false);
    t.addCollected('B', 4);
    expect(t.isComplete()).toBe(true);
  });

  it('超過目標：進度 capped 在 1', () => {
    const t = new CollectTracker([{ colour: 'G', count: 3 }]);
    t.addCollected('G', 10);
    expect(t.getProgress()).toBe(1);
    expect(t.isComplete()).toBe(true);
  });

  it('getDelta 包含 completedSubObjectives', () => {
    const t = new CollectTracker([
      { colour: 'R', count: 2 },
      { colour: 'B', count: 3 },
    ]);
    t.addCollected('R', 2);
    t.addCollected('B', 1);
    const delta = t.getDelta();
    expect(delta.type).toBe('collect');
    expect(delta.completedSubObjectives).toBe(1);
  });
});

// ─── 4. DropTracker ─────────────────────────────────────────

describe('DropTracker', () => {
  it('初始未完成', () => {
    const t = new DropTracker(5);
    expect(t.isComplete()).toBe(false);
    expect(t.getProgress()).toBe(0);
  });

  it('逐步增加', () => {
    const t = new DropTracker(4);
    t.addDropped(1);
    expect(t.getProgress()).toBeCloseTo(0.25);
    t.addDropped(1);
    expect(t.getProgress()).toBeCloseTo(0.5);
  });

  it('達到目標後完成', () => {
    const t = new DropTracker(3);
    t.addDropped(3);
    expect(t.isComplete()).toBe(true);
    expect(t.getProgress()).toBe(1);
  });

  it('getDelta 回傳正確格式', () => {
    const t = new DropTracker(10);
    t.addDropped(5);
    const delta = t.getDelta();
    expect(delta.type).toBe('drop');
    expect(delta.progress).toBeCloseTo(0.5);
  });
});

// ─── 5. MultiTracker ────────────────────────────────────────

describe('MultiTracker', () => {
  it('所有子目標完成才算完成', () => {
    const multi = new MultiTracker([
      { type: 'score', target: 1000 },
      { type: 'drop', target: { count: 3 } },
    ]);
    expect(multi.isComplete()).toBe(false);

    // 完成 score 子目標
    const trackers = multi.getTrackers();
    (trackers[0] as ScoreTracker).updateScore(1000);
    expect(multi.isComplete()).toBe(false);

    // 完成 drop 子目標
    (trackers[1] as DropTracker).addDropped(3);
    expect(multi.isComplete()).toBe(true);
  });

  it('部分完成進度為子目標進度的平均', () => {
    const multi = new MultiTracker([
      { type: 'score', target: 1000 },
      { type: 'drop', target: { count: 4 } },
    ]);
    const trackers = multi.getTrackers();
    (trackers[0] as ScoreTracker).updateScore(500); // 0.5
    (trackers[1] as DropTracker).addDropped(2); // 0.5
    expect(multi.getProgress()).toBeCloseTo(0.5);
  });

  it('空子目標列表視為完成', () => {
    const multi = new MultiTracker([]);
    expect(multi.isComplete()).toBe(true);
    expect(multi.getProgress()).toBe(1);
  });

  it('getDelta 包含 completedSubObjectives', () => {
    const multi = new MultiTracker([
      { type: 'score', target: 100 },
      { type: 'drop', target: { count: 2 } },
    ]);
    const trackers = multi.getTrackers();
    (trackers[0] as ScoreTracker).updateScore(100);
    const delta = multi.getDelta();
    expect(delta.type).toBe('multi');
    expect(delta.completedSubObjectives).toBe(1);
  });
});

// ─── 6. createTracker 工廠函式 ──────────────────────────────

describe('createTracker', () => {
  it('score 類型建立 ScoreTracker', () => {
    const tracker = createTracker({ type: 'score', target: 500 });
    expect(tracker).toBeInstanceOf(ScoreTracker);
  });

  it('clear 類型建立 ClearTracker', () => {
    const tracker = createTracker({
      type: 'clear',
      target: [{ blocker: 'jelly', count: 3 }],
    });
    expect(tracker).toBeInstanceOf(ClearTracker);
  });

  it('collect 類型建立 CollectTracker', () => {
    const tracker = createTracker({
      type: 'collect',
      target: [{ colour: 'R', count: 5 }],
    });
    expect(tracker).toBeInstanceOf(CollectTracker);
  });

  it('drop 類型建立 DropTracker', () => {
    const tracker = createTracker({ type: 'drop', target: { count: 4 } });
    expect(tracker).toBeInstanceOf(DropTracker);
  });

  it('multi 類型建立 MultiTracker', () => {
    const tracker = createTracker({
      type: 'multi',
      objectives: [
        { type: 'score', target: 1000 },
        { type: 'drop', target: { count: 2 } },
      ],
    });
    expect(tracker).toBeInstanceOf(MultiTracker);
  });
});

// ─── 7. calculateStars：score basis ─────────────────────────

describe('calculateStars — score basis', () => {
  const starConfig = {
    one: 1000,
    two: 3000,
    three: 5000,
    basis: 'score' as const,
  };

  it('分數不足 → 0 星', () => {
    expect(calculateStars(starConfig, 500, 0, 0)).toBe(0);
  });

  it('達到 1 星門檻 → 1 星', () => {
    expect(calculateStars(starConfig, 1500, 0, 0)).toBe(1);
  });

  it('達到 2 星門檻 → 2 星', () => {
    expect(calculateStars(starConfig, 3500, 0, 0)).toBe(2);
  });

  it('達到 3 星門檻 → 3 星', () => {
    expect(calculateStars(starConfig, 6000, 0, 0)).toBe(3);
  });
});

// ─── 8. calculateStars：movesRemaining basis ────────────────

describe('calculateStars — movesRemaining basis', () => {
  const starConfig = {
    one: 1,
    two: 5,
    three: 10,
    basis: 'movesRemaining' as const,
  };

  it('0 剩餘手數 → 0 星', () => {
    expect(calculateStars(starConfig, 9999, 0, 0)).toBe(0);
  });

  it('3 剩餘手數 → 1 星', () => {
    expect(calculateStars(starConfig, 9999, 3, 0)).toBe(1);
  });

  it('7 剩餘手數 → 2 星', () => {
    expect(calculateStars(starConfig, 9999, 7, 0)).toBe(2);
  });

  it('15 剩餘手數 → 3 星', () => {
    expect(calculateStars(starConfig, 9999, 15, 0)).toBe(3);
  });
});

// ─── 9. calculateStars：timeRemaining basis ─────────────────

describe('calculateStars — timeRemaining basis', () => {
  const starConfig = {
    one: 10,
    two: 30,
    three: 60,
    basis: 'timeRemaining' as const,
  };

  it('0 剩餘時間 → 0 星', () => {
    expect(calculateStars(starConfig, 0, 0, 5)).toBe(0);
  });

  it('20 剩餘時間 → 1 星', () => {
    expect(calculateStars(starConfig, 0, 0, 20)).toBe(1);
  });

  it('45 剩餘時間 → 2 星', () => {
    expect(calculateStars(starConfig, 0, 0, 45)).toBe(2);
  });

  it('90 剩餘時間 → 3 星', () => {
    expect(calculateStars(starConfig, 0, 0, 90)).toBe(3);
  });
});

// ─── 10. calculateStars：邊界值 ─────────────────────────────

describe('calculateStars — 邊界值', () => {
  const starConfig = {
    one: 1000,
    two: 3000,
    three: 5000,
    basis: 'score' as const,
  };

  it('恰好等於 1 星門檻 → 1 星', () => {
    expect(calculateStars(starConfig, 1000, 0, 0)).toBe(1);
  });

  it('恰好等於 2 星門檻 → 2 星', () => {
    expect(calculateStars(starConfig, 3000, 0, 0)).toBe(2);
  });

  it('恰好等於 3 星門檻 → 3 星', () => {
    expect(calculateStars(starConfig, 5000, 0, 0)).toBe(3);
  });

  it('差 1 不到 1 星門檻 → 0 星', () => {
    expect(calculateStars(starConfig, 999, 0, 0)).toBe(0);
  });

  it('差 1 不到 2 星門檻 → 1 星', () => {
    expect(calculateStars(starConfig, 2999, 0, 0)).toBe(1);
  });

  it('差 1 不到 3 星門檻 → 2 星', () => {
    expect(calculateStars(starConfig, 4999, 0, 0)).toBe(2);
  });
});
