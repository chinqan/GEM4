// ─── 31.3 世界地圖 ──────────────────────────────────────────
// 關卡節點、星數、鎖定狀態、世界切換。

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BG, TEXT_COLOURS, FONT_SIZES, SPACING, STAR_COLOURS, WORLD_ACCENTS, RADIUS } from '../theme';
import { createButton, createStarDisplay, type UIButton, type UIStarDisplay } from '../factory';

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

/**
 * 建立世界地圖畫面。
 *
 * 結構：
 * - 頂部：返回按鈕、世界名稱、星數統計、設定齒輪
 * - 中央：可捲動的關卡節點區域
 * - 底部：世界切換按鈕（← W(n-1) / W(n+1) →）
 */
export function createWorldMapScreen(options: CreateWorldMapOptions): WorldMapScreen {
  const {
    width,
    height,
    worldId = 1,
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

  // ── 背景 ──────────────────────────────────────────────
  const bg = new Graphics();
  bg.rect(0, 0, width, height);
  bg.fill({ color: BG.deep });
  container.addChild(bg);

  // ── 頂部列 ────────────────────────────────────────────
  const headerY = SPACING.base;

  const backButton = createButton({
    text: '← Back',
    variant: 'ghost',
    size: 'sm',
    width: 80,
    onClick: onBack,
  });
  backButton.position.set(SPACING.base, headerY);
  container.addChild(backButton);

  const titleStyle = new TextStyle({
    fontFamily: 'Inter, "Noto Sans CJK TC", sans-serif',
    fontSize: FONT_SIZES.subtitle,
    fill: TEXT_COLOURS.primary,
    align: 'center',
  });
  const titleText = new Text({ text: worldName, style: titleStyle });
  titleText.anchor.set(0.5, 0);
  titleText.position.set(width / 2, headerY + 4);
  container.addChild(titleText);

  // 星數統計
  const starCountStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: FONT_SIZES.caption,
    fill: TEXT_COLOURS.muted,
  });
  const starCountText = new Text({ text: '★ 0/60', style: starCountStyle });
  starCountText.anchor.set(0.5, 0);
  starCountText.position.set(width / 2, headerY + 32);
  container.addChild(starCountText);

  // 設定齒輪
  const settingsBtn = createButton({
    text: '⚙',
    variant: 'ghost',
    size: 'sm',
    width: 40,
    onClick: onSettings,
  });
  settingsBtn.position.set(width - 40 - SPACING.base, headerY);
  container.addChild(settingsBtn);

  // ── 關卡節點區域 ──────────────────────────────────────
  const nodesContainer = new Container();
  nodesContainer.label = 'level-nodes';
  nodesContainer.position.set(0, 80);
  container.addChild(nodesContainer);

  const nodeSize = 48;
  const nodeGap = 16;

  function renderLevels(data: LevelNodeData[]): void {
    nodesContainer.removeChildren();

    const totalStars = data.reduce((sum, l) => sum + l.stars, 0);
    starCountText.text = `★ ${totalStars}/${data.length * 3}`;

    const cols = 4;
    const startX = (width - cols * (nodeSize + nodeGap)) / 2;
    const startY = SPACING.lg;

    data.forEach((level, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (nodeSize + nodeGap);
      const y = startY + row * (nodeSize + nodeGap + 20);

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

  // ── 底部世界切換 ──────────────────────────────────────
  const navY = height - 48;

  const prevWorldButton = createButton({
    text: '← Prev',
    variant: 'ghost',
    size: 'sm',
    width: 80,
    onClick: onPrevWorld,
  });
  prevWorldButton.position.set(SPACING.lg, navY);
  container.addChild(prevWorldButton);

  const nextWorldButton = createButton({
    text: 'Next →',
    variant: 'ghost',
    size: 'sm',
    width: 80,
    onClick: onNextWorld,
  });
  nextWorldButton.position.set(width - 80 - SPACING.lg, navY);
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
    const accent = WORLD_ACCENTS[wId] ?? WORLD_ACCENTS[1];
    // Could update accent colours here in future
  };

  container.setWorldNavigation = (canPrev: boolean, canNext: boolean) => {
    prevWorldButton.setEnabled(canPrev);
    nextWorldButton.setEnabled(canNext);
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
  bg.circle(size / 2, size / 2, size / 2);

  switch (data.state) {
    case 'locked':
      bg.fill({ color: 0x2a2f4a, alpha: 0.6 });
      break;
    case 'current':
      bg.fill({ color: 0xf6c453, alpha: 0.8 });
      break;
    case 'unlocked':
      bg.fill({ color: 0x3a4070, alpha: 0.8 });
      break;
    case 'completed':
      bg.fill({ color: 0x4a5090, alpha: 0.8 });
      break;
  }
  node.addChild(bg);

  // 關卡號碼
  const numStyle = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    fill: data.state === 'locked' ? TEXT_COLOURS.muted : TEXT_COLOURS.primary,
    align: 'center',
  });
  const numText = new Text({ text: `${data.levelId}`, style: numStyle });
  numText.anchor.set(0.5, 0.5);
  numText.position.set(size / 2, size / 2);
  node.addChild(numText);

  // 鎖定 icon
  if (data.state === 'locked') {
    const lockStyle = new TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 10,
      fill: TEXT_COLOURS.muted,
    });
    const lockText = new Text({ text: '🔒', style: lockStyle });
    lockText.anchor.set(0.5, 0);
    lockText.position.set(size / 2, size + 2);
    node.addChild(lockText);
  }

  // 星星（完成時）
  if (data.state === 'completed' && data.stars > 0) {
    const starsDisplay = createStarDisplay({
      starSize: 10,
      gap: 2,
      initialStars: data.stars,
    });
    starsDisplay.position.set(size / 2 - 18, size + 2);
    node.addChild(starsDisplay);
  }

  // 互動
  if (data.state !== 'locked') {
    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.on('pointertap', () => onTap?.());
  }

  return node;
}
