// ─── 31.5 遊戲 HUD ─────────────────────────────────────────
// 分數、手數/時間、目標進度、暫停按鈕。
// 自適應佈局：手機（寬度 < 600px）使用緊湊排版。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS, WORLD_ACCENTS } from '../theme';
import {
  createButton,
  createStarDisplay,
  createObjectiveChip,
  objectiveToDisplayInfo,
  type UIButton,
  type UIStarDisplay,
  type UIObjectiveChip,
} from '../factory';
import { MOBILE_BREAKPOINT } from '../../rendering/viewport';

// ─── 型別 ──────────────────────────────────────────────────

/** 單一目標的進度 */
export interface ObjectiveProgress {
  current: number;
  total: number;
}

export interface GameHUD extends Container {
  pauseButton: UIButton;
  resetButton: UIButton;
  settingsButton: UIButton;
  starDisplay: UIStarDisplay;
  objectiveChip: UIObjectiveChip;
  /** 更新分數顯示 */
  setScore(score: number): void;
  /** 更新手數 */
  setMoves(remaining: number): void;
  /** 更新時間（秒） */
  setTime(remainingSeconds: number): void;
  /**
   * 更新目標進度。
   * - 單一目標：傳入 current, total
   * - 多重目標：傳入 ObjectiveProgress[] 陣列，每個元素對應一個子目標
   */
  setObjective(current: number | ObjectiveProgress[], total?: number): void;
  /** 更新星數 */
  setStars(count: 0 | 1 | 2 | 3): void;
  /** 顯示連鎖計數 */
  showChain(chain: number): void;
  /** 隱藏連鎖計數 */
  hideChain(): void;
}

export interface CreateGameHUDOptions {
  width: number;
  height: number;
  mode?: 'moves' | 'time';
  /** 目標資訊，用於決定 chip 的 icon 與描述格式 */
  objective?: { type: string; target?: unknown; objectives?: Array<{ type: string; target?: unknown }> };
  /** 世界 ID（用於顯示世界名稱） */
  worldId?: number;
  /** 關卡 ID（用於顯示第幾關） */
  levelId?: number;
  /** 關卡名稱 */
  levelName?: string;
  onPause?: () => void;
  onSettings?: () => void;
  onReset?: () => void;
}

/**
 * 建立遊戲 HUD。
 *
 * 佈局（自適應）：
 * - 桌面（≥600px）：
 *   - 左上：暫停按鈕
 *   - 中上：分數計數器
 *   - 右上：設定齒輪 + 星星
 *   - 左中：目標 chip（多重目標時垂直排列多個 chip）
 *   - 右中：手數/時間 chip
 * - 手機（<600px）：
 *   - 頂部列：暫停 | 分數 | 設定
 *   - 第二列：目標 chip | 手數/時間 chip
 *   - 所有元素尺寸縮小
 */
export function createGameHUD(options: CreateGameHUDOptions): GameHUD {
  const {
    width,
    height: _height,
    mode = 'moves',
    objective,
    worldId,
    levelId,
    levelName,
    onPause,
    onSettings,
    onReset,
  } = options;

  const container = new Container() as GameHUD;
  container.label = 'game-hud';

  // ── 自適應參數 ────────────────────────────────────────────
  const isMobile = width < MOBILE_BREAKPOINT;
  const scaleFactor = isMobile ? Math.max(0.65, width / MOBILE_BREAKPOINT) : 1;
  const accentColor = WORLD_ACCENTS[worldId ?? 1]?.accent ?? 0xf6c453;

  const margin = Math.round(SPACING.md * scaleFactor);
  const btnSize = isMobile ? Math.round(36 * scaleFactor) : 40;
  const btnFontSize = isMobile ? Math.round(18 * scaleFactor) : 20;

  // ── 面板尺寸：兩列 ───────────────────────────────────────
  const row1H = isMobile ? Math.round(60 * scaleFactor) : 60;  // 按鈕+分數列
  const row2H = isMobile ? Math.round(60 * scaleFactor) : 60;  // 目標+手數列
  const panelH = row1H + row2H;

  // ── 深色半透明頭部面板 ───────────────────────────────────
  const headerPanel = new Graphics();
  headerPanel.rect(0, 0, width, panelH);
  headerPanel.fill({ color: 0x0a1628, alpha: 0.88 });
  headerPanel.rect(0, panelH - 2, width, 2);
  headerPanel.fill({ color: accentColor, alpha: 0.65 });
  container.addChild(headerPanel);

  // Row 1 垂直中心
  const r1cy = row1H / 2;
  // Row 2 垂直中心
  const r2cy = row1H + row2H / 2;

  // ── 暫停按鈕（左，Row 1） ────────────────────────────────
  const pauseButton = createButton({
    text: '⏸',
    variant: 'ghost',
    size: isMobile ? 'sm' : 'md',
    width: btnSize,
    fontSize: btnFontSize,
    onClick: onPause,
  });
  pauseButton.position.set(margin, r1cy - btnSize / 2);
  container.addChild(pauseButton);

  // ── 關卡資訊（暫停按鈕右側，Row 1） ─────────────────────
  const hudShadow = { alpha: 0.85, angle: Math.PI / 4, blur: 2, color: 0x000000, distance: 1 };
  const levelInfoX = margin + btnSize + SPACING.sm;

  if (worldId || levelId) {
    const worldLabel = worldId ? `世界 ${worldId}` : '';
    const levelLabel = levelId ? `第 ${levelId} 關` : '';
    const headerLine = [worldLabel, levelLabel].filter(Boolean).join(' · ');
    const headerFontSize = isMobile ? Math.round(11 * scaleFactor) : 12;
    const nameFontSize = isMobile ? Math.round(13 * scaleFactor) : 14;

    const levelHeaderText = new Text({ text: headerLine, style: new TextStyle({
      fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
      fontSize: headerFontSize,
      fill: TEXT_COLOURS.secondary,
      dropShadow: hudShadow,
    }) });
    levelHeaderText.anchor.set(0, 1);
    levelHeaderText.position.set(levelInfoX, r1cy - 1);
    container.addChild(levelHeaderText);

    if (levelName) {
      const levelNameText = new Text({ text: levelName, style: new TextStyle({
        fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
        fontSize: nameFontSize,
        fill: TEXT_COLOURS.primary,
        fontWeight: '600',
        dropShadow: hudShadow,
      }) });
      levelNameText.anchor.set(0, 0);
      levelNameText.position.set(levelInfoX, r1cy + 1);
      container.addChild(levelNameText);
    }
  }

  // ── SCORE（中央，Row 1） ──────────────────────────────────
  const scoreFontSize = isMobile ? Math.round(FONT_SIZES.hudScore * 0.62 * scaleFactor) : Math.round(FONT_SIZES.hudScore * 0.65);
  const scoreLabelFontSize = isMobile ? Math.round(10 * scaleFactor) : 11;

  const scoreLabel = new Text({ text: 'SCORE', style: new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: scoreLabelFontSize,
    fill: accentColor,
    align: 'center',
    dropShadow: hudShadow,
    letterSpacing: 2,
  }) });
  scoreLabel.anchor.set(0.5, 1);
  scoreLabel.position.set(width / 2, r1cy - 1);
  container.addChild(scoreLabel);

  const scoreStyle = new TextStyle({
    fontFamily: 'JetBrains Mono, "Noto Sans CJK TC", monospace',
    fontSize: scoreFontSize,
    fill: accentColor,
    align: 'center',
    dropShadow: hudShadow,
    fontWeight: '700',
  });
  const scoreText = new Text({ text: '0', style: scoreStyle });
  scoreText.anchor.set(0.5, 0);
  scoreText.position.set(width / 2, r1cy + 1);
  container.addChild(scoreText);

  // ── 右側按鈕群（Row 1） ───────────────────────────────────
  const btnGap = isMobile ? 4 : 6;
  const settingsButton = createButton({
    text: '⚙',
    variant: 'ghost',
    size: isMobile ? 'sm' : 'md',
    width: btnSize,
    fontSize: btnFontSize,
    onClick: onSettings,
  });
  settingsButton.position.set(width - btnSize - margin, r1cy - btnSize / 2);
  container.addChild(settingsButton);

  const resetButton = createButton({
    text: '↺',
    variant: 'ghost',
    size: isMobile ? 'sm' : 'md',
    width: btnSize,
    fontSize: btnFontSize,
    onClick: onReset,
  });
  resetButton.position.set(width - btnSize * 2 - margin - btnGap, r1cy - btnSize / 2);
  container.addChild(resetButton);

  // ── 星星（重置按鈕左側，Row 1） ──────────────────────────
  const starSize = isMobile ? Math.round(10 * scaleFactor) : 13;
  const starGap = 4;
  const starDisplay = createStarDisplay({ starSize, gap: starGap, initialStars: 0 });
  const starsTotalW = starSize * 3 + starGap * 2;
  starDisplay.position.set(
    width - btnSize * 2 - margin - btnGap - starsTotalW - SPACING.sm,
    r1cy - starSize / 2,
  );
  container.addChild(starDisplay);

  // ── Row 2 分隔線 ─────────────────────────────────────────
  const divider = new Graphics();
  divider.rect(margin, row1H, width - margin * 2, 1);
  divider.fill({ color: 0xffffff, alpha: 0.08 });
  container.addChild(divider);

  // ── 目標 chip（Row 2 左側） ───────────────────────────────
  const subObjectives: Array<{ type: string; target?: unknown }> =
    objective?.type === 'multi' && objective.objectives
      ? objective.objectives
      : objective
        ? [objective]
        : [{ type: 'score' }];

  const objectiveChips: UIObjectiveChip[] = [];
  const chipGap = SPACING.xs;
  let chipX = margin;
  for (const subObj of subObjectives) {
    const info = objectiveToDisplayInfo(subObj);
    const chip = createObjectiveChip({ displayInfo: info, current: 0, total: 1 });
    if (isMobile) chip.scale.set(scaleFactor);
    // 垂直置中於 Row 2
    const chipVisualH = (info.label ? 44 : 34) * (isMobile ? scaleFactor : 1);
    chip.position.set(chipX, r2cy - chipVisualH / 2);
    container.addChild(chip);
    objectiveChips.push(chip);
    // 估算 chip 寬度（更新後由 Graphics 決定，這裡用估算值推進 x）
    chipX += 180 * (isMobile ? scaleFactor : 1) + chipGap;
  }
  const objectiveChip = objectiveChips[0];

  // ── 手數/時間 chip（Row 2 右側） ─────────────────────────
  const statFontSize = isMobile ? Math.round(FONT_SIZES.hudStat * 0.85 * scaleFactor) : Math.round(FONT_SIZES.hudStat * 0.88);
  const budgetLabelSize = isMobile ? Math.round(9 * scaleFactor) : 10;
  const budgetChipW = isMobile ? Math.round(60 * scaleFactor) : 68;
  const budgetChipH = row2H - 6;

  const budgetBg = new Graphics();
  budgetBg.roundRect(0, 0, budgetChipW, budgetChipH, RADIUS.sm);
  budgetBg.fill({ color: 0x1a2e4a, alpha: 0.9 });
  budgetBg.roundRect(0, 0, budgetChipW, budgetChipH, RADIUS.sm);
  budgetBg.stroke({ color: accentColor, width: 1.5, alpha: 0.5 });
  budgetBg.position.set(width - budgetChipW - margin, r2cy - budgetChipH / 2);
  container.addChild(budgetBg);

  const budgetLabelText = new Text({
    text: mode === 'moves' ? 'MOVES' : 'TIME',
    style: new TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: budgetLabelSize,
      fill: TEXT_COLOURS.secondary,
      align: 'center',
      letterSpacing: 1,
    }),
  });
  budgetLabelText.anchor.set(0.5, 0);
  budgetLabelText.position.set(
    width - budgetChipW - margin + budgetChipW / 2,
    r2cy - budgetChipH / 2 + 5,
  );
  container.addChild(budgetLabelText);

  const budgetStyle = new TextStyle({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: statFontSize,
    fill: TEXT_COLOURS.primary,
    align: 'center',
    fontWeight: '700',
  });
  const budgetText = new Text({ text: mode === 'moves' ? '0' : '0:00', style: budgetStyle });
  budgetText.anchor.set(0.5, 1);
  budgetText.position.set(
    width - budgetChipW - margin + budgetChipW / 2,
    r2cy + budgetChipH / 2 - 5,
  );
  container.addChild(budgetText);

  // ── 連鎖計數（中央浮動，面板下方） ──────────────────────
  const chainFontSize = isMobile ? Math.round(FONT_SIZES.subtitle * scaleFactor) : FONT_SIZES.subtitle;
  const chainStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: chainFontSize,
    fill: 0xf6c453,
    align: 'center',
    dropShadow: { alpha: 0.9, angle: Math.PI / 4, blur: 4, color: 0x000000, distance: 2 },
  });
  const chainText = new Text({ text: '', style: chainStyle });
  chainText.anchor.set(0.5, 0.5);
  chainText.position.set(width / 2, panelH + 28);
  chainText.visible = false;
  container.addChild(chainText);

  // ── 公開參照 ──────────────────────────────────────────
  container.pauseButton = pauseButton;
  container.resetButton = resetButton;
  container.settingsButton = settingsButton;
  container.starDisplay = starDisplay;
  container.objectiveChip = objectiveChip;

  container.setScore = (score: number) => {
    scoreText.text = score.toLocaleString();
  };

  container.setMoves = (remaining: number) => {
    budgetText.text = `${remaining}`;
  };

  container.setTime = (remainingSeconds: number) => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    budgetText.text = `${mins}:${String(secs).padStart(2, '0')}`;
  };

  container.setObjective = (currentOrArray: number | ObjectiveProgress[], total?: number) => {
    if (Array.isArray(currentOrArray)) {
      // 多重目標：每個 chip 對應一個子目標的進度
      for (let i = 0; i < objectiveChips.length; i++) {
        const progress = currentOrArray[i];
        if (progress) {
          objectiveChips[i].setProgress(progress.current, progress.total);
        }
      }
    } else {
      // 單一目標：向後相容
      objectiveChip.setProgress(currentOrArray, total ?? 0);
    }
  };

  container.setStars = (count: 0 | 1 | 2 | 3) => {
    starDisplay.setStars(count);
  };

  container.showChain = (chain: number) => {
    chainText.text = `Chain ${chain}!`;
    chainText.visible = true;
  };

  container.hideChain = () => {
    chainText.visible = false;
  };

  return container;
}
