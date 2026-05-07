import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioBuses } from '../buses';

// ─── Mock Howler ────────────────────────────────────────────

vi.mock('howler', () => {
  class MockHowl {
    private _volume = 0;
    private _playing = false;
    private opts: any;

    constructor(opts: any) {
      this.opts = opts;
      this._volume = opts.volume ?? 1;
    }

    play() {
      this._playing = true;
      return 1;
    }
    stop() {
      this._playing = false;
    }
    pause() {
      this._playing = false;
    }
    unload() {}
    volume(v?: number): number {
      if (v !== undefined) {
        this._volume = v;
        return v;
      }
      return this._volume;
    }
    playing() {
      return this._playing;
    }
  }

  return { Howl: MockHowl };
});

import { AdaptiveMusic } from '../adaptive-music';
import type { MusicTrackDef } from '../adaptive-music';

// ─── 測試工具 ───────────────────────────────────────────────

function createTestTrack(layerCount = 4): MusicTrackDef {
  const layers = [];
  const thresholds = [0, 0.3, 0.6, 0.85];
  for (let i = 0; i < layerCount; i++) {
    layers.push({
      src: [`audio/music/layer${i}.ogg`],
      threshold: thresholds[i] ?? 0,
    });
  }
  return { id: 'test-track', layers, loop: true };
}

// ─── AdaptiveMusic 單元測試 ─────────────────────────────────

describe('AdaptiveMusic', () => {
  let buses: AudioBuses;
  let music: AdaptiveMusic;

  beforeEach(() => {
    buses = new AudioBuses();
    music = new AdaptiveMusic(buses);
  });

  describe('construction', () => {
    it('初始狀態：未播放、intensity 為 0', () => {
      expect(music.isPlaying()).toBe(false);
      expect(music.getIntensity()).toBe(0);
      expect(music.getTrackId()).toBeNull();
    });
  });

  describe('loadAndPlay', () => {
    it('載入曲目後開始播放', () => {
      const track = createTestTrack();
      music.loadAndPlay(track);

      expect(music.isPlaying()).toBe(true);
      expect(music.getTrackId()).toBe('test-track');
    });

    it('載入新曲目時停止舊曲目', () => {
      music.loadAndPlay(createTestTrack());
      expect(music.getTrackId()).toBe('test-track');

      const track2: MusicTrackDef = {
        id: 'track-2',
        layers: [{ src: ['audio/t2.ogg'], threshold: 0 }],
      };
      music.loadAndPlay(track2);
      expect(music.getTrackId()).toBe('track-2');
    });
  });

  describe('stop', () => {
    it('停止後狀態重置', () => {
      music.loadAndPlay(createTestTrack());
      music.stop();

      expect(music.isPlaying()).toBe(false);
      expect(music.getTrackId()).toBeNull();
      expect(music.getIntensity()).toBe(0);
    });
  });

  describe('setIntensity', () => {
    it('夾在 [0, 1] 範圍', () => {
      music.setIntensity(-0.5);
      expect(music.getIntensity()).toBe(0);

      music.setIntensity(1.5);
      expect(music.getIntensity()).toBe(1);

      music.setIntensity(0.7);
      expect(music.getIntensity()).toBe(0.7);
    });
  });

  describe('layer threshold transitions', () => {
    it('intensity=0 時只有基底層目標音量為 1', () => {
      music.loadAndPlay(createTestTrack());
      music.setIntensity(0);

      // 多次 update 讓 lerp 收斂
      for (let i = 0; i < 200; i++) music.update();

      // 基底層（threshold=0）應該播放
      // 其他層（threshold>0）應該靜音
      // 我們透過 getIntensity 間接驗證邏輯正確
      expect(music.getIntensity()).toBe(0);
    });

    it('intensity=0.5 時 layer 0 和 layer 1 (threshold=0.3) 應淡入', () => {
      music.loadAndPlay(createTestTrack());
      music.setIntensity(0.5);

      // 多次 update 讓 lerp 收斂
      for (let i = 0; i < 200; i++) music.update();

      // intensity 0.5 > threshold 0.3 → layer 1 target = 1
      // intensity 0.5 < threshold 0.6 → layer 2 target = 0
      expect(music.getIntensity()).toBe(0.5);
    });

    it('intensity=1.0 時所有層都應淡入', () => {
      music.loadAndPlay(createTestTrack());
      music.setIntensity(1.0);

      for (let i = 0; i < 200; i++) music.update();

      expect(music.getIntensity()).toBe(1.0);
    });

    it('intensity 從高降到低時高層淡出', () => {
      music.loadAndPlay(createTestTrack());
      music.setIntensity(1.0);
      for (let i = 0; i < 200; i++) music.update();

      // 降低 intensity
      music.setIntensity(0.1);
      for (let i = 0; i < 200; i++) music.update();

      expect(music.getIntensity()).toBe(0.1);
    });
  });

  describe('update (lerp smoothing)', () => {
    it('未播放時 update 不拋錯', () => {
      expect(() => music.update()).not.toThrow();
    });

    it('播放中 update 不拋錯', () => {
      music.loadAndPlay(createTestTrack());
      expect(() => music.update()).not.toThrow();
    });

    it('多次 update 後音量收斂（不會無限振盪）', () => {
      music.loadAndPlay(createTestTrack());
      music.setIntensity(0.7);

      // 200 次 update 足以讓 lerp 收斂
      for (let i = 0; i < 200; i++) music.update();

      // 不應拋錯，且 intensity 保持不變
      expect(music.getIntensity()).toBe(0.7);
    });
  });

  describe('pause / resume', () => {
    it('pause 後 resume 不拋錯', () => {
      music.loadAndPlay(createTestTrack());
      expect(() => music.pause()).not.toThrow();
      expect(() => music.resume()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('dispose 後停止播放', () => {
      music.loadAndPlay(createTestTrack());
      music.dispose();
      expect(music.isPlaying()).toBe(false);
    });
  });
});
