// ─── RNG 系統 ────────────────────────────────────────────────
// Mulberry32 PRNG — 32-bit state，可序列化
// 純 TypeScript，零瀏覽器依賴

/** Mulberry32 PRNG — 32-bit state，可序列化 */
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** 回傳 [0, 1) 的浮點數 */
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
  serialize(): number {
    return this.state;
  }

  /** 從序列化狀態還原 */
  static deserialize(state: number): Mulberry32 {
    const rng = new Mulberry32(0);
    rng.state = state;
    return rng;
  }
}

/** 4 個獨立 RNG 串流 */
export interface RngStreams {
  boardInit: Mulberry32;
  cascadeFill: Mulberry32;
  juice: Mulberry32;
  misc: Mulberry32;
}

/** 從 64-bit 種子建立 4 個獨立串流 */
export function createRngStreams(seed: bigint): RngStreams {
  const s = Number(seed & 0xffffffffn);
  return {
    boardInit: new Mulberry32(s ^ 0x12345678),
    cascadeFill: new Mulberry32(s ^ 0x9abcdef0),
    juice: new Mulberry32(s ^ 0xfedcba98),
    misc: new Mulberry32(s ^ 0x76543210),
  };
}
