import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock document (for autoplay unlock & visibility) ───────

const docListeners = new Map<string, Set<Function>>();
const mockDocument = {
  addEventListener: vi.fn((event: string, handler: Function) => {
    if (!docListeners.has(event)) docListeners.set(event, new Set());
    docListeners.get(event)!.add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: Function) => {
    docListeners.get(event)?.delete(handler);
  }),
  hidden: false,
};
vi.stubGlobal('document', mockDocument);

// ─── Mock Howler ────────────────────────────────────────────

vi.mock('howler', () => {
  const mockCtx = {
    state: 'suspended',
    resume: vi.fn(),
    suspend: vi.fn(),
  };

  return {
    Howler: { ctx: mockCtx },
    Howl: vi.fn().mockImplementation(() => ({
      play: vi.fn(() => 1),
      stop: vi.fn(),
      pause: vi.fn(),
      volume: vi.fn(),
      rate: vi.fn(),
      unload: vi.fn(),
      on: vi.fn(),
    })),
  };
});

import { AudioSystem } from '../audio-system';
import type { AudioSystemOptions } from '../audio-system';

// ─── Mock EventBus ──────────────────────────────────────────

interface MockEventBus {
  listeners: Map<string, Array<(e: any) => void>>;
  on: (event: string, cb: (e: any) => void) => () => void;
  emit: (event: string, data?: any) => void;
}

function createMockEventBus(): MockEventBus {
  const listeners = new Map<string, Array<(e: any) => void>>();
  return {
    listeners,
    on(event: string, cb: (e: any) => void) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(cb);
      return () => {
        const arr = listeners.get(event);
        if (arr) {
          const idx = arr.indexOf(cb);
          if (idx >= 0) arr.splice(idx, 1);
        }
      };
    },
    emit(event: string, data?: any) {
      const cbs = listeners.get(event);
      if (cbs) {
        for (const cb of cbs) cb(data);
      }
    },
  };
}

// ─── AudioSystem 單元測試 ───────────────────────────────────

describe('AudioSystem', () => {
  let system: AudioSystem;

  beforeEach(() => {
    system = new AudioSystem();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('construction', () => {
    it('初始狀態：未解鎖、未暫停', () => {
      expect(system.isUnlocked).toBe(false);
      expect(system.isSuspended).toBe(false);
      expect(system.isMuted).toBe(false);
    });

    it('接受 busSnapshot 選項', () => {
      const opts: AudioSystemOptions = {
        busSnapshot: { master: { volume: 0.5, muted: true } },
      };
      const s = new AudioSystem(opts);
      expect(s.buses.master.volume).toBe(0.5);
      expect(s.buses.master.muted).toBe(true);
      s.dispose();
    });
  });

  describe('volume control', () => {
    it('setMasterVolume 更新 buses', () => {
      system.setMasterVolume(0.3);
      expect(system.buses.master.volume).toBe(0.3);
    });

    it('setMusicVolume 更新 buses', () => {
      system.setMusicVolume(0.4);
      expect(system.buses.music.volume).toBe(0.4);
    });

    it('setSfxVolume 更新 buses', () => {
      system.setSfxVolume(0.5);
      expect(system.buses.sfx.volume).toBe(0.5);
    });

    it('toggleMute 切換全域靜音', () => {
      expect(system.isMuted).toBe(false);
      system.toggleMute();
      expect(system.isMuted).toBe(true);
      system.toggleMute();
      expect(system.isMuted).toBe(false);
    });

    it('setMute 直接設定靜音', () => {
      system.setMute(true);
      expect(system.isMuted).toBe(true);
      system.setMute(false);
      expect(system.isMuted).toBe(false);
    });
  });

  describe('EventBus integration', () => {
    it('connectEventBus 後監聽事件', () => {
      const bus = createMockEventBus();
      system.connectEventBus(bus as any);

      // 應該有多個事件被監聽
      expect(bus.listeners.size).toBeGreaterThan(0);
      expect(bus.listeners.has('match.landed')).toBe(true);
      expect(bus.listeners.has('special.spawned')).toBe(true);
      expect(bus.listeners.has('combo.triggered')).toBe(true);
      expect(bus.listeners.has('swap.invalid')).toBe(true);
      expect(bus.listeners.has('intensity.updated')).toBe(true);
    });

    it('disconnectEventBus 後移除所有監聽', () => {
      const bus = createMockEventBus();
      system.connectEventBus(bus as any);
      system.disconnectEventBus();

      // 所有監聽器應被移除
      let totalListeners = 0;
      for (const [, arr] of bus.listeners) {
        totalListeners += arr.length;
      }
      expect(totalListeners).toBe(0);
    });

    it('重複 connectEventBus 先斷開舊的', () => {
      const bus1 = createMockEventBus();
      const bus2 = createMockEventBus();

      system.connectEventBus(bus1 as any);
      system.connectEventBus(bus2 as any);

      // bus1 的監聽器應被清除
      let bus1Listeners = 0;
      for (const [, arr] of bus1.listeners) {
        bus1Listeners += arr.length;
      }
      expect(bus1Listeners).toBe(0);

      // bus2 應有監聽器
      expect(bus2.listeners.size).toBeGreaterThan(0);
    });

    it('match.landed 事件觸發 SFX（chain 映射）', () => {
      const bus = createMockEventBus();
      const playSpy = vi.spyOn(system.sfx, 'play');
      system.connectEventBus(bus as any);

      // chain=1 → 只有 match.base
      bus.emit('match.landed', { chain: 1 });
      expect(playSpy).toHaveBeenCalledWith('match.base');
      expect(playSpy).not.toHaveBeenCalledWith('chain.tier1');

      playSpy.mockClear();

      // chain=2 → match.base + chain.tier1
      bus.emit('match.landed', { chain: 2 });
      expect(playSpy).toHaveBeenCalledWith('match.base');
      expect(playSpy).toHaveBeenCalledWith('chain.tier1');

      playSpy.mockClear();

      // chain=5 → match.base + chain.tier3
      bus.emit('match.landed', { chain: 5 });
      expect(playSpy).toHaveBeenCalledWith('match.base');
      expect(playSpy).toHaveBeenCalledWith('chain.tier3');

      playSpy.mockClear();

      // chain=8 → match.base + chain.wow
      bus.emit('match.landed', { chain: 8 });
      expect(playSpy).toHaveBeenCalledWith('match.base');
      expect(playSpy).toHaveBeenCalledWith('chain.wow');
    });

    it('special.spawned 事件觸發 special.spawn.* SFX', () => {
      const bus = createMockEventBus();
      const playSpy = vi.spyOn(system.sfx, 'play');
      system.connectEventBus(bus as any);

      bus.emit('special.spawned', { type: 'area' });
      expect(playSpy).toHaveBeenCalledWith('special.spawn.bomb');

      playSpy.mockClear();
      bus.emit('special.spawned', { type: 'lineH' });
      expect(playSpy).toHaveBeenCalledWith('special.spawn.line');

      playSpy.mockClear();
      bus.emit('special.spawned', { type: 'colour' });
      expect(playSpy).toHaveBeenCalledWith('special.spawn.colour');
    });

    it('combo.triggered 事件觸發對應 combo SFX', () => {
      const bus = createMockEventBus();
      const playSpy = vi.spyOn(system.sfx, 'play');
      system.connectEventBus(bus as any);

      bus.emit('combo.triggered', { type: 'bomb.bomb' });
      expect(playSpy).toHaveBeenCalledWith('combo.bomb.bomb');

      playSpy.mockClear();
      bus.emit('combo.triggered', { type: 'colour.colour' });
      expect(playSpy).toHaveBeenCalledWith('combo.colour.colour');
    });

    it('intensity.updated 事件更新內部 intensity', () => {
      const bus = createMockEventBus();
      system.connectEventBus(bus as any);

      bus.emit('intensity.updated', { value: 0.75 });
      // update() 會將 intensity 傳給 music
      system.update();
      expect(system.music.getIntensity()).toBe(0.75);
    });
  });

  describe('suspend / resume', () => {
    it('suspend 設定暫停狀態', () => {
      system.suspend();
      expect(system.isSuspended).toBe(true);
    });

    it('resume 恢復暫停狀態', () => {
      system.suspend();
      system.resume();
      expect(system.isSuspended).toBe(false);
    });

    it('重複 suspend 不拋錯', () => {
      system.suspend();
      expect(() => system.suspend()).not.toThrow();
      expect(system.isSuspended).toBe(true);
    });

    it('未暫停時 resume 不拋錯', () => {
      expect(() => system.resume()).not.toThrow();
      expect(system.isSuspended).toBe(false);
    });
  });

  describe('update', () => {
    it('update 不拋錯（無 EventBus 連接時）', () => {
      expect(() => system.update()).not.toThrow();
    });

    it('update 將 intensity 傳遞給 adaptive music', () => {
      const bus = createMockEventBus();
      system.connectEventBus(bus as any);

      bus.emit('intensity.updated', { value: 0.6 });
      system.update();

      expect(system.music.getIntensity()).toBe(0.6);
    });
  });

  describe('dispose', () => {
    it('dispose 後 EventBus 斷開', () => {
      const bus = createMockEventBus();
      system.connectEventBus(bus as any);
      system.dispose();

      let totalListeners = 0;
      for (const [, arr] of bus.listeners) {
        totalListeners += arr.length;
      }
      expect(totalListeners).toBe(0);
    });
  });
});
