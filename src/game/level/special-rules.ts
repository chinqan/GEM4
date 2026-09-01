import type { CellPos } from '../../types';

// ─── Boss 特殊規則（GDD 02§2.3.1）───────────────────────────
//
// 解析 LevelSpec.specialRules 的規則字串（canonical schema）：
//   immovableCore(x, y, w, h)   指定矩形區域的寶石不可消、不可換
//   coreColourShift(N)          上述區域每 N 手變色（依賴 immovableCore）
//   splitBoard                  盤面切分為兩個互不相通的半場（關卡資料以
//                               中央 isEmpty 整列編碼；此旗標僅供呈現層參考）
//   combo-required              調校性描述（分數需靠 Special×Special 達標），
//                               僅用於關卡開始提示，不做硬性限制

/** immovableCore 的矩形區域（cols x..x+w-1 × rows y..y+h-1） */
export interface CoreRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParsedSpecialRules {
  immovableCore?: CoreRect;
  /** 每 N 手核心變色；僅在 immovableCore 存在時有效 */
  coreColourShiftEveryN?: number;
  splitBoard?: boolean;
  comboRequired?: boolean;
}

/** 規則字串文法：`name(arg, arg, …)` 或裸名 `name` */
const RULE_PATTERN = /^([a-zA-Z-]+)\s*(?:\(([^)]*)\))?$/;

/**
 * 解析 specialRules 字串陣列。未知或格式錯誤的規則在 dev 模式警告後忽略
 * （GDD：v1 不接受未登記的自由文字規則）。
 */
export function parseSpecialRules(rules?: string[]): ParsedSpecialRules {
  const parsed: ParsedSpecialRules = {};
  if (!rules) return parsed;

  for (const raw of rules) {
    const m = RULE_PATTERN.exec(raw.trim());
    if (!m) {
      warnUnknownRule(raw);
      continue;
    }
    const name = m[1];
    const args = m[2] ? m[2].split(',').map((s) => Number(s.trim())) : [];

    switch (name) {
      case 'immovableCore': {
        const [x, y, w, h] = args;
        if ([x, y, w, h].some((n) => !Number.isInteger(n) || n < 0) || w! <= 0 || h! <= 0) {
          warnUnknownRule(raw);
          break;
        }
        parsed.immovableCore = { x: x!, y: y!, w: w!, h: h! };
        break;
      }
      case 'coreColourShift': {
        const [n] = args;
        if (!Number.isInteger(n) || n! <= 0) {
          warnUnknownRule(raw);
          break;
        }
        parsed.coreColourShiftEveryN = n!;
        break;
      }
      case 'splitBoard':
        parsed.splitBoard = true;
        break;
      case 'combo-required':
        parsed.comboRequired = true;
        break;
      default:
        warnUnknownRule(raw);
    }
  }

  return parsed;
}

/** pos 是否位於核心矩形內 */
export function isInCore(core: CoreRect, pos: CellPos): boolean {
  const [col, row] = pos;
  return col >= core.x && col < core.x + core.w && row >= core.y && row < core.y + core.h;
}

/** 列舉核心矩形內所有座標 */
export function coreCells(core: CoreRect): CellPos[] {
  const cells: CellPos[] = [];
  for (let c = core.x; c < core.x + core.w; c++) {
    for (let r = core.y; r < core.y + core.h; r++) {
      cells.push([c, r]);
    }
  }
  return cells;
}

function warnUnknownRule(raw: string): void {
  if (typeof console !== 'undefined') {
    console.warn(`[special-rules] 忽略未登記或格式錯誤的規則: "${raw}"`);
  }
}
