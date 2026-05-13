// ─── 31.3 世界地圖 ──────────────────────────────────────────
// 關卡節點、星數、鎖定狀態、世界切換。
// 明亮清新自然風格。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { SPACING, WORLD_ACCENTS } from '../theme';
import { type UIButton } from '../factory';

// ─── 世界地圖色彩 Token ────────────────────────────────────

const WM = {
  bgTop: 0xc8e6b0,       // 漸層頂部（淺綠）
  bgBottom: 0xf0f7e8,    // 漸層底部（近白綠）
  surface: 0xfcfdf9,     // 圓形按鈕白底
  border: 0xc8dcc0,      // 邊框灰綠
  fg: 0x2e3a28,          // 深色文字
  muted: 0x6b7a63,       // 灰綠文字
  accent: 0x4caf50,      // 完成節點綠
  accentDark: 0x357a38,  // 完成節點陰影
  accentLight: 0xa8e6a0, // 當前節點淺綠
  accentRing: 0x4caf50,  // 當前節點外圈
  yellow: 0xd4a017,      // 星星黃
  lockedBg: 0xdce4d8,    // 鎖定節點灰
  lockedFg: 0x9ca898,    // 鎖定文字灰
  starEmpty: 0xc0c8bc,   // 空星灰
} as const;

// ─── 型別 ──────────────────────────────────────────────────

export type LevelNodeState = 'locked' | 'current' | 'unlocked' | 'completed';

export interface LevelNodeData {
  levelId: number;
  state: LevelNodeState;
  stars: 0 | 1 | 2 | 3;
}

export interface WorldMapScreen extends Container {
  /** 更新關卡節點資料 */
  setLevels(levels: LevelNodeData[]): void;
  /** 設定當前世界 */
  setWorld(worldId: number, worldName: string): void;
  /** 設定世界切換按鈕可用性 */
  setWorldNavigation(canGoPrev: boolean, canGoNext: boolean): void;
  backButton: UIButton;
  prevWorldButton: UIButton;
  nextWorldButton: UIButton;
}

export interface CreateWorldMapOptions {
  width: number;
  height: number;
  worldId?: number;
  worldName?: string;
  levels?: LevelNodeData[];
  onBack?: () => void;
  onSettings?: () => void;
  onLevelTap?: (levelId: number) => void;
  onPrevWorld?: () => void;
  onNextWorld?: () => void;
}

// ─── 圓形圖示按鈕工廠 ──────────────────────────────────────

function createCircleIconButton(icon: string, size: number, onClick?: () => void): UIButton {
  const container = new Container() as UIButton;
  container.label = `circle-btn-${icon}`;
  container.hitArea = { contains: (x: number, y: number) => x >= 0 && x <= size && y >= 0 && y <= size };

  const bg = new Graphics();
  bg.circle(size / 2, size / 2, size / 2);
  bg.fill({ color: WM.surface });
  bg.stroke({ color: WM.border, width: 2 });
  container.addChild(bg);
  container.bg = bg;

  const style = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: icon === '⚙' ? 22 : 18,
    fill: WM.fg,
    align: 'center',
  });
  const label = new Text({ text: icon, style });
  label.anchor.set(0.5, 0.5);
  label.position.set(size / 2, size / 2);
  container.addChild(label);

  let enabled = true;
  container.eventMode = 'static';
  container.cursor = 'pointer';

  container.on('pointerdown', () => { if (enabled) container.scale.set(0.9); });
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
    container.alpha = e ? 1 : 0.4;
  };

  return container;
}

/**
 * 建立世界地圖畫面。
 *
 * 結構：
 * - 淺綠漸層背景
 * - 頂部：← 返回（圓形）、世界名稱（Fredoka）、⚙ 設定（圓形）
 * - 進度條：⭐ + 黃色進度條 + "32 / 60"
 * - 4×5 關卡節點網格（圓形，帶星星）
 */
export function createWorldMapScreen(options: CreateWorldMapOptions): WorldMapScreen {
  const {
    width,
    height,
    worldId: _worldId = 1,
    worldName = 'World 1',
    levels = [],
    onBack,
    onSettings,
    onLevelTap,
    onPrevWorld,
    onNextWorld,
  } = options;

  const container = new Container() as WorldMapScreen;
  container.label = 'world-map-screen';

  // ── 漸層背景 ──────────────────────────────────────────
  const bg = new Graphics();
  const gradientSteps = 16;
  const stepH = height / gradientSteps;
  for (let i = 0; i < gradientSteps; i++) {
    const t = i / (gradientSteps - 1);
    const r = lerp((WM.bgTop >> 16) & 0xff, (WM.bgBottom >> 16) & 0xff, t);
    const g = lerp((WM.bgTop >> 8) & 0xff, (WM.bgBottom >> 8) & 0xff, t);
    const b = lerp(WM.bgTop & 0xff, WM.bgBottom & 0xff, t);
    const colour = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    bg.rect(0, i * stepH, width, stepH + 1);
    bg.fill({ color: colour });
  }
  container.addChild(bg);

  // ── 頂部列 ────────────────────────────────────────────
  const headerY = 56;
  const iconSize = 40;

  const backButton = createCircleIconButton('←', iconSize, onBack);
  backButton.position.set(SPACING.lg, headerY);
  container.addChild(backButton);

  const titleStyle = new TextStyle({
    fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    fill: WM.fg,
    align: 'center',
    letterSpacing: -0.2,
  });
  const titleText = new Text({ text: worldName, style: titleStyle });
  titleText.anchor.set(0.5, 0.5);
  titleText.position.set(width / 2, headerY + iconSize / 2);
  container.addChild(titleText);

  const settingsBtn = createCircleIconButton('⚙', iconSize, onSettings);
  settingsBtn.position.set(width - iconSize - SPACING.lg, headerY);
  container.addChild(settingsBtn);

  // ── 進度條 ────────────────────────────────────────────
  const progressY = headerY + iconSize + 12;
  const barW = 160;
  const barH = 10;
  const barX = (width - barW) / 2;

  // 星星 icon
  const starIcon = new Text({
    text: '⭐',
    style: new TextStyle({ fontSize: 14 }),
  });
  starIcon.anchor.set(1, 0.5);
  starIcon.position.set(barX - 8, progressY + barH / 2);
  container.addChild(starIcon);

  // 進度條背景
  const progressTrack = new Graphics();
  progressTrack.roundRect(barX, progressY, barW, barH, barH / 2);
  progressTrack.fill({ color: WM.border });
  container.addChild(progressTrack);

  // 進度條填充
  const progressFill = new Graphics();
  container.addChild(progressFill);

  // 進度文字
  const progressTextStyle = new TextStyle({
    fontFamily: 'Nunito, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: '700',
    fill: WM.muted,
  });
  const progressText = new Text({ text: '0 / 0', style: progressTextStyle });
  progressText.anchor.set(0, 0.5);
  progressText.position.set(barX + barW + 8, progressY + barH / 2);
  container.addChild(progressText);

  function updateProgress(data: LevelNodeData[]): void {
    const totalStars = data.reduce((sum, l) => sum + l.stars, 0);
    const maxStars = data.length * 3;
    const ratio = maxStars > 0 ? totalStars / maxStars : 0;

    progressText.text = `${totalStars} / ${maxStars}`;

    progressFill.clear();
    if (ratio > 0) {
      const fillW = Math.max(barH, barW * ratio);
      progressFill.roundRect(barX, progressY, fillW, barH, barH / 2);
      progressFill.fill({ color: WM.yellow });
    }
  }

  // ── 關卡節點區域 ──────────────────────────────────────
  const nodesContainer = new Container();
  nodesContainer.label = 'level-nodes';
  container.addChild(nodesContainer);

  const nodeSize = 60;
  const nodeGap = 16;
  const gridTop = progressY + barH + 24;

  function renderLevels(data: LevelNodeData[]): void {
    nodesContainer.removeChildren();
    updateProgress(data);

    const cols = 4;
    const gridW = cols * nodeSize + (cols - 1) * nodeGap;
    const startX = (width - gridW) / 2;

    data.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (nodeSize + nodeGap);
      const y = gridTop + row * (nodeSize + nodeGap + 14);

      const node = createLevelNode(level, nodeSize, () => {
        if (level.state !== 'locked') {
          onLevelTap?.(level.levelId);
        }
      });
      node.position.set(x, y);
      nodesContainer.addChild(node);
    });
  }

  renderLevels(levels);

  // ── 底部世界切換（隱藏式，保留接口） ──────────────────
  const prevWorldButton = createCircleIconButton('←', 32, onPrevWorld);
  prevWorldButton.position.set(SPACING.lg, height - 48);
  prevWorldButton.visible = false;
  container.addChild(prevWorldButton);

  const nextWorldButton = createCircleIconButton('→', 32, onNextWorld);
  nextWorldButton.position.set(width - 32 - SPACING.lg, height - 48);
  nextWorldButton.visible = false;
  container.addChild(nextWorldButton);

  // ── 公開方法 ──────────────────────────────────────────
  container.backButton = backButton;
  container.prevWorldButton = prevWorldButton;
  container.nextWorldButton = nextWorldButton;

  container.setLevels = (data: LevelNodeData[]) => {
    renderLevels(data);
  };

  container.setWorld = (wId: number, wName: string) => {
    titleText.text = wName;
    const _accent = WORLD_ACCENTS[wId] ?? WORLD_ACCENTS[1];
  };

  container.setWorldNavigation = (canPrev: boolean, canNext: boolean) => {
    prevWorldButton.setEnabled(canPrev);
    prevWorldButton.visible = canPrev;
    nextWorldButton.setEnabled(canNext);
    nextWorldButton.visible = canNext;
  };

  return container;
}

// ─── 關卡節點 ──────────────────────────────────────────────

function createLevelNode(
  data: LevelNodeData,
  size: number,
  onTap?: () => void,
): Container {
  const node = new Container();
  node.label = `level-node-${data.levelId}`;

  const bg = new Graphics();

  switch (data.state) {
    case 'completed':
      // 底部陰影
      bg.circle(size / 2, size / 2 + 4, size / 2);
      bg.fill({ color: WM.accentDark });
      // 主體
      bg.circle(size / 2, size / 2, size / 2);
      bg.fill({ color: WM.accent });
      break;
    case 'current':
      // 外圈 ring
      bg.circle(size / 2, size / 2, size / 2 + 3);
      bg.fill({ color: WM.accentRing });
      // 主體淺綠
      bg.circle(size / 2, size / 2, size / 2);
      bg.fill({ color: WM.accentLight });
      // 底部陰影
      bg.circle(size / 2, size / 2 + 4, size / 2);
      bg.fill({ color: 0x7ac870, alpha: 0.5 });
      bg.circle(size / 2, size / 2, size / 2);
      bg.fill({ color: WM.accentLight });
      break;
    case 'unlocked':
      bg.circle(size / 2, size / 2 + 3, size / 2);
      bg.fill({ color: 0xbcc8b8 });
      bg.circle(size / 2, size / 2, size / 2);
      bg.fill({ color: WM.lockedBg });
      break;
    case 'locked':
      bg.circle(size / 2, size / 2 + 3, size / 2);
      bg.fill({ color: 0xbcc8b8 });
      bg.circle(size / 2, size / 2, size / 2);
      bg.fill({ color: WM.lockedBg });
      break;
  }
  node.addChild(bg);

  // 關卡號碼或鎖定圖示
  if (data.state === 'locked') {
    const lockStyle = new TextStyle({
      fontSize: 14,
      fill: WM.lockedFg,
      align: 'center',
    });
    const lockText = new Text({ text: '🔒', style: lockStyle });
    lockText.anchor.set(0.5, 0.5);
    lockText.position.set(size / 2, size / 2);
    lockText.alpha = 0.5;
    node.addChild(lockText);
  } else {
    const numColour = data.state === 'completed' ? 0xffffff
      : data.state === 'current' ? WM.accentDark
      : WM.fg;
    const numStyle = new TextStyle({
      fontFamily: 'Fredoka, Nunito, system-ui, sans-serif',
      fontSize: 20,
      fontWeight: '700',
      fill: numColour,
      align: 'center',
    });
    const numText = new Text({ text: `${data.levelId}`, style: numStyle });
    numText.anchor.set(0.5, 0.5);
    numText.position.set(size / 2, size / 2);
    node.addChild(numText);
  }

  // 星星（完成或當前時顯示）
  if ((data.state === 'completed' || data.state === 'current') && data.stars > 0) {
    const starsContainer = new Container();
    const starSize = 10;
    const starGap = 1;
    const totalW = 3 * starSize + 2 * starGap;
    for (let i = 0; i < 3; i++) {
      const filled = i < data.stars;
      const star = new Text({
        text: '★',
        style: new TextStyle({
          fontSize: starSize,
          fill: filled ? WM.yellow : WM.starEmpty,
        }),
      });
      star.anchor.set(0.5, 0);
      star.position.set(-totalW / 2 + i * (starSize + starGap) + starSize / 2, 0);
      starsContainer.addChild(star);
    }
    starsContainer.position.set(size / 2, size + 2);
    node.addChild(starsContainer);
  }

  // 互動
  if (data.state !== 'locked') {
    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.on('pointertap', () => onTap?.());
  }

  return node;
}

// ─── 工具函式 ──────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
