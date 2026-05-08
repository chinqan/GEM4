/**
 * CP-7 Property-Based Test：狀態機轉換合法性
 *
 * **Validates: Requirements CP-7**
 *
 * 驗證屬性：
 * 1. 所有轉換遵循合法轉換表
 * 2. 非法轉換拋出錯誤
 * 3. pause.previous 不變式成立
 * 4. settings.returnTo 不變式成立
 * 5. 自我轉換被拒絕（worldMap 除外）
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  transition,
  LEGAL_TRANSITIONS,
  IllegalTransitionError,
} from '../state-machine';
import type { AppState, AppStateKind } from '../app-state';
import { ALL_STATE_KINDS } from '../app-state';

// ─── 生成器 ─────────────────────────────────────────────────

/** 生成隨機 AppStateKind */
const arbStateKind: fc.Arbitrary<AppStateKind> = fc.constantFrom(...ALL_STATE_KINDS);

/** 生成隨機 AppState（不含 pause 和 settings 的特殊欄位） */
function arbSimpleState(kind: AppStateKind): fc.Arbitrary<AppState> {
  switch (kind) {
    case 'splash':
      return fc.constant({ kind: 'splash' } as AppState);
    case 'menu':
      return fc.constant({ kind: 'menu' } as AppState);
    case 'worldMap':
      return fc.integer({ min: 1, max: 4 }).map((worldId) => ({
        kind: 'worldMap' as const,
        worldId,
      }));
    case 'levelSelect':
      return fc.record({
        worldId: fc.integer({ min: 1, max: 4 }),
        levelId: fc.integer({ min: 1, max: 80 }),
      }).map(({ worldId, levelId }) => ({
        kind: 'levelSelect' as const,
        worldId,
        levelId,
      }));
    case 'game':
      return fc.integer({ min: 1, max: 80 }).map((levelId) => ({
        kind: 'game' as const,
        levelId,
      }));
    case 'pause':
      // pause.previous 只能是 game 或 endless
      return fc.oneof(
        fc.integer({ min: 1, max: 80 }).map((levelId) => ({
          kind: 'pause' as const,
          previous: { kind: 'game' as const, levelId },
        })),
        fc.constant({
          kind: 'pause' as const,
          previous: { kind: 'endless' as const },
        }),
      ) as fc.Arbitrary<AppState>;
    case 'levelComplete':
      return fc.constant({ kind: 'levelComplete' } as AppState);
    case 'levelFail':
      return fc.constant({ kind: 'levelFail' } as AppState);
    case 'endless':
      return fc.constant({ kind: 'endless' } as AppState);
    case 'endlessEnd':
      return fc.constant({ kind: 'endlessEnd' } as AppState);
    case 'settings':
      // settings.returnTo 不能是 settings，從可進入 settings 的狀態中選
      return fc.constantFrom('menu', 'worldMap', 'game', 'pause' as AppStateKind).chain(
        (returnToKind) => arbSimpleState(returnToKind).map((returnTo) => ({
          kind: 'settings' as const,
          returnTo,
        } as AppState)),
      );
    case 'credits':
      return fc.constant({ kind: 'credits' } as AppState);
  }
}

/** 生成隨機 AppState */
const arbAppState: fc.Arbitrary<AppState> = arbStateKind.chain(arbSimpleState);

/** 生成一對 (from, to) 狀態，其中 to 是 from 的合法目標 */
const arbLegalTransitionPair: fc.Arbitrary<{ from: AppState; to: AppState }> =
  // 排除 settings（其合法目標是動態的）
  fc.constantFrom(
    ...ALL_STATE_KINDS.filter((k) => k !== 'settings'),
  ).filter((fromKind) => {
    const targets = LEGAL_TRANSITIONS[fromKind];
    return targets.length > 0;
  }).chain((fromKind) => {
    const targets = LEGAL_TRANSITIONS[fromKind];
    return fc.tuple(
      arbSimpleState(fromKind),
      fc.constantFrom(...targets).chain(arbSimpleState),
    ).map(([from, to]) => ({ from, to }));
  });

/** 生成一對 (from, to) 狀態，其中 to 不是 from 的合法目標 */
const arbIllegalTransitionPair: fc.Arbitrary<{ from: AppState; to: AppState }> =
  fc.constantFrom(
    ...ALL_STATE_KINDS.filter((k) => k !== 'settings'),
  ).chain((fromKind) => {
    const legalTargets = LEGAL_TRANSITIONS[fromKind];
    // 找出不合法的目標（排除 settings 因為它有特殊處理）
    const illegalTargets = ALL_STATE_KINDS.filter(
      (k) => !legalTargets.includes(k) && k !== fromKind && k !== 'settings',
    );
    if (illegalTargets.length === 0) {
      // 如果所有非自身目標都合法，用自我轉換（非 worldMap, game）
      return fc.constant({
        from: { kind: fromKind } as AppState,
        to: { kind: fromKind } as AppState,
      }).filter(({ from }) => from.kind !== 'worldMap' && from.kind !== 'game');
    }
    return fc.tuple(
      arbSimpleState(fromKind),
      fc.constantFrom(...illegalTargets).chain(arbSimpleState),
    ).map(([from, to]) => ({ from, to }));
  });

// ─── CP-7 Property Tests ───────────────────────────────────

describe('CP-7: 狀態機轉換合法性 (Property-Based)', () => {
  // Property 1: 所有合法轉換成功且回傳正確的 kind
  it('合法轉換表中的所有轉換都成功', () => {
    fc.assert(
      fc.property(arbLegalTransitionPair, ({ from, to }) => {
        // 跳過 pause 的特殊情況：只有 game/endless 可以進入 pause
        if (to.kind === 'pause' && from.kind !== 'game' && from.kind !== 'endless') {
          return true; // 跳過此組合
        }
        const result = transition(from, to);
        // pause 轉換會自動設定 previous，所以 kind 一定是 pause
        if (to.kind === 'pause') {
          expect(result.kind).toBe('pause');
        } else {
          expect(result.kind).toBe(to.kind);
        }
        return true;
      }),
      { numRuns: 500 },
    );
  });

  // Property 2: 非法轉換拋出 IllegalTransitionError
  it('非法轉換拋出 IllegalTransitionError', () => {
    fc.assert(
      fc.property(arbIllegalTransitionPair, ({ from, to }) => {
        expect(() => transition(from, to)).toThrow(IllegalTransitionError);
        return true;
      }),
      { numRuns: 500 },
    );
  });

  // Property 3: pause.previous 不變式
  it('pause.previous 只能是 game 或 endless', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 1, max: 80 }).map((levelId) => ({
            kind: 'game' as const,
            levelId,
          })),
          fc.constant({ kind: 'endless' as const }),
        ),
        (fromState) => {
          const result = transition(
            fromState as AppState,
            { kind: 'pause', previous: fromState as AppState } as AppState,
          );
          expect(result.kind).toBe('pause');
          const pauseResult = result as { kind: 'pause'; previous: AppState };
          expect(['game', 'endless']).toContain(pauseResult.previous.kind);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  // Property 4: settings.returnTo 不變式
  it('settings.returnTo 不能是 settings', () => {
    // 從所有可以進入 settings 的狀態測試
    const settingsSourceKinds: AppStateKind[] = ['menu', 'worldMap', 'game', 'pause'];
    fc.assert(
      fc.property(
        fc.constantFrom(...settingsSourceKinds).chain(arbSimpleState),
        (fromState) => {
          const result = transition(
            fromState,
            { kind: 'settings', returnTo: fromState } as AppState,
          );
          expect(result.kind).toBe('settings');
          const settingsResult = result as { kind: 'settings'; returnTo: AppState };
          expect(settingsResult.returnTo.kind).not.toBe('settings');
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  // Property 5: 自我轉換被拒絕（worldMap, game 除外）
  it('自我轉換被拒絕（worldMap, game 除外）', () => {
    const allowedSelfTransitions = ['worldMap', 'game'];
    const nonAllowedKinds = ALL_STATE_KINDS.filter((k) => !allowedSelfTransitions.includes(k));
    fc.assert(
      fc.property(
        fc.constantFrom(...nonAllowedKinds).chain((kind) =>
          fc.tuple(arbSimpleState(kind), arbSimpleState(kind)),
        ),
        ([from, to]) => {
          expect(() => transition(from, to)).toThrow(IllegalTransitionError);
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });

  // Property 5b: worldMap 自我轉換允許
  it('worldMap → worldMap 自我轉換允許（世界切換）', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 1, max: 4 }),
        ),
        ([worldId1, worldId2]) => {
          const from: AppState = { kind: 'worldMap', worldId: worldId1 };
          const to: AppState = { kind: 'worldMap', worldId: worldId2 };
          const result = transition(from, to);
          expect(result.kind).toBe('worldMap');
          expect((result as { worldId: number }).worldId).toBe(worldId2);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property: 隨機轉換序列中所有成功的轉換都遵循合法表
  it('隨機轉換序列中所有成功的轉換都遵循合法表', () => {
    fc.assert(
      fc.property(
        fc.array(arbAppState, { minLength: 2, maxLength: 20 }),
        (states) => {
          let current = states[0];
          for (let i = 1; i < states.length; i++) {
            const next = states[i];
            try {
              const result = transition(current, next);
              // 如果轉換成功，驗證它確實在合法表中
              if (current.kind === 'settings') {
                // settings 離開：目標必須是 returnTo
                const returnToKind = (current as { returnTo: AppState }).returnTo.kind;
                expect(result.kind).toBe(returnToKind);
              } else if (next.kind === 'settings') {
                // 進入 settings：from 必須在可進入 settings 的列表中
                expect(LEGAL_TRANSITIONS[current.kind]).toContain('settings');
              } else if (current.kind === next.kind) {
                // 自我轉換：只有 worldMap 和 game 允許
                expect(['worldMap', 'game']).toContain(current.kind);
              } else {
                // 一般轉換：必須在合法表中
                expect(LEGAL_TRANSITIONS[current.kind]).toContain(next.kind);
              }
              current = result;
            } catch (e) {
              // 非法轉換：保持在當前狀態
              expect(e).toBeInstanceOf(IllegalTransitionError);
            }
          }
          return true;
        },
      ),
      { numRuns: 300 },
    );
  });
});
