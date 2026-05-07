import { describe, it, expect, vi } from 'vitest';
import { AudioBuses } from '../buses';
import type { BusSnapshot } from '../buses';

// ─── AudioBuses 單元測試 ────────────────────────────────────

describe('AudioBuses', () => {
  describe('construction', () => {
    it('使用預設值初始化', () => {
      const buses = new AudioBuses();
      expect(buses.master.volume).toBe(0.8);
      expect(buses.master.muted).toBe(false);
      expect(buses.music.volume).toBe(0.8);
      expect(buses.music.muted).toBe(false);
      expect(buses.sfx.volume).toBe(0.9);
      expect(buses.sfx.muted).toBe(false);
    });

    it('從快照還原初始化', () => {
      const snap: Partial<BusSnapshot> = {
        master: { volume: 0.5, muted: true },
        music: { volume: 0.3, muted: false },
        sfx: { volume: 0.7, muted: true },
      };
      const buses = new AudioBuses(snap);
      expect(buses.master.volume).toBe(0.5);
      expect(buses.master.muted).toBe(true);
      expect(buses.music.volume).toBe(0.3);
      expect(buses.sfx.volume).toBe(0.7);
      expect(buses.sfx.muted).toBe(true);
    });

    it('部分快照使用預設值填充', () => {
      const buses = new AudioBuses({ master: { volume: 0.6, muted: false } });
      expect(buses.master.volume).toBe(0.6);
      expect(buses.music.volume).toBe(0.8); // 預設
      expect(buses.sfx.volume).toBe(0.9); // 預設
    });
  });

  describe('effective volume calculation', () => {
    it('effectiveMusicVolume = master.volume × music.volume', () => {
      const buses = new AudioBuses({
        master: { volume: 0.5, muted: false },
        music: { volume: 0.6, muted: false },
      });
      expect(buses.effectiveMusicVolume).toBeCloseTo(0.3);
    });

    it('effectiveSfxVolume = master.volume × sfx.volume', () => {
      const buses = new AudioBuses({
        master: { volume: 0.8, muted: false },
        sfx: { volume: 0.5, muted: false },
      });
      expect(buses.effectiveSfxVolume).toBeCloseTo(0.4);
    });

    it('master muted → effectiveMusicVolume = 0', () => {
      const buses = new AudioBuses({
        master: { volume: 0.8, muted: true },
        music: { volume: 0.6, muted: false },
      });
      expect(buses.effectiveMusicVolume).toBe(0);
    });

    it('master muted → effectiveSfxVolume = 0', () => {
      const buses = new AudioBuses({
        master: { volume: 0.8, muted: true },
        sfx: { volume: 0.9, muted: false },
      });
      expect(buses.effectiveSfxVolume).toBe(0);
    });

    it('music muted → effectiveMusicVolume = 0', () => {
      const buses = new AudioBuses({
        master: { volume: 0.8, muted: false },
        music: { volume: 0.6, muted: true },
      });
      expect(buses.effectiveMusicVolume).toBe(0);
    });

    it('sfx muted → effectiveSfxVolume = 0', () => {
      const buses = new AudioBuses({
        master: { volume: 0.8, muted: false },
        sfx: { volume: 0.9, muted: true },
      });
      expect(buses.effectiveSfxVolume).toBe(0);
    });
  });

  describe('volume setters', () => {
    it('setMasterVolume 夾在 [0, 1]', () => {
      const buses = new AudioBuses();
      buses.setMasterVolume(1.5);
      expect(buses.master.volume).toBe(1);
      buses.setMasterVolume(-0.5);
      expect(buses.master.volume).toBe(0);
      buses.setMasterVolume(0.7);
      expect(buses.master.volume).toBe(0.7);
    });

    it('setMusicVolume 夾在 [0, 1]', () => {
      const buses = new AudioBuses();
      buses.setMusicVolume(2);
      expect(buses.music.volume).toBe(1);
      buses.setMusicVolume(-1);
      expect(buses.music.volume).toBe(0);
    });

    it('setSfxVolume 夾在 [0, 1]', () => {
      const buses = new AudioBuses();
      buses.setSfxVolume(0.55);
      expect(buses.sfx.volume).toBe(0.55);
    });
  });

  describe('mute toggles', () => {
    it('toggleMasterMute 切換並回傳新狀態', () => {
      const buses = new AudioBuses();
      expect(buses.isGlobalMuted).toBe(false);
      const result = buses.toggleMasterMute();
      expect(result).toBe(true);
      expect(buses.isGlobalMuted).toBe(true);
      const result2 = buses.toggleMasterMute();
      expect(result2).toBe(false);
      expect(buses.isGlobalMuted).toBe(false);
    });

    it('setMasterMute 直接設定', () => {
      const buses = new AudioBuses();
      buses.setMasterMute(true);
      expect(buses.isGlobalMuted).toBe(true);
      buses.setMasterMute(false);
      expect(buses.isGlobalMuted).toBe(false);
    });

    it('toggleMusicMute 切換', () => {
      const buses = new AudioBuses();
      expect(buses.music.muted).toBe(false);
      buses.toggleMusicMute();
      expect(buses.music.muted).toBe(true);
    });

    it('toggleSfxMute 切換', () => {
      const buses = new AudioBuses();
      expect(buses.sfx.muted).toBe(false);
      buses.toggleSfxMute();
      expect(buses.sfx.muted).toBe(true);
    });
  });

  describe('snapshot & restore', () => {
    it('snapshot 回傳當前狀態的深拷貝', () => {
      const buses = new AudioBuses();
      buses.setMasterVolume(0.6);
      buses.toggleMusicMute();

      const snap = buses.snapshot();
      expect(snap.master.volume).toBe(0.6);
      expect(snap.music.muted).toBe(true);

      // 修改原始不影響快照
      buses.setMasterVolume(0.9);
      expect(snap.master.volume).toBe(0.6);
    });

    it('restore 從快照還原狀態', () => {
      const buses = new AudioBuses();
      const snap: BusSnapshot = {
        master: { volume: 0.3, muted: true },
        music: { volume: 0.4, muted: false },
        sfx: { volume: 0.5, muted: true },
      };

      buses.restore(snap);
      expect(buses.master.volume).toBe(0.3);
      expect(buses.master.muted).toBe(true);
      expect(buses.music.volume).toBe(0.4);
      expect(buses.sfx.volume).toBe(0.5);
      expect(buses.sfx.muted).toBe(true);
    });

    it('restore 部分快照只更新指定匯流排', () => {
      const buses = new AudioBuses();
      buses.restore({ master: { volume: 0.1, muted: true } });
      expect(buses.master.volume).toBe(0.1);
      expect(buses.music.volume).toBe(0.8); // 未變
    });
  });

  describe('onChange listener', () => {
    it('音量變更時通知監聽器', () => {
      const buses = new AudioBuses();
      const cb = vi.fn();
      buses.onChange(cb);

      buses.setMasterVolume(0.5);
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          master: expect.objectContaining({ volume: 0.5 }),
        }),
      );
    });

    it('mute 切換時通知監聽器', () => {
      const buses = new AudioBuses();
      const cb = vi.fn();
      buses.onChange(cb);

      buses.toggleMasterMute();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('取消訂閱後不再通知', () => {
      const buses = new AudioBuses();
      const cb = vi.fn();
      const unsub = buses.onChange(cb);

      buses.setMasterVolume(0.5);
      expect(cb).toHaveBeenCalledTimes(1);

      unsub();
      buses.setMasterVolume(0.3);
      expect(cb).toHaveBeenCalledTimes(1); // 不再增加
    });

    it('restore 時通知監聽器', () => {
      const buses = new AudioBuses();
      const cb = vi.fn();
      buses.onChange(cb);

      buses.restore({ sfx: { volume: 0.2, muted: false } });
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
