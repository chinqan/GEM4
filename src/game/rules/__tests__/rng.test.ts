import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Mulberry32, createRngStreams } from '../rng';

// ─── 單元測試 ───────────────────────────────────────────────

describe('Mulberry32', () => {
  describe('確定性', () => {
    it('相同種子產生相同序列（1000 次呼叫比對）', () => {
      const rng1 = new Mulberry32(12345);
      const rng2 = new Mulberry32(12345);

      for (let i = 0; i < 1000; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('不同種子產生不同序列', () => {
      const rng1 = new Mulberry32(1);
      const rng2 = new Mulberry32(2);

      // 至少有一個值不同
      let allSame = true;
      for (let i = 0; i < 100; i++) {
        if (rng1.next() !== rng2.next()) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });
  });

  describe('next() 範圍', () => {
    it('回傳值在 [0, 1) 範圍', () => {
      const rng = new Mulberry32(42);
      for (let i = 0; i < 10000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('int(min, max)', () => {
    it('回傳值在 [min, max) 範圍', () => {
      const rng = new Mulberry32(99);
      for (let i = 0; i < 5000; i++) {
        const val = rng.int(3, 10);
        expect(val).toBeGreaterThanOrEqual(3);
        expect(val).toBeLessThan(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('min === max - 1 時永遠回傳 min', () => {
      const rng = new Mulberry32(77);
      for (let i = 0; i < 100; i++) {
        expect(rng.int(5, 6)).toBe(5);
      }
    });
  });

  describe('pick', () => {
    it('從陣列中選取有效元素', () => {
      const rng = new Mulberry32(55);
      const arr = ['R', 'G', 'B', 'Y', 'P'] as const;
      for (let i = 0; i < 1000; i++) {
        const picked = rng.pick(arr);
        expect(arr).toContain(picked);
      }
    });

    it('單元素陣列永遠回傳該元素', () => {
      const rng = new Mulberry32(66);
      for (let i = 0; i < 100; i++) {
        expect(rng.pick([42])).toBe(42);
      }
    });
  });

  describe('序列化/還原', () => {
    it('serialize → deserialize 後繼續產生相同序列', () => {
      const rng1 = new Mulberry32(12345);

      // 先推進一些狀態
      for (let i = 0; i < 500; i++) {
        rng1.next();
      }

      // 序列化
      const state = rng1.serialize();

      // 從序列化狀態還原
      const rng2 = Mulberry32.deserialize(state);

      // 後續序列應完全相同
      for (let i = 0; i < 500; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('deserialize 不受 constructor 副作用影響', () => {
      const rng = new Mulberry32(999);
      for (let i = 0; i < 100; i++) {
        rng.next();
      }
      const state = rng.serialize();

      // deserialize 應直接設定 state，不經過 constructor 的 seed 處理
      const restored = Mulberry32.deserialize(state);
      expect(restored.serialize()).toBe(state);
    });
  });
});

describe('createRngStreams', () => {
  it('4 個串流互相獨立（不同序列）', () => {
    const streams = createRngStreams(42n);

    // 各串流產生 100 個值
    const sequences = {
      boardInit: Array.from({ length: 100 }, () => streams.boardInit.next()),
      cascadeFill: Array.from({ length: 100 }, () => streams.cascadeFill.next()),
      juice: Array.from({ length: 100 }, () => streams.juice.next()),
      misc: Array.from({ length: 100 }, () => streams.misc.next()),
    };

    // 任兩個串流的序列不應完全相同
    const keys = Object.keys(sequences) as (keyof typeof sequences)[];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const seqA = sequences[keys[i]];
        const seqB = sequences[keys[j]];
        const allSame = seqA.every((v, idx) => v === seqB[idx]);
        expect(allSame).toBe(false);
      }
    }
  });

  it('相同種子建立相同串流', () => {
    const streams1 = createRngStreams(123456789n);
    const streams2 = createRngStreams(123456789n);

    for (let i = 0; i < 100; i++) {
      expect(streams1.boardInit.next()).toBe(streams2.boardInit.next());
      expect(streams1.cascadeFill.next()).toBe(streams2.cascadeFill.next());
      expect(streams1.juice.next()).toBe(streams2.juice.next());
      expect(streams1.misc.next()).toBe(streams2.misc.next());
    }
  });

  it('不同種子建立不同串流', () => {
    const streams1 = createRngStreams(1n);
    const streams2 = createRngStreams(2n);

    let allSame = true;
    for (let i = 0; i < 100; i++) {
      if (streams1.boardInit.next() !== streams2.boardInit.next()) {
        allSame = false;
        break;
      }
    }
    expect(allSame).toBe(false);
  });

  it('處理大 bigint 種子（取低 32 位元）', () => {
    const bigSeed = 0xDEADBEEF_CAFEBABEn;
    // 不應拋出錯誤
    const streams = createRngStreams(bigSeed);
    const val = streams.boardInit.next();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });
});

// ─── CP-8 Property Test ─────────────────────────────────────

/**
 * **Validates: Requirements FR-19**
 *
 * CP-8 RNG 確定性：
 * 對任意種子（bigint），createRngStreams 後各串流呼叫 100 次 next()，
 * 重複建立相同種子的串流，驗證序列 bit-exact 相同。
 */
describe('CP-8: RNG 確定性', () => {
  it('相同種子的 createRngStreams 產生 bit-exact 相同序列', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 0xFFFFFFFF_FFFFFFFFn }),
        (seed) => {
          const streams1 = createRngStreams(seed);
          const streams2 = createRngStreams(seed);

          const streamKeys = ['boardInit', 'cascadeFill', 'juice', 'misc'] as const;

          for (const key of streamKeys) {
            for (let i = 0; i < 100; i++) {
              const v1 = streams1[key].next();
              const v2 = streams2[key].next();
              if (v1 !== v2) {
                return false;
              }
            }
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
