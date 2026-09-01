import { describe, it, expect } from 'vitest';
import { parseSpecialRules, isInCore, coreCells } from '../special-rules';

describe('parseSpecialRules', () => {
  it('解析 immovableCore(x, y, w, h)', () => {
    const rules = parseSpecialRules(['immovableCore(3, 3, 3, 3)']);
    expect(rules.immovableCore).toEqual({ x: 3, y: 3, w: 3, h: 3 });
  });

  it('解析 coreColourShift(N)', () => {
    const rules = parseSpecialRules(['coreColourShift(5)']);
    expect(rules.coreColourShiftEveryN).toBe(5);
  });

  it('解析裸名規則 splitBoard / combo-required', () => {
    const rules = parseSpecialRules(['splitBoard', 'combo-required']);
    expect(rules.splitBoard).toBe(true);
    expect(rules.comboRequired).toBe(true);
  });

  it('L20/L80 實際宣告可完整解析', () => {
    const rules = parseSpecialRules(['immovableCore(3, 3, 3, 3)', 'coreColourShift(5)']);
    expect(rules.immovableCore).toEqual({ x: 3, y: 3, w: 3, h: 3 });
    expect(rules.coreColourShiftEveryN).toBe(5);
  });

  it('未知或格式錯誤的規則被忽略', () => {
    const rules = parseSpecialRules([
      'unknownRule(1)',
      'immovableCore(-1, 0, 3, 3)',
      'immovableCore(0, 0, 0, 3)',
      'coreColourShift(0)',
      'coreColourShift(abc)',
      '!!!',
    ]);
    expect(rules).toEqual({});
  });

  it('undefined 輸入回傳空規則', () => {
    expect(parseSpecialRules(undefined)).toEqual({});
  });
});

describe('isInCore / coreCells', () => {
  const core = { x: 3, y: 3, w: 3, h: 3 };

  it('核心內外判斷正確', () => {
    expect(isInCore(core, [3, 3])).toBe(true);
    expect(isInCore(core, [5, 5])).toBe(true);
    expect(isInCore(core, [4, 4])).toBe(true);
    expect(isInCore(core, [2, 3])).toBe(false);
    expect(isInCore(core, [6, 5])).toBe(false);
    expect(isInCore(core, [4, 6])).toBe(false);
  });

  it('coreCells 列舉 w×h 個座標且皆在核心內', () => {
    const cells = coreCells(core);
    expect(cells.length).toBe(9);
    for (const pos of cells) {
      expect(isInCore(core, pos)).toBe(true);
    }
  });
});
