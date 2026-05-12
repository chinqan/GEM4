// ─── 測試模式選擇子選單 ──────────────────────────────────────
// 在主選單上層顯示的 overlay，單選測試場景後確認進入。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton } from '../factory';

// ─── 測試場景清單 ─────────────────────────────────────────────
// 新增測試關卡時，同步在這裡加一筆。

interface TestScenario {
  levelId: number;
  label: string;
  description: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    levelId: -1,
    label: '自由遊玩',
    description: '8×8 隨機盤，無阻擋物，自由測試所有機制',
  },
  {
    levelId: -3,
    label: '果凍阻擋物',
    description: '驗證各層果凍視覺、音效與消除行為',
  },
  {
    levelId: -2,
    label: '炸彈＋生成測試',
    description: '拖右欄 LineH 往下 → 驗證 LineV 是否生成',
  },
  {
    levelId: -4,
    label: '無解重洗測試',
    description: '開局即無解；移動或 5 秒閒置後觸發自動重洗動畫',
  },
];

// ─── 常數 ────────────────────────────────────────────────────

const PANEL_W = 320;
const ITEM_H = 68;
const ITEM_GAP = 8;
const TITLE_H = 52;
const BTN_H = 44;
const PAD = SPACING.lg;
const ITEMS_TOTAL_H = TEST_SCENARIOS.length * ITEM_H + (TEST_SCENARIOS.length - 1) * ITEM_GAP;
const PANEL_H = TITLE_H + ITEMS_TOTAL_H + PAD + BTN_H + PAD;

// ─── 建立子選單 overlay ──────────────────────────────────────

export function createTestModeSelect(options: {
  width: number;
  height: number;
  onConfirm: (levelId: number) => void;
  onCancel: () => void;
}): Container {
  const { width, height, onConfirm, onCancel } = options;

  const overlay = new Container();
  overlay.label = 'test-mode-select';
  overlay.zIndex = 100;

  // 半透明背景遮罩
  const backdrop = new Graphics();
  backdrop.rect(0, 0, width, height);
  backdrop.fill({ color: 0x000000, alpha: 0.65 });
  backdrop.eventMode = 'static';
  backdrop.on('pointertap', onCancel);
  overlay.addChild(backdrop);

  // Panel
  const panelX = Math.round((width - PANEL_W) / 2);
  const panelY = Math.round((height - PANEL_H) / 2);

  const panel = new Graphics();
  panel.roundRect(0, 0, PANEL_W, PANEL_H, RADIUS.lg);
  panel.fill({ color: BG.panel });
  panel.stroke({ color: 0x3a4060, width: 1.5 });
  panel.position.set(panelX, panelY);
  panel.eventMode = 'static';
  panel.on('pointertap', (e) => e.stopPropagation());
  overlay.addChild(panel);

  // 標題
  const titleStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.caption,
    fontWeight: 'bold',
    fill: TEXT_COLOURS.secondary,
    letterSpacing: 1,
  });
  const titleText = new Text({ text: '選擇測試場景', style: titleStyle });
  titleText.anchor.set(0.5, 0.5);
  titleText.position.set(PANEL_W / 2, TITLE_H / 2);
  panel.addChild(titleText);

  // ── 選項列表 ─────────────────────────────────────────────

  let selectedId = TEST_SCENARIOS[0].levelId;
  const itemBgs: Graphics[] = [];
  const radioDots: Graphics[] = [];

  function redraw() {
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const selected = TEST_SCENARIOS[i].levelId === selectedId;

      itemBgs[i].clear();
      itemBgs[i].roundRect(0, 0, PANEL_W - PAD * 2, ITEM_H, RADIUS.xs);
      itemBgs[i].fill({ color: selected ? 0x252d52 : 0x14193a });
      itemBgs[i].stroke({ color: selected ? 0x6c8aff : 0x2e3455, width: selected ? 2 : 1 });

      radioDots[i].clear();
      radioDots[i].circle(0, 0, 8);
      radioDots[i].stroke({ color: selected ? 0x6c8aff : 0x555e80, width: 2 });
      if (selected) {
        radioDots[i].circle(0, 0, 4);
        radioDots[i].fill({ color: 0x6c8aff });
      }
    }
  }

  const labelStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.primary,
  });
  const descStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: 12,
    fill: TEXT_COLOURS.muted,
    wordWrap: true,
    wordWrapWidth: PANEL_W - PAD * 2 - 40 - 8,
  });

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const s = TEST_SCENARIOS[i];
    const itemY = TITLE_H + i * (ITEM_H + ITEM_GAP);

    const item = new Container();
    item.position.set(PAD, itemY);
    item.eventMode = 'static';
    item.cursor = 'pointer';
    panel.addChild(item);

    const itemBg = new Graphics();
    item.addChild(itemBg);
    itemBgs.push(itemBg);

    const dot = new Graphics();
    dot.position.set(18, ITEM_H / 2);
    item.addChild(dot);
    radioDots.push(dot);

    const labelTxt = new Text({ text: s.label, style: labelStyle });
    labelTxt.position.set(40, 12);
    item.addChild(labelTxt);

    const descTxt = new Text({ text: s.description, style: descStyle });
    descTxt.position.set(40, 36);
    item.addChild(descTxt);

    item.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= PANEL_W - PAD * 2 && y >= 0 && y <= ITEM_H };
    item.on('pointertap', () => {
      selectedId = s.levelId;
      redraw();
    });
  }

  redraw();

  // ── 底部按鈕 ─────────────────────────────────────────────

  const btnY = TITLE_H + ITEMS_TOTAL_H + PAD;
  const btnW = Math.floor((PANEL_W - PAD * 2 - SPACING.base) / 2);

  const cancelBtn = createButton({
    text: '取消',
    variant: 'ghost',
    size: 'md',
    width: btnW,
    onClick: onCancel,
  });
  cancelBtn.position.set(PAD, btnY);
  panel.addChild(cancelBtn);

  const confirmBtn = createButton({
    text: '確認',
    variant: 'primary',
    size: 'md',
    width: btnW,
    onClick: () => onConfirm(selectedId),
  });
  confirmBtn.position.set(PAD + btnW + SPACING.base, btnY);
  panel.addChild(confirmBtn);

  return overlay;
}
