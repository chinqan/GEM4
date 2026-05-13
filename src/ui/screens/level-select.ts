// ─── 31.4 關卡選擇卡片 ──────────────────────────────────────
// 目標、預算、最佳紀錄。Modal overlay on world map.
// 明亮清新自然風格。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { type UIButton, type UIStarDisplay } from '../factory';

// ─── 關卡說明色彩 Token ────────────────────────────────────

const LS = {
  overlayBg: 0x2e3a28,   // 半透明遮罩（深綠黑）
  overlayAlpha: 0.7,
  surface: 0xfcfdf9,     // 卡片白底
  bg: 0xeef4e8,          // stat row 背景
  border: 0xc8dcc0,      // 邊框灰綠
  fg: 0x2e3a28,          // 深色文字
  muted: 0x6b7a63,       // 灰綠文字
  accent: 0x4caf50,      // 綠色強調
  accentDark: 0x357a38,  // 按鈕陰影
  yellow: 0xd4a017,      // 星星黃
  starEmpty: 0xc0c8bc,   // 空星灰
} as const;

// ─── 型別 ──────────────────────────────────────────────────

export interface LevelSelectCard extends Container {
  playButton: UIButton;
  cancelButton: UIButton;
  starDisplay: UIStarDisplay;
  /** 更新卡片資料 */
  setLevelData(data: LevelSelectData): void;
}

export interface LevelSelectData {
  worldId: number;
  levelId: number;
  levelName?: string;
  worldName?: string;
  objectiveText: string;
  moveBudget?: number;
  timeBudget?: number;
  bestStars: 0 | 1 | 2 | 3;
  bestScore: number;
  attempts: number;
}

export interface CreateLevelSelectOptions {
  width: number;
  height: number;
  data?: LevelSelectData;
  onPlay?: () => void;
  onCancel?: () => void;
}

// ─── 卡片按鈕工廠 ──────────────────────────────────────────

interface CardButtonOptions {
  text: string;
  width: number;
  height: number;
  variant: 'cancel' | 'play';
  onClick?: () => void;
}

function createCardButton(options: CardButtonOptions): UIButton {
  const { text, width: btnW, height: btnH, variant, onClick } = options;

  const container = new Container() as UIButton;
  container.label = `card-btn-${text}`;
  container.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= btnW && y >= 0 && y <= btnH + 4 };

  const radius = 28;
  const bg = new Graphics();

  if (variant === 'play') {
    bg.roundRect(0, 4, btnW, btnH, radius);
    bg.fill({ color: LS.accentDark });
    bg.roundRect(0, 0, btnW, btnH, radius);
    bg.fill({ color: LS.accent });
  } else {
    bg.roundRect(0, 0, btnW, btnH, radius);
    bg.fill({ color: LS.bg });
    bg.stroke({ color: LS.border, width: 2 });
  }
  container.addChild(bg);
  container.bg = bg;

  const textColour = variant === 'play' ? 0xffffff : LS.muted;
  const fontFamily = variant === 'play'
    ? 'Fredoka, Nunito, system-ui, sans-serif'
    : 'Nunito, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  const fontSize = variant === 'play' ? 18 : 16;

  const style = new TextStyle({
    fontFamily,
    fontSize,
    fontWeight: '700',
    fill: textColour,
    align: 'center',
    letterSpacing: variant === 'play' ? 0.8 : 0,
  });
  const label = new Text({ text, style });
  label.anchor.set(0.5, 0.5);
  label.position.set(btnW / 2, btnH / 2);
  container.addChild(label);

  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerdown', () => { if (enabled) container.scale.set(0.94); });
  container.on('pointerup', () => {
    if (!enabled) return;
    container.scale.set(1);
    onClick?.();
  });
  container.on('pointerupoutside', () => { if (enabled) container.scale.set(1); });

  container.setEnabled = (e: boolean) => {
    enabled = e;
    container.eventMode = e ? 'static' : 'none';
    container.cursor = e ? 'pointer' : 'default';
    container.alpha = e ? 1 : 0.5;
  };

  return container;
}

// ─── 星星顯示（簡易版，符合 UIStarDisplay 接口） ────────────

function createCardStarDisplay(initialStars: 0 | 1 | 2 | 3): UIStarDisplay {
  const container = new Container() as UIStarDisplay;
  container.label = 'card-star-display';

  const stars: Text[] = [];
  const starSize = 28;
  const starGap = 6;

  for (let i = 0; i < 3; i++) {
    const star = new Text({
      text: '★',
      style: new TextStyle({ fontSize: starSize, fill: LS.starEmpty }),
    });
    star.anchor.set(0.5, 0.5);
    star.position.set(i * (starSize + starGap), 0);
    container.addChild(star);
    stars.push(star);
  }

  function update(count: 0 | 1 | 2 | 3): void {
    for (let i = 0; i < 3; i++) {
      (stars[i].style as TextStyle).fill = i < count ? LS.yellow : LS.starEmpty;
    }
  }

  update(initialStars);
  container.setStars = update;

  return container;
}

/**
 * 建立關卡選擇卡片（modal overlay）。
 *
 * 結構：
 * - 半透明深色遮罩
 * - 白色圓角卡片
 *   - 世界名稱（大標題）
 *   - 關卡 XX（副標題）
 *   - 目標文字（綠色）
 *   - 統計列（手數、過往最佳、嘗試次數）
 *   - 星星評價
 *   - 取消 / PLAY 按鈕
 */
export function createLevelSelectCard(options: CreateLevelSelectOptions): LevelSelectCard {
  const {
    width,
    height,
    data,
    onPlay,
    onCancel,
  } = options;

  const container = new Container() as LevelSelectCard;
  container.label = 'level-select-card';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: LS.overlayBg, alpha: LS.overlayAlpha });
  overlay.eventMode = 'static';
  overlay.on('pointerup', () => { onCancel?.(); });
  container.addChild(overlay);

  // ── 卡片面板 ─────────────────────────────────────────
  const cardW = Math.min(340, width - 48);
  const cardH = 420;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;
  const cardPadX = 28;
  const cardPadTop = 32;

  const card = new Graphics();
  card.roundRect(cardX, cardY, cardW, cardH, 28);
  card.fill({ color: LS.surface });
  card.eventMode = 'static'; // 阻止穿透
  container.addChild(card);

  // ── 標題區 ────────────────────────────────────────────
  const titleStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: 28,
    fontWeight: '700',
    fill: LS.fg,
    align: 'center',
    letterSpacing: -0.3,
  });
  const titleText = new Text({ text: '', style: titleStyle });
  titleText.anchor.set(0.5, 0);
  titleText.position.set(width / 2, cardY + cardPadTop);
  container.addChild(titleText);

  const subTitleStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: 16,
    fontWeight: '700',
    fill: LS.muted,
    align: 'center',
  });
  const subTitleText = new Text({ text: '', style: subTitleStyle });
  subTitleText.anchor.set(0.5, 0);
  subTitleText.position.set(width / 2, cardY + cardPadTop + 34);
  container.addChild(subTitleText);

  const goalStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: 15,
    fontWeight: '600',
    fill: LS.accent,
    align: 'center',
    wordWrap: true,
    wordWrapWidth: cardW - cardPadX * 2,
  });
  const goalText = new Text({ text: '', style: goalStyle });
  goalText.anchor.set(0.5, 0);
  goalText.position.set(width / 2, cardY + cardPadTop + 58);
  container.addChild(goalText);

  // ── 統計列 ────────────────────────────────────────────
  const statsTop = cardY + cardPadTop + 92;
  const statRowH = 40;
  const statRowGap = 12;
  const statRowW = cardW - cardPadX * 2;
  const statRowX = cardX + cardPadX;

  function drawStatRow(y: number): Graphics {
    const row = new Graphics();
    row.roundRect(statRowX, y, statRowW, statRowH, 12);
    row.fill({ color: LS.bg });
    container.addChild(row);
    return row;
  }

  const statLabelStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: '600',
    fill: LS.muted,
  });
  const statValueStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: '700',
    fill: LS.fg,
  });

  // Row 1: 手數
  drawStatRow(statsTop);
  const budgetLabel = new Text({ text: '手數', style: statLabelStyle });
  budgetLabel.anchor.set(0, 0.5);
  budgetLabel.position.set(statRowX + 16, statsTop + statRowH / 2);
  container.addChild(budgetLabel);

  const budgetValue = new Text({ text: '-', style: statValueStyle });
  budgetValue.anchor.set(1, 0.5);
  budgetValue.position.set(statRowX + statRowW - 16, statsTop + statRowH / 2);
  container.addChild(budgetValue);

  // Row 2: 過往最佳
  const row2Y = statsTop + statRowH + statRowGap;
  drawStatRow(row2Y);
  const bestLabel = new Text({ text: '過往最佳', style: statLabelStyle });
  bestLabel.anchor.set(0, 0.5);
  bestLabel.position.set(statRowX + 16, row2Y + statRowH / 2);
  container.addChild(bestLabel);

  const bestValue = new Text({ text: '-', style: statValueStyle });
  bestValue.anchor.set(1, 0.5);
  bestValue.position.set(statRowX + statRowW - 16, row2Y + statRowH / 2);
  container.addChild(bestValue);

  // Row 3: 嘗試次數
  const row3Y = row2Y + statRowH + statRowGap;
  drawStatRow(row3Y);
  const attemptsLabel = new Text({ text: '嘗試次數', style: statLabelStyle });
  attemptsLabel.anchor.set(0, 0.5);
  attemptsLabel.position.set(statRowX + 16, row3Y + statRowH / 2);
  container.addChild(attemptsLabel);

  const attemptsValue = new Text({ text: '-', style: statValueStyle });
  attemptsValue.anchor.set(1, 0.5);
  attemptsValue.position.set(statRowX + statRowW - 16, row3Y + statRowH / 2);
  container.addChild(attemptsValue);

  // ── 星星 ──────────────────────────────────────────────
  const starsY = row3Y + statRowH + 20;
  const starDisplay = createCardStarDisplay(0);
  const totalStarW = 28 * 3 + 6 * 2;
  starDisplay.position.set(width / 2 - totalStarW / 2 + 14, starsY);
  container.addChild(starDisplay);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = starsY + 44;
  const btnGap = 12;
  const btnAreaW = statRowW;
  const cancelBtnW = Math.floor(btnAreaW * 0.42);
  const playBtnW = btnAreaW - cancelBtnW - btnGap;
  const btnH = 50;

  const cancelButton = createCardButton({
    text: '取消',
    width: cancelBtnW,
    height: btnH,
    variant: 'cancel',
    onClick: onCancel,
  });
  cancelButton.position.set(statRowX, btnY);
  container.addChild(cancelButton);

  const playButton = createCardButton({
    text: 'PLAY',
    width: playBtnW,
    height: btnH,
    variant: 'play',
    onClick: onPlay,
  });
  playButton.position.set(statRowX + cancelBtnW + btnGap, btnY);
  container.addChild(playButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.playButton = playButton;
  container.cancelButton = cancelButton;
  container.starDisplay = starDisplay;

  // ── 世界名稱對照 ──────────────────────────────────────
  const worldNames: Record<number, string> = {
    1: 'Crystal Cavern',
    2: 'Ocean Depths',
    3: 'Mystic Garden',
    4: 'Solar Temple',
  };

  // ── 更新方法 ──────────────────────────────────────────
  container.setLevelData = (d: LevelSelectData) => {
    titleText.text = d.worldName ?? worldNames[d.worldId] ?? `World ${d.worldId}`;
    subTitleText.text = `關卡 ${String(d.levelId).padStart(2, '0')}`;
    goalText.text = `目標：${d.objectiveText}`;

    if (d.moveBudget != null) {
      budgetLabel.text = '手數';
      budgetValue.text = `${d.moveBudget}`;
    } else if (d.timeBudget != null) {
      budgetLabel.text = '時間';
      budgetValue.text = `${d.timeBudget}s`;
    } else {
      budgetLabel.text = '手數';
      budgetValue.text = '∞';
    }

    if (d.attempts === 0) {
      bestValue.text = '尚未挑戰';
    } else if (d.bestScore === 0) {
      bestValue.text = '0';
    } else {
      bestValue.text = d.bestScore.toLocaleString();
    }

    attemptsValue.text = `${d.attempts}`;
    starDisplay.setStars(d.bestStars);
  };

  // 初始資料
  if (data) {
    container.setLevelData(data);
  }

  return container;
}
