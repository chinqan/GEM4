import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  defaultSaveState,
  SaveManager,
  exportSave,
  importSave,
  resetSave,
  SAVE_KEY,
  DEBOUNCE_MS,
  CURRENT_VERSION,
} from '../save-state';
import type { SaveState } from '../save-state';
import { migrate } from '../migrations';

// ─── localStorage mock ─────────────────────────────────────

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    _store: store,
  };
}

let storageMock: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  storageMock = createLocalStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    writable: true,
    configurable: true,
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── 18.1 SaveState 型別與 defaultSaveState ────────────────

describe('defaultSaveState', () => {
  it('回傳版本 1 的存檔', () => {
    const state = defaultSaveState();
    expect(state.version).toBe(CURRENT_VERSION);
    expect(state.version).toBe(1);
  });

  it('levels 為空物件', () => {
    const state = defaultSaveState();
    expect(state.levels).toEqual({});
  });

  it('settings 包含完整的預設值', () => {
    const state = defaultSaveState();
    expect(state.settings.audio).toEqual({
      masterVolume: 1.0,
      musicVolume: 0.8,
      sfxVolume: 1.0,
      muted: false,
    });
    expect(state.settings.graphicsPreset).toBe('high');
    expect(state.settings.accessibility).toEqual({
      colorBlindMode: 'none',
      highContrast: false,
      longPressConfirm: false,
    });
    expect(state.settings.gameplay).toEqual({
      hintDelayMs: 5000,
      autoActivateSpecial: false,
    });
    expect(state.settings.language).toBe('zh-TW');
  });

  it('tutorialMilestones 為空陣列', () => {
    const state = defaultSaveState();
    expect(state.tutorialMilestones).toEqual([]);
  });

  it('endlessBest 各項為空陣列', () => {
    const state = defaultSaveState();
    expect(state.endlessBest).toEqual({
      highScores: [],
      longestChains: [],
      mostSpecials: [],
    });
  });

  it('progress 預設為世界 1、解鎖關卡 1、0 星', () => {
    const state = defaultSaveState();
    expect(state.progress).toEqual({
      currentWorld: 1,
      unlockedLevels: [1],
      totalStars: 0,
    });
  });

  it('每次呼叫回傳獨立的物件（不共享參考）', () => {
    const a = defaultSaveState();
    const b = defaultSaveState();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.levels[1] = { stars: 3, highScore: 1000, attempts: 1 };
    expect(b.levels[1]).toBeUndefined();
  });
});

// ─── 18.2 SaveManager ──────────────────────────────────────

describe('SaveManager', () => {
  let manager: SaveManager;

  beforeEach(() => {
    manager = new SaveManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  // ─── load ─────────────────────────────────────────────

  describe('load', () => {
    it('localStorage 無資料時回傳 defaultSaveState', () => {
      const state = manager.load();
      expect(state).toEqual(defaultSaveState());
    });

    it('localStorage 有有效 v1 資料時回傳該資料', () => {
      const saved = defaultSaveState();
      saved.levels[1] = { stars: 2, highScore: 500, attempts: 3 };
      storageMock._store.set(SAVE_KEY, JSON.stringify(saved));

      const loaded = manager.load();
      expect(loaded.levels[1]).toEqual({ stars: 2, highScore: 500, attempts: 3 });
    });

    it('localStorage 有無效 JSON 時回傳 defaultSaveState', () => {
      storageMock._store.set(SAVE_KEY, '{invalid json!!!');
      const state = manager.load();
      expect(state).toEqual(defaultSaveState());
    });

    it('localStorage 拋錯時回傳 defaultSaveState', () => {
      storageMock.getItem.mockImplementation(() => {
        throw new Error('SecurityError');
      });
      const state = manager.load();
      expect(state).toEqual(defaultSaveState());
    });

    it('load 呼叫 migrate 處理版本遷移', () => {
      const futureData = { version: 99, someNewField: true };
      storageMock._store.set(SAVE_KEY, JSON.stringify(futureData));

      const state = manager.load();
      // 未知版本 → defaultSaveState
      expect(state.version).toBe(CURRENT_VERSION);
    });
  });

  // ─── save（debounce） ─────────────────────────────────

  describe('save (debounce)', () => {
    it('非立即模式下不會馬上寫入', () => {
      const state = defaultSaveState();
      manager.save(state);
      expect(storageMock.setItem).not.toHaveBeenCalled();
    });

    it('debounce 時間到後寫入 localStorage', () => {
      const state = defaultSaveState();
      state.levels[1] = { stars: 1, highScore: 100, attempts: 1 };
      manager.save(state);

      vi.advanceTimersByTime(DEBOUNCE_MS);

      expect(storageMock.setItem).toHaveBeenCalledOnce();
      expect(storageMock.setItem).toHaveBeenCalledWith(
        SAVE_KEY,
        JSON.stringify(state),
      );
    });

    it('debounce 期間多次 save 只寫入最後一次的狀態', () => {
      const state1 = defaultSaveState();
      state1.levels[1] = { stars: 1, highScore: 100, attempts: 1 };

      const state2 = defaultSaveState();
      state2.levels[1] = { stars: 3, highScore: 999, attempts: 5 };

      manager.save(state1);
      manager.save(state2); // 更新 pendingState，但不重新排程

      vi.advanceTimersByTime(DEBOUNCE_MS);

      expect(storageMock.setItem).toHaveBeenCalledOnce();
      const written = JSON.parse(storageMock.setItem.mock.calls[0][1]);
      expect(written.levels['1']).toEqual({ stars: 3, highScore: 999, attempts: 5 });
    });

    it('immediate=true 立即寫入', () => {
      const state = defaultSaveState();
      manager.save(state, true);
      expect(storageMock.setItem).toHaveBeenCalledOnce();
    });

    it('immediate=true 取消排程中的 debounce', () => {
      const state = defaultSaveState();
      manager.save(state); // 排程 debounce
      manager.save(state, true); // 立即寫入，取消 debounce

      vi.advanceTimersByTime(DEBOUNCE_MS);

      // 只有 immediate 那次寫入
      expect(storageMock.setItem).toHaveBeenCalledOnce();
    });
  });

  // ─── flush ────────────────────────────────────────────

  describe('flush', () => {
    it('無 pending 狀態時 flush 不寫入', () => {
      manager.flush();
      expect(storageMock.setItem).not.toHaveBeenCalled();
    });

    it('flush 寫入 pending 狀態', () => {
      const state = defaultSaveState();
      manager.save(state); // 設定 pendingState
      manager.flush();
      expect(storageMock.setItem).toHaveBeenCalledOnce();
    });

    it('localStorage 滿時 flush 不拋錯（優雅降級）', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      storageMock.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const state = defaultSaveState();
      manager.save(state);

      expect(() => manager.flush()).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('無法儲存進度'),
      );
    });
  });

  // ─── dispose ──────────────────────────────────────────

  describe('dispose', () => {
    it('dispose 後 debounce 不再觸發', () => {
      const state = defaultSaveState();
      manager.save(state);
      manager.dispose();

      vi.advanceTimersByTime(DEBOUNCE_MS);
      expect(storageMock.setItem).not.toHaveBeenCalled();
    });
  });
});

// ─── 18.3 migrate ──────────────────────────────────────────

describe('migrate', () => {
  it('null → defaultSaveState', () => {
    expect(migrate(null)).toEqual(defaultSaveState());
  });

  it('undefined → defaultSaveState', () => {
    expect(migrate(undefined)).toEqual(defaultSaveState());
  });

  it('陣列 → defaultSaveState', () => {
    expect(migrate([1, 2, 3])).toEqual(defaultSaveState());
  });

  it('字串 → defaultSaveState', () => {
    expect(migrate('hello')).toEqual(defaultSaveState());
  });

  it('數字 → defaultSaveState', () => {
    expect(migrate(42)).toEqual(defaultSaveState());
  });

  it('缺少 version 的物件 → defaultSaveState', () => {
    expect(migrate({ foo: 'bar' })).toEqual(defaultSaveState());
  });

  it('version 非數字 → defaultSaveState', () => {
    expect(migrate({ version: 'one' })).toEqual(defaultSaveState());
  });

  it('version === 1 → 回傳原資料', () => {
    const data = defaultSaveState();
    data.levels[5] = { stars: 3, highScore: 2000, attempts: 10 };
    const result = migrate(data);
    expect(result).toBe(data); // 同一參考
    expect(result.levels[5]).toEqual({ stars: 3, highScore: 2000, attempts: 10 });
  });

  it('未知版本 → escrow 保存 + defaultSaveState', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const futureData = { version: 99, newFeature: true };

    const result = migrate(futureData);

    expect(result).toEqual(defaultSaveState());
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('未知存檔版本 99'),
    );

    // 驗證 escrow 保存
    expect(storageMock.setItem).toHaveBeenCalledOnce();
    const escrowCall = storageMock.setItem.mock.calls[0];
    expect(escrowCall[0]).toMatch(/^gem\.save\.v1\.escrow\.\d+$/);
    expect(JSON.parse(escrowCall[1])).toEqual(futureData);
  });

  it('未知版本 + localStorage 滿 → 仍回傳 defaultSaveState', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageMock.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const result = migrate({ version: 42 });
    expect(result).toEqual(defaultSaveState());
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('無法保存 escrow'),
    );
  });
});

// ─── 18.4 export/import JSON ───────────────────────────────

describe('exportSave', () => {
  it('回傳有效的 JSON 字串', () => {
    const state = defaultSaveState();
    const json = exportSave(state);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('匯出的 JSON 可還原為相同的 SaveState', () => {
    const state = defaultSaveState();
    state.levels[1] = { stars: 3, highScore: 5000, attempts: 7 };
    state.settings.language = 'en';

    const json = exportSave(state);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(state);
  });
});

describe('importSave', () => {
  it('有效的 v1 JSON → 回傳 SaveState', () => {
    const original = defaultSaveState();
    original.levels[2] = { stars: 2, highScore: 300, attempts: 2 };
    const json = JSON.stringify(original);

    const result = importSave(json);
    expect(result.version).toBe(1);
    expect(result.levels[2]).toEqual({ stars: 2, highScore: 300, attempts: 2 });
  });

  it('無效 JSON → 拋出描述性錯誤', () => {
    expect(() => importSave('{bad json')).toThrow('匯入失敗：無效的 JSON 格式');
  });

  it('非物件（陣列）→ 拋出描述性錯誤', () => {
    expect(() => importSave('[1,2,3]')).toThrow('匯入失敗：資料必須是物件');
  });

  it('非物件（字串）→ 拋出描述性錯誤', () => {
    expect(() => importSave('"hello"')).toThrow('匯入失敗：資料必須是物件');
  });

  it('非物件（null）→ 拋出描述性錯誤', () => {
    expect(() => importSave('null')).toThrow('匯入失敗：資料必須是物件');
  });

  it('缺少 version → 拋出描述性錯誤', () => {
    expect(() => importSave('{"foo":"bar"}')).toThrow(
      '匯入失敗：缺少有效的 version 欄位',
    );
  });

  it('version 非數字 → 拋出描述性錯誤', () => {
    expect(() => importSave('{"version":"one"}')).toThrow(
      '匯入失敗：缺少有效的 version 欄位',
    );
  });

  it('未知版本 → 透過 migrate 處理（escrow + defaultSaveState）', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const json = JSON.stringify({ version: 99, data: 'future' });
    const result = importSave(json);
    expect(result).toEqual(defaultSaveState());
  });

  it('exportSave → importSave 往返一致', () => {
    const state = defaultSaveState();
    state.levels[10] = { stars: 1, highScore: 200, attempts: 4 };
    state.tutorialMilestones = ['firstMatch', 'firstSpecial'];
    state.endlessBest.highScores = [5000, 3000, 1000];
    state.progress.currentWorld = 3;
    state.progress.unlockedLevels = [1, 2, 3, 4, 5];
    state.progress.totalStars = 12;

    const json = exportSave(state);
    const imported = importSave(json);
    expect(imported).toEqual(state);
  });
});

// ─── 18.5 reset ────────────────────────────────────────────

describe('resetSave', () => {
  it('回傳 defaultSaveState', () => {
    const result = resetSave();
    expect(result).toEqual(defaultSaveState());
  });

  it('清除 localStorage 中的存檔', () => {
    storageMock._store.set(SAVE_KEY, JSON.stringify(defaultSaveState()));
    resetSave();
    expect(storageMock.removeItem).toHaveBeenCalledWith(SAVE_KEY);
  });

  it('localStorage 拋錯時不拋出（優雅降級）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storageMock.removeItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => resetSave()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('無法清除'),
    );
  });
});

// ─── 整合測試：完整讀寫循環 ────────────────────────────────

describe('整合：讀寫循環', () => {
  it('save → load 往返一致', () => {
    const manager = new SaveManager();
    const state = defaultSaveState();
    state.levels[1] = { stars: 3, highScore: 9999, attempts: 1 };
    state.settings.audio.muted = true;
    state.progress.totalStars = 3;

    manager.save(state, true);
    const loaded = manager.load();

    expect(loaded).toEqual(state);
    manager.dispose();
  });

  it('reset 後 load 回傳預設值', () => {
    const manager = new SaveManager();
    const state = defaultSaveState();
    state.levels[1] = { stars: 2, highScore: 500, attempts: 3 };
    manager.save(state, true);

    resetSave();
    const loaded = manager.load();

    expect(loaded).toEqual(defaultSaveState());
    expect(loaded.levels[1]).toBeUndefined();
    manager.dispose();
  });

  it('export → reset → import 恢復資料', () => {
    const state = defaultSaveState();
    state.levels[5] = { stars: 3, highScore: 8000, attempts: 2 };
    state.endlessBest.highScores = [10000, 8000, 5000];

    const json = exportSave(state);
    resetSave();

    const restored = importSave(json);
    expect(restored.levels[5]).toEqual({ stars: 3, highScore: 8000, attempts: 2 });
    expect(restored.endlessBest.highScores).toEqual([10000, 8000, 5000]);
  });
});
