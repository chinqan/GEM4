import { describe, it, expect } from 'vitest';
import {
  transition,
  canTransition,
  getValidTargets,
  LEGAL_TRANSITIONS,
  IllegalTransitionError,
} from '../state-machine';
import type { AppState, AppStateKind } from '../app-state';
import { ALL_STATE_KINDS } from '../app-state';

// ─── 工具：建立簡單狀態 ─────────────────────────────────────

function makeState(kind: AppStateKind): AppState {
  switch (kind) {
    case 'splash':        return { kind: 'splash' };
    case 'menu':          return { kind: 'menu' };
    case 'worldMap':      return { kind: 'worldMap', worldId: 1 };
    case 'levelSelect':   return { kind: 'levelSelect', worldId: 1, levelId: 1 };
    case 'game':          return { kind: 'game', levelId: 1 };
    case 'pause':         return { kind: 'pause', previous: { kind: 'game', levelId: 1 } };
    case 'levelComplete': return { kind: 'levelComplete' };
    case 'levelFail':     return { kind: 'levelFail' };
    case 'endless':       return { kind: 'endless' };
    case 'endlessEnd':    return { kind: 'endlessEnd' };
    case 'settings':      return { kind: 'settings', returnTo: { kind: 'menu' } };
    case 'credits':       return { kind: 'credits' };
  }
}

// ─── 17.4 單元測試 ──────────────────────────────────────────

describe('State Machine', () => {
  // ─── 合法轉換表完整性 ────────────────────────────────

  describe('LEGAL_TRANSITIONS 完整性', () => {
    it('涵蓋所有 12 種狀態', () => {
      const keys = Object.keys(LEGAL_TRANSITIONS) as AppStateKind[];
      expect(keys.sort()).toEqual([...ALL_STATE_KINDS].sort());
    });

    it('所有目標都是合法的 AppStateKind', () => {
      for (const [_from, targets] of Object.entries(LEGAL_TRANSITIONS)) {
        for (const to of targets) {
          expect(ALL_STATE_KINDS).toContain(to);
        }
      }
    });
  });

  // ─── 合法轉換 ────────────────────────────────────────

  describe('合法轉換', () => {
    it('splash → menu', () => {
      const result = transition({ kind: 'splash' }, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });

    it('menu → worldMap', () => {
      const result = transition({ kind: 'menu' }, { kind: 'worldMap', worldId: 1 });
      expect(result.kind).toBe('worldMap');
    });

    it('menu → credits', () => {
      const result = transition({ kind: 'menu' }, { kind: 'credits' });
      expect(result.kind).toBe('credits');
    });

    it('menu → endless', () => {
      const result = transition({ kind: 'menu' }, { kind: 'endless' });
      expect(result.kind).toBe('endless');
    });

    it('worldMap → levelSelect', () => {
      const result = transition(
        { kind: 'worldMap', worldId: 1 },
        { kind: 'levelSelect', worldId: 1, levelId: 5 },
      );
      expect(result.kind).toBe('levelSelect');
    });

    it('worldMap → menu', () => {
      const result = transition({ kind: 'worldMap', worldId: 1 }, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });

    it('levelSelect → game', () => {
      const result = transition(
        { kind: 'levelSelect', worldId: 1, levelId: 5 },
        { kind: 'game', levelId: 5 },
      );
      expect(result.kind).toBe('game');
    });

    it('levelSelect → worldMap', () => {
      const result = transition(
        { kind: 'levelSelect', worldId: 1, levelId: 5 },
        { kind: 'worldMap', worldId: 1 },
      );
      expect(result.kind).toBe('worldMap');
    });

    it('game → levelComplete', () => {
      const result = transition({ kind: 'game', levelId: 1 }, { kind: 'levelComplete' });
      expect(result.kind).toBe('levelComplete');
    });

    it('game → levelFail', () => {
      const result = transition({ kind: 'game', levelId: 1 }, { kind: 'levelFail' });
      expect(result.kind).toBe('levelFail');
    });

    it('levelComplete → levelSelect', () => {
      const result = transition(
        { kind: 'levelComplete' },
        { kind: 'levelSelect', worldId: 1, levelId: 2 },
      );
      expect(result.kind).toBe('levelSelect');
    });

    it('levelComplete → worldMap', () => {
      const result = transition(
        { kind: 'levelComplete' },
        { kind: 'worldMap', worldId: 1 },
      );
      expect(result.kind).toBe('worldMap');
    });

    it('levelComplete → game (重玩)', () => {
      const result = transition(
        { kind: 'levelComplete' },
        { kind: 'game', levelId: 1 },
      );
      expect(result.kind).toBe('game');
    });

    it('levelFail → game (重試)', () => {
      const result = transition(
        { kind: 'levelFail' },
        { kind: 'game', levelId: 1 },
      );
      expect(result.kind).toBe('game');
    });

    it('levelFail → levelSelect', () => {
      const result = transition(
        { kind: 'levelFail' },
        { kind: 'levelSelect', worldId: 1, levelId: 1 },
      );
      expect(result.kind).toBe('levelSelect');
    });

    it('endless → endlessEnd', () => {
      const result = transition({ kind: 'endless' }, { kind: 'endlessEnd' });
      expect(result.kind).toBe('endlessEnd');
    });

    it('endlessEnd → menu', () => {
      const result = transition({ kind: 'endlessEnd' }, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });

    it('credits → menu', () => {
      const result = transition({ kind: 'credits' }, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });
  });

  // ─── 非法轉換 ────────────────────────────────────────

  describe('非法轉換', () => {
    it('splash → game 拋錯', () => {
      expect(() =>
        transition({ kind: 'splash' }, { kind: 'game', levelId: 1 }),
      ).toThrow(IllegalTransitionError);
    });

    it('menu → game 允許（測試模式直接進入）', () => {
      const result = transition({ kind: 'menu' }, { kind: 'game', levelId: -1 });
      expect(result.kind).toBe('game');
    });

    it('credits → worldMap 拋錯', () => {
      expect(() =>
        transition({ kind: 'credits' }, { kind: 'worldMap', worldId: 1 }),
      ).toThrow(IllegalTransitionError);
    });

    it('endlessEnd → endless 拋錯', () => {
      expect(() =>
        transition({ kind: 'endlessEnd' }, { kind: 'endless' }),
      ).toThrow(IllegalTransitionError);
    });

    it('levelFail → menu 拋錯', () => {
      expect(() =>
        transition({ kind: 'levelFail' }, { kind: 'menu' }),
      ).toThrow(IllegalTransitionError);
    });

    it('endless → menu 拋錯（必須經過 endlessEnd）', () => {
      expect(() =>
        transition({ kind: 'endless' }, { kind: 'menu' }),
      ).toThrow(IllegalTransitionError);
    });
  });

  // ─── 自我轉換 ────────────────────────────────────────

  describe('自我轉換', () => {
    it('worldMap → worldMap 允許（世界切換）', () => {
      const from: AppState = { kind: 'worldMap', worldId: 1 };
      const to: AppState = { kind: 'worldMap', worldId: 2 };
      const result = transition(from, to);
      expect(result.kind).toBe('worldMap');
      expect((result as { worldId: number }).worldId).toBe(2);
    });

    it('game → game 允許（重新開始關卡）', () => {
      const from: AppState = { kind: 'game', levelId: 1 };
      const to: AppState = { kind: 'game', levelId: 1 };
      const result = transition(from, to);
      expect(result.kind).toBe('game');
      expect((result as { levelId: number }).levelId).toBe(1);
    });

    it('其他狀態自我轉換拋錯', () => {
      const allowedSelfTransitions: AppStateKind[] = ['worldMap', 'game'];
      const nonAllowedKinds = ALL_STATE_KINDS.filter((k) => !allowedSelfTransitions.includes(k));
      for (const kind of nonAllowedKinds) {
        const state = makeState(kind);
        expect(
          () => transition(state, makeState(kind)),
          `${kind} → ${kind} should throw`,
        ).toThrow(IllegalTransitionError);
      }
    });
  });

  // ─── pause 不變式 ────────────────────────────────────

  describe('pause 不變式', () => {
    it('game → pause 記錄 previous 為 game', () => {
      const gameState: AppState = { kind: 'game', levelId: 42 };
      const result = transition(gameState, { kind: 'pause', previous: gameState });
      expect(result.kind).toBe('pause');
      expect((result as { previous: AppState }).previous.kind).toBe('game');
      expect(((result as { previous: { levelId: number } }).previous).levelId).toBe(42);
    });

    it('endless → pause 記錄 previous 為 endless', () => {
      const endlessState: AppState = { kind: 'endless' };
      const result = transition(endlessState, { kind: 'pause', previous: endlessState });
      expect(result.kind).toBe('pause');
      expect((result as { previous: AppState }).previous.kind).toBe('endless');
    });

    it('pause → game 合法', () => {
      const pauseState: AppState = {
        kind: 'pause',
        previous: { kind: 'game', levelId: 1 },
      };
      const result = transition(pauseState, { kind: 'game', levelId: 1 });
      expect(result.kind).toBe('game');
    });

    it('pause → menu 合法', () => {
      const pauseState: AppState = {
        kind: 'pause',
        previous: { kind: 'game', levelId: 1 },
      };
      const result = transition(pauseState, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });

    it('pause → levelSelect 合法', () => {
      const pauseState: AppState = {
        kind: 'pause',
        previous: { kind: 'game', levelId: 1 },
      };
      const result = transition(pauseState, { kind: 'levelSelect', worldId: 1, levelId: 1 });
      expect(result.kind).toBe('levelSelect');
    });
  });

  // ─── settings 不變式 ─────────────────────────────────

  describe('settings 不變式', () => {
    it('menu → settings 記錄 returnTo 為 menu', () => {
      const result = transition({ kind: 'menu' }, { kind: 'settings', returnTo: { kind: 'menu' } });
      expect(result.kind).toBe('settings');
      expect((result as { returnTo: AppState }).returnTo.kind).toBe('menu');
    });

    it('game → settings 記錄 returnTo 為 game', () => {
      const gameState: AppState = { kind: 'game', levelId: 5 };
      const result = transition(gameState, { kind: 'settings', returnTo: gameState });
      expect(result.kind).toBe('settings');
      const returnTo = (result as { returnTo: AppState }).returnTo;
      expect(returnTo.kind).toBe('game');
      expect((returnTo as { levelId: number }).levelId).toBe(5);
    });

    it('pause → settings 記錄 returnTo 為 pause', () => {
      const pauseState: AppState = {
        kind: 'pause',
        previous: { kind: 'game', levelId: 1 },
      };
      const result = transition(pauseState, { kind: 'settings', returnTo: pauseState });
      expect(result.kind).toBe('settings');
      expect((result as { returnTo: AppState }).returnTo.kind).toBe('pause');
    });

    it('worldMap → settings 記錄 returnTo 為 worldMap', () => {
      const wmState: AppState = { kind: 'worldMap', worldId: 2 };
      const result = transition(wmState, { kind: 'settings', returnTo: wmState });
      expect(result.kind).toBe('settings');
      expect((result as { returnTo: AppState }).returnTo.kind).toBe('worldMap');
    });

    it('settings → returnTo 回到原始狀態', () => {
      const settingsState: AppState = {
        kind: 'settings',
        returnTo: { kind: 'menu' },
      };
      const result = transition(settingsState, { kind: 'menu' });
      expect(result.kind).toBe('menu');
    });

    it('settings → 非 returnTo 的目標拋錯', () => {
      const settingsState: AppState = {
        kind: 'settings',
        returnTo: { kind: 'menu' },
      };
      expect(() =>
        transition(settingsState, { kind: 'worldMap', worldId: 1 }),
      ).toThrow(IllegalTransitionError);
    });

    it('settings → settings 拋錯（returnTo 不能是 settings）', () => {
      const settingsState: AppState = {
        kind: 'settings',
        returnTo: { kind: 'menu' },
      };
      expect(() =>
        transition(settingsState, { kind: 'settings', returnTo: { kind: 'menu' } }),
      ).toThrow(IllegalTransitionError);
    });

    it('不能從不支援 settings 的狀態進入 settings', () => {
      // splash, levelSelect, levelFail, endlessEnd, credits 不能進入 settings
      const noSettingsKinds: AppStateKind[] = ['splash', 'levelSelect', 'levelFail', 'endlessEnd', 'credits'];
      for (const kind of noSettingsKinds) {
        const state = makeState(kind);
        expect(
          () => transition(state, { kind: 'settings', returnTo: state }),
          `${kind} → settings should throw`,
        ).toThrow(IllegalTransitionError);
      }
    });
  });

  // ─── canTransition ───────────────────────────────────

  describe('canTransition', () => {
    it('合法轉換回傳 true', () => {
      expect(canTransition({ kind: 'splash' }, { kind: 'menu' })).toBe(true);
    });

    it('非法轉換回傳 false', () => {
      expect(canTransition({ kind: 'splash' }, { kind: 'game', levelId: 1 })).toBe(false);
    });

    it('自我轉換 worldMap 回傳 true', () => {
      expect(
        canTransition({ kind: 'worldMap', worldId: 1 }, { kind: 'worldMap', worldId: 2 }),
      ).toBe(true);
    });

    it('自我轉換 menu 回傳 false', () => {
      expect(canTransition({ kind: 'menu' }, { kind: 'menu' })).toBe(false);
    });
  });

  // ─── getValidTargets ─────────────────────────────────

  describe('getValidTargets', () => {
    it('splash 只能到 menu', () => {
      expect(getValidTargets({ kind: 'splash' })).toEqual(['menu']);
    });

    it('menu 可到 worldMap, settings, credits, endless', () => {
      const targets = getValidTargets({ kind: 'menu' });
      expect(targets).toContain('worldMap');
      expect(targets).toContain('settings');
      expect(targets).toContain('credits');
      expect(targets).toContain('endless');
    });

    it('settings 回傳 returnTo 的 kind', () => {
      const targets = getValidTargets({
        kind: 'settings',
        returnTo: { kind: 'game', levelId: 1 },
      });
      expect(targets).toEqual(['game']);
    });
  });

  // ─── IllegalTransitionError ──────────────────────────

  describe('IllegalTransitionError', () => {
    it('包含 from 和 to 資訊', () => {
      try {
        transition({ kind: 'splash' }, { kind: 'game', levelId: 1 });
      } catch (e) {
        expect(e).toBeInstanceOf(IllegalTransitionError);
        const err = e as IllegalTransitionError;
        expect(err.from).toBe('splash');
        expect(err.to).toBe('game');
        expect(err.name).toBe('IllegalTransitionError');
      }
    });
  });
});
