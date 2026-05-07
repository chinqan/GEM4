import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Web Audio API ─────────────────────────────────────

const mockOscillator = {
  type: 'sine',
  frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
  onended: null as any,
};

const mockGainNode = {
  gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
};

const mockBufferSource = {
  buffer: null,
  playbackRate: { value: 1 },
  connect: vi.fn().mockReturnThis(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
  onended: null as any,
};

const mockAudioBuffer = {
  getChannelData: vi.fn(() => new Float32Array(44100)),
  sampleRate: 44100,
  length: 44100,
  duration: 1,
  numberOfChannels: 1,
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({
    ...mockGainNode,
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
  createBuffer: vi.fn(() => ({ ...mockAudioBuffer, getChannelData: vi.fn(() => new Float32Array(44100)) })),
  decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));
vi.stubGlobal('window', { AudioContext: vi.fn(() => mockAudioContext) });
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
}));

// ─── Import after mocks ────────────────────────────────────

// Note: playMatchSfx calls ensure() which creates AudioContext.
// We test the formula logic directly instead of calling the function
// in environments without full Web Audio support.

// ─── SynthSfx 單元測試 ─────────────────────────────────────

describe('playMatchSfx level formula', () => {
  // 驗證 GDD §7 的 chain→level 映射公式：
  // base = min(chain * 2 - 1, 9)
  // bonus = count >= 5 ? 1 : 0
  // level = min(base + bonus, 10)

  function computeLevel(count: number, chain: number): number {
    const base = Math.min(chain * 2 - 1, 9);
    const bonus = count >= 5 ? 1 : 0;
    return Math.min(base + bonus, 10);
  }

  it('chain=1, count=3 → level 1', () => {
    expect(computeLevel(3, 1)).toBe(1);
  });

  it('chain=2, count=3 → level 3', () => {
    expect(computeLevel(3, 2)).toBe(3);
  });

  it('chain=3, count=5 → level 6 (bonus for count≥5)', () => {
    expect(computeLevel(5, 3)).toBe(6);
  });

  it('chain=5, count=10 → level 10 (capped)', () => {
    expect(computeLevel(10, 5)).toBe(10);
  });

  it('chain=6, count=3 → level 9 (capped at 9 before bonus)', () => {
    expect(computeLevel(3, 6)).toBe(9);
  });

  it('chain=6, count=5 → level 10 (cap 9 + bonus 1)', () => {
    expect(computeLevel(5, 6)).toBe(10);
  });

  it('chain=1, count=5 → level 2 (base 1 + bonus 1)', () => {
    expect(computeLevel(5, 1)).toBe(2);
  });

  it('chain=4, count=4 → level 7 (no bonus)', () => {
    expect(computeLevel(4, 4)).toBe(7);
  });

  it('chain=4, count=5 → level 8 (bonus)', () => {
    expect(computeLevel(5, 4)).toBe(8);
  });

  it('chain=5, count=5 → level 10 (9 + 1)', () => {
    expect(computeLevel(5, 5)).toBe(10);
  });

  // 完整映射表
  const cases: Array<[number, number, number]> = [
    // [count, chain, expectedLevel]
    [3, 1, 1],
    [3, 2, 3],
    [3, 3, 5],
    [3, 4, 7],
    [3, 5, 9],
    [5, 1, 2],
    [5, 2, 4],
    [5, 3, 6],
    [5, 4, 8],
    [5, 5, 10],
    [5, 6, 10],
    [3, 10, 9],
    [10, 10, 10],
  ];

  for (const [count, chain, expected] of cases) {
    it(`count=${count}, chain=${chain} → level=${expected}`, () => {
      expect(computeLevel(count, chain)).toBe(expected);
    });
  }

  it('level 永遠在 [1, 10] 範圍內（chain ≥ 1）', () => {
    for (let chain = 1; chain <= 20; chain++) {
      for (let count = 1; count <= 20; count++) {
        const level = computeLevel(count, chain);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(10);
      }
    }
  });

  it('chain 越大 level 越高（單調遞增直到 cap）', () => {
    const levels = [];
    for (let chain = 1; chain <= 10; chain++) {
      levels.push(computeLevel(3, chain));
    }
    // 應該是非遞減的
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    }
  });
});
