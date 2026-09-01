import { describe, it, expect } from 'vitest';
import '../levels/index';
import { getAllLevelIds, loadLevel } from '../level-spec';
import { parseSpecialRules, isInCore } from '../special-rules';
import type { LevelSpec } from '../level-spec';
import type { BlockerKind } from '../../../types';

// ─── 關卡資料完整性 ─────────────────────────────────────────
// 驗證 80 關（不含測試關卡）的資料自洽性：blocker 佈局、specialRules、
// 目標可達成性。此檔守護「資料層」的關卡設計錯誤（如 blocker 誤放在
// immovableCore 內導致目標無法達成）。

const REAL_LEVEL_IDS = getAllLevelIds().filter((id) => id >= 1 && id <= 80);

function effectiveBlockers(
  spec: LevelSpec,
): Map<string, { kind: BlockerKind; layers: number; spawnKind?: BlockerKind }> {
  // 依 placeBLockers 的語意：同格後宣告者覆蓋前者
  const map = new Map<string, { kind: BlockerKind; layers: number; spawnKind?: BlockerKind }>();
  for (const bp of spec.blockers ?? []) {
    map.set(`${bp.at[0]},${bp.at[1]}`, {
      kind: bp.type,
      layers: bp.layers ?? 1,
      spawnKind: bp.generatorSpec?.spawnKind,
    });
  }
  return map;
}

describe('關卡資料完整性（L1–L80）', () => {
  it('共 80 個正式關卡', () => {
    expect(REAL_LEVEL_IDS.length).toBe(80);
  });

  it('specialRules 宣告皆可被解析為已登記規則', () => {
    for (const id of REAL_LEVEL_IDS) {
      const spec = loadLevel(id)!;
      if (!spec.specialRules) continue;
      const parsed = parseSpecialRules(spec.specialRules);
      // 每條宣告都應對應至少一個解析結果欄位（無被忽略者）
      const parsedCount =
        (parsed.immovableCore ? 1 : 0) +
        (parsed.coreColourShiftEveryN ? 1 : 0) +
        (parsed.splitBoard ? 1 : 0) +
        (parsed.comboRequired ? 1 : 0);
      expect(parsedCount, `L${id} specialRules 有未登記規則: ${spec.specialRules.join(', ')}`).toBe(
        spec.specialRules.length,
      );
    }
  });

  it('blocker 佈局無同格衝突（每格單一 blocker）', () => {
    for (const id of REAL_LEVEL_IDS) {
      const spec = loadLevel(id)!;
      const seen = new Set<string>();
      for (const bp of spec.blockers ?? []) {
        const key = `${bp.at[0]},${bp.at[1]}`;
        expect(seen.has(key), `L${id} 在 (${key}) 宣告了多個 blocker（後者會覆蓋前者）`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('immovableCore 區域內不得有 blocker / delivery / 永久空格', () => {
    for (const id of REAL_LEVEL_IDS) {
      const spec = loadLevel(id)!;
      const core = parseSpecialRules(spec.specialRules).immovableCore;
      if (!core) continue;

      for (const bp of spec.blockers ?? []) {
        expect(
          isInCore(core, bp.at),
          `L${id} blocker(${bp.type}) 位於 immovableCore 內 (${bp.at})，永遠無法清除`,
        ).toBe(false);
      }
      for (const pos of spec.board.deliveryCells ?? []) {
        expect(isInCore(core, pos), `L${id} deliveryCell 位於 core 內 (${pos})`).toBe(false);
      }
      for (const pos of spec.board.deliveryItems ?? []) {
        expect(isInCore(core, pos), `L${id} deliveryItem 位於 core 內 (${pos})`).toBe(false);
      }
      for (const pos of spec.board.empty) {
        expect(isInCore(core, pos), `L${id} 永久空格位於 core 內 (${pos})`).toBe(false);
      }
    }
  });

  it('clear 目標的數量可由有效 blocker 佈局達成', () => {
    for (const id of REAL_LEVEL_IDS) {
      const spec = loadLevel(id)!;
      const objectives = spec.objective.type === 'multi' ? spec.objective.objectives : [spec.objective];

      for (const obj of objectives) {
        if (obj.type !== 'clear') continue;
        const effective = effectiveBlockers(spec);

        for (const target of obj.target) {
          // jelly 以層數計（每次 hit 扣 1 層）；其他 blocker 以個數計。
          // 若場上有 generator 會生成該類 blocker，數量可隨遊戲增加 → 視為可達成。
          const hasMatchingGenerator = [...effective.values()].some(
            (info) => info.kind === 'generator' && info.spawnKind === target.blocker,
          );
          if (hasMatchingGenerator) continue;

          let available = 0;
          for (const info of effective.values()) {
            if (info.kind !== target.blocker) continue;
            available += target.blocker === 'jelly' ? info.layers : 1;
          }
          expect(
            available,
            `L${id} clear ${target.blocker}×${target.count} 不可達成（初始佈局僅 ${available}）`,
          ).toBeGreaterThanOrEqual(target.count);
        }
      }
    }
  });

  it('splitBoard 關卡有貫穿整列的永久空格分隔（兩半場不互通）', () => {
    for (const id of REAL_LEVEL_IDS) {
      const spec = loadLevel(id)!;
      if (!parseSpecialRules(spec.specialRules).splitBoard) continue;

      // 找出至少一個整列皆為 empty 的分隔欄
      const emptySet = new Set(spec.board.empty.map(([c, r]) => `${c},${r}`));
      let hasDivider = false;
      for (let col = 1; col < spec.board.width - 1; col++) {
        let fullColumn = true;
        for (let row = 0; row < spec.board.height; row++) {
          if (!emptySet.has(`${col},${row}`)) {
            fullColumn = false;
            break;
          }
        }
        if (fullColumn) {
          hasDivider = true;
          break;
        }
      }
      expect(hasDivider, `L${id} 宣告 splitBoard 但沒有貫穿整列的空格分隔欄`).toBe(true);
    }
  });
});
