// ─── 31.7 關卡完成畫面 ──────────────────────────────────────
// 星星動畫、分數明細、下一關/重玩/返回。

import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, RADIUS } from '../theme';
import { createButton, createStarDisplay, type UIButton, type UIStarDisplay } from '../factory';
import type { LevelResult } from '../../types';

// ─── 型別 ──────────────────────────────────────────────────

export interface LevelCompleteScreen extends Container {
  mapButton: UIButton;
  replayButton: UIButton;
  nextButton: UIButton;
  starDisplay: UIStarDisplay;
  /** 設定關卡結果資料 */
  setResult(result: LevelResult, worldId: number): void;
}

export interface CreateLevelCompleteOptions {
  width: number;
  height: number;
  result?: LevelResult;
  worldId?: number;
  onMap?: () => void;
  onReplay?: () => void;
  onNext?: () => void;
}

/**
 * 建立關卡完成畫面。
 *
 * 結構：
 * - 半透明背景遮罩
 * - 世界/關卡標題
 * - 星星（逐星點亮動畫 placeholder）
 * - 分數明細：Score、剩餘手數獎勵、Total
 * - 統計：Best chain、Specials spawned
 * - Map / Replay / Next 按鈕
 */
export function createLevelCompleteScreen(options: CreateLevelCompleteOptions): LevelCompleteScreen {
  const {
    width,
    height,
    result,
    worldId = 1,
    onMap,
    onReplay,
    onNext,
  } = options;

  const container = new Container() as LevelCompleteScreen;
  container.label = 'level-complete-screen';

  // ── 背景遮罩 ─────────────────────────────────────────
  const overlay = new Graphics();
  overlay.rect(0, 0, width, height);
  overlay.fill({ color: 0x0b1026, alpha: BG.overlayAlpha });
  overlay.eventMode = 'static';
  container.addChild(overlay);

  // ── 面板 ──────────────────────────────────────────────
  const panelW = 480;
  const panelH = 400;
  const panelX = (width - panelW) / 2;
  const panelY = (height - panelH) / 2;

  const panel = new Graphics();
  panel.roundRect(panelX, panelY, panelW, panelH, RADIUS.lg);
  panel.fill({ color: BG.panel });
  container.addChild(panel);

  // ── 裝飾邊框（frame.png） ──────────────────────────────
  const frame = new Sprite(Texture.from('assets/ui/frame.png'));
  frame.anchor.set(0.5);
  frame.position.set(panelX + panelW / 2, panelY + panelH / 2);
  // 9-slice would be ideal; for now scale-fit with margin so border ornament
  // sits flush around the panel.
  const frameMargin = 24;
  const fw = frame.texture.width || 256;
  const fh = frame.texture.height || 256;
  frame.scale.set(
    (panelW + frameMargin * 2) / fw,
    (panelH + frameMargin * 2) / fh,
  );
  frame.alpha = 0.9;
  container.addChild(frame);

  // ── 標題 ──────────────────────────────────────────────
  const worldStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.muted,
    align: 'center',
  });
  const worldText = new Text({ text: '', style: worldStyle });
  worldText.anchor.set(0.5, 0);
  worldText.position.set(width / 2, panelY + SPACING.lg);
  container.addChild(worldText);

  const levelStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const levelText = new Text({ text: '', style: levelStyle });
  levelText.anchor.set(0.5, 0);
  levelText.position.set(width / 2, panelY + SPACING.lg + 20);
  container.addChild(levelText);

  // ── 星星 ──────────────────────────────────────────────
  const starDisplay = createStarDisplay({ starSize: 28, gap: 16, initialStars: 0 });
  starDisplay.position.set(width / 2 - 58, panelY + 96);
  container.addChild(starDisplay);

  // ── 寶箱獎勵（金=3星、銀=1-2星、0星不顯示） ───────────
  const chest = new Sprite(Texture.from('assets/ui/chest-silver.png'));
  chest.anchor.set(0.5);
  const chestTarget = 64;
  const cw = chest.texture.width || 256;
  const ch = chest.texture.height || 256;
  chest.scale.set(chestTarget / Math.max(cw, ch));
  chest.position.set(panelX + panelW - 56, panelY + 110);
  chest.visible = false;
  container.addChild(chest);

  // ── 分數明細 ──────────────────────────────────────────
  const detailStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.secondary,
  });
  const valueStyle = new TextStyle({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.primary,
  });

  const scoreLabel = new Text({ text: 'Score', style: detailStyle });
  scoreLabel.position.set(panelX + SPACING.xl, panelY + 130);
  container.addChild(scoreLabel);

  const scoreValue = new Text({ text: '0', style: valueStyle });
  scoreValue.anchor.set(1, 0);
  scoreValue.position.set(panelX + panelW - SPACING.xl, panelY + 130);
  container.addChild(scoreValue);

  const bonusLabel = new Text({ text: '', style: detailStyle });
  bonusLabel.position.set(panelX + SPACING.xl, panelY + 160);
  container.addChild(bonusLabel);

  const bonusValue = new Text({ text: '', style: valueStyle });
  bonusValue.anchor.set(1, 0);
  bonusValue.position.set(panelX + panelW - SPACING.xl, panelY + 160);
  container.addChild(bonusValue);

  // 分隔線
  const divider = new Graphics();
  divider.moveTo(panelX + SPACING.xl, panelY + 190);
  divider.lineTo(panelX + panelW - SPACING.xl, panelY + 190);
  divider.stroke({ color: TEXT_COLOURS.muted, width: 1, alpha: 0.3 });
  container.addChild(divider);

  const totalLabel = new Text({ text: 'Total', style: new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.primary,
    fontWeight: 'bold',
  }) });
  totalLabel.position.set(panelX + SPACING.xl, panelY + 200);
  container.addChild(totalLabel);

  const totalValue = new Text({ text: '0', style: new TextStyle({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: FONT_SIZES.body,
    fill: TEXT_COLOURS.primary,
    fontWeight: 'bold',
  }) });
  totalValue.anchor.set(1, 0);
  totalValue.position.set(panelX + panelW - SPACING.xl, panelY + 200);
  container.addChild(totalValue);

  // 統計
  const chainLabel = new Text({ text: 'Best chain', style: detailStyle });
  chainLabel.position.set(panelX + SPACING.xl, panelY + 240);
  container.addChild(chainLabel);

  const chainValue = new Text({ text: '0', style: valueStyle });
  chainValue.anchor.set(1, 0);
  chainValue.position.set(panelX + panelW - SPACING.xl, panelY + 240);
  container.addChild(chainValue);

  const specialLabel = new Text({ text: 'Specials spawned', style: detailStyle });
  specialLabel.position.set(panelX + SPACING.xl, panelY + 270);
  container.addChild(specialLabel);

  const specialValue = new Text({ text: '0', style: valueStyle });
  specialValue.anchor.set(1, 0);
  specialValue.position.set(panelX + panelW - SPACING.xl, panelY + 270);
  container.addChild(specialValue);

  // ── 按鈕 ──────────────────────────────────────────────
  const btnY = panelY + panelH - 56 - SPACING.lg;
  const btnWidth = 120;
  const btnGap = SPACING.md;
  const totalBtnW = btnWidth * 3 + btnGap * 2;
  const btnStartX = (width - totalBtnW) / 2;

  const mapButton = createButton({
    text: 'Map',
    variant: 'ghost',
    size: 'md',
    width: btnWidth,
    onClick: onMap,
  });
  mapButton.position.set(btnStartX, btnY);
  container.addChild(mapButton);

  const replayButton = createButton({
    text: 'Replay',
    variant: 'secondary',
    size: 'md',
    width: btnWidth,
    onClick: onReplay,
  });
  replayButton.position.set(btnStartX + btnWidth + btnGap, btnY);
  container.addChild(replayButton);

  const nextButton = createButton({
    text: 'Next',
    variant: 'primary',
    size: 'md',
    width: btnWidth,
    onClick: onNext,
  });
  nextButton.position.set(btnStartX + (btnWidth + btnGap) * 2, btnY);
  container.addChild(nextButton);

  // ── 公開參照 ──────────────────────────────────────────
  container.mapButton = mapButton;
  container.replayButton = replayButton;
  container.nextButton = nextButton;
  container.starDisplay = starDisplay;

  container.setResult = (r: LevelResult, wId: number) => {
    worldText.text = `WORLD ${wId}`;
    levelText.text = `Level ${String(r.levelId).padStart(2, '0')}`;
    starDisplay.setStars(r.stars);

    // 寶箱：3 星金 / 1-2 星銀 / 0 星不顯示
    if (r.stars >= 3) {
      chest.texture = Texture.from('assets/ui/chest-gold.png');
      chest.visible = true;
    } else if (r.stars >= 1) {
      chest.texture = Texture.from('assets/ui/chest-silver.png');
      chest.visible = true;
    } else {
      chest.visible = false;
    }

    // Play star grant sounds with staggered timing
    if (r.stars >= 1) {
      import('../../audio/sfx-player').then(({ playStarGrant }) => {
        setTimeout(() => playStarGrant(1), 300);
        if (r.stars >= 2) setTimeout(() => playStarGrant(2), 800);
        if (r.stars >= 3) setTimeout(() => playStarGrant(3), 1300);
      });
    }

    const baseScore = r.score - r.movesRemaining * 1000;
    scoreValue.text = Math.max(0, baseScore).toLocaleString();

    if (r.movesRemaining > 0) {
      bonusLabel.text = `+ ${r.movesRemaining} remaining moves × 1000`;
      bonusValue.text = `+${(r.movesRemaining * 1000).toLocaleString()}`;
    } else {
      bonusLabel.text = '';
      bonusValue.text = '';
    }

    totalValue.text = r.score.toLocaleString();
    chainValue.text = `${r.chainMax}`;
    specialValue.text = `${r.specialSpawnedCount}`;
  };

  // 初始資料
  if (result) {
    container.setResult(result, worldId);
  }

  return container;
}
