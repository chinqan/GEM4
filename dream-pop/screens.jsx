// Dream Pop Gems — five mobile screens. Each screen is self-contained and
// receives { go, world, setWorld, level } from the parent. Each screen sits
// inside a .phone shell at 390×844.

// ─────────────────────────────────────────────────────────────
// 1. MainMenu
// ─────────────────────────────────────────────────────────────
function MainMenu({ go, world }) {
  return (
    <div className="phone dp-root" data-world={world} style={{
      background: 'linear-gradient(180deg, var(--w-bg-c) 0%, var(--w-bg-a) 55%, var(--w-bg-b) 100%)',
    }}>
      <DreamSky />

      {/* hill / horizon */}
      <div style={{
        position: 'absolute', bottom: 0, left: -10, right: -10, height: 240,
        background: 'radial-gradient(120% 120% at 50% 100%, color-mix(in oklab, var(--w-accent) 30%, white) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -40, right: -40, height: 200,
        background: '#fff',
        borderRadius: '50%',
        opacity: 0.55,
      }} />

      {/* Logo block */}
      <div style={{
        position: 'absolute', top: 110, left: 0, right: 0,
        textAlign: 'center',
      }}>
        <div className="dp-display dp-sticker-title" style={{
          fontSize: 76, lineHeight: 1, fontWeight: 700,
          letterSpacing: '-1px',
        }}>GEM POP</div>
        <div className="dp-display" style={{
          marginTop: 8, fontSize: 22, color: 'var(--text-primary)',
          letterSpacing: '6px', fontWeight: 600,
        }}>夢幻寶石樂園</div>

        {/* Lumi floats next to logo */}
        <div style={{ position: 'absolute', top: -30, right: 42 }}>
          <Lumi size={64} />
        </div>
        <div style={{ position: 'absolute', top: 110, left: 28 }}>
          <Gem type="red" size={36} />
        </div>
      </div>

      {/* Button stack */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 110,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        padding: '0 48px',
      }}>
        <button className="dp-btn" style={{ width: '100%', fontSize: 26, padding: '20px 24px' }}
                onClick={() => go('map')}>開始玩</button>
        <button className="dp-btn dp-btn--secondary" style={{ width: '100%' }}
                onClick={() => go('map')}>無盡模式</button>
        <button className="dp-btn dp-btn--secondary" style={{ width: '100%' }}
                onClick={() => go('game')}>測試模式</button>
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="dp-btn dp-btn--secondary" style={{ flex: 1, fontSize: 16, padding: '14px 16px' }}>設定</button>
          <button className="dp-btn dp-btn--secondary" style={{ flex: 1, fontSize: 16, padding: '14px 16px' }}>製作名單</button>
        </div>
      </div>

      {/* Player progress chip */}

      <div style={{
        position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center',
        fontSize: 12, color: 'var(--text-muted)',
      }}>v1.0.0 · dream pop edition</div>

      <div className="phone-home" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. WorldMap
// ─────────────────────────────────────────────────────────────
function WorldMap({ go, world, setWorld, level: currentLevel }) {
  const worldsMeta = [
    { id: 'w1', name: '彩虹花園',     stars: 34, total: 60 },
    { id: 'w2', name: '泡泡水晶洞',   stars: 12, total: 60 },
    { id: 'w3', name: '月光糖果海',   stars: 0,  total: 60 },
    { id: 'w4', name: '星星遊樂園',   stars: 0,  total: 120 },
  ];
  const meta = worldsMeta.find((w) => w.id === world) || worldsMeta[0];
  const wIndex = worldsMeta.findIndex((w) => w.id === world);

  // Hand-tuned level node positions on a curving path. Numbers 1..10.
  const nodes = [
    { n: 1,  x:  90, y: 100, stars: 3 },
    { n: 2,  x: 220, y: 140, stars: 3 },
    { n: 3,  x: 290, y: 230, stars: 2 },
    { n: 4,  x: 180, y: 290, stars: 2 },
    { n: 5,  x:  70, y: 340, stars: 1 },
    { n: 6,  x: 110, y: 430, stars: 0, current: true },
    { n: 7,  x: 230, y: 460, stars: 0, locked: true },
    { n: 8,  x: 310, y: 530, stars: 0, locked: true },
    { n: 9,  x: 230, y: 600, stars: 0, locked: true },
    { n: 10, x: 110, y: 640, stars: 0, locked: true, finale: true },
  ];

  return (
    <div className="phone dp-root" data-world={world} style={{
      background: 'linear-gradient(180deg, var(--w-bg-c) 0%, var(--w-bg-a) 60%, var(--w-bg-b) 100%)',
    }}>
      <PhoneStatus />

      {/* Header bar */}
      <div style={{
        position: 'absolute', top: 48, left: 0, right: 0, height: 76,
        padding: '14px 16px 0 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        zIndex: 10,
      }}>
        <button className="dp-icon-btn" onClick={() => go('menu')} aria-label="back">
          <ArrowIcon dir="left" />
        </button>
        <div className="dp-panel" style={{
          flex: 1, height: 48, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10, borderRadius: 999,
          borderColor: 'var(--w-accent)',
          whiteSpace: 'nowrap',
        }}>
          <span className="dp-display" style={{ fontSize: 19 }}>{meta.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <StarSticker size={16} />
            <span className="dp-display" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
              {meta.stars}/{meta.total}
            </span>
          </span>
        </div>
        <button className="dp-icon-btn" aria-label="settings">
          <SettingsIcon />
        </button>
      </div>

      <DreamSky />

      {/* Path SVG */}
      <svg width="390" height="844" viewBox="0 0 390 844" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      }}>
        <defs>
          <linearGradient id="path-rib" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--w-accent)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--w-accent-2)" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path d="M 90 250 Q 160 200 220 290 T 290 380 Q 220 440 180 440 T 70 490 Q 110 540 110 580 Q 200 600 230 610 Q 310 640 310 680 Q 250 720 230 750 Q 160 770 110 790"
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="22"
              strokeLinecap="round" />
        <path d="M 90 250 Q 160 200 220 290 T 290 380 Q 220 440 180 440 T 70 490 Q 110 540 110 580 Q 200 600 230 610 Q 310 640 310 680 Q 250 720 230 750 Q 160 770 110 790"
              fill="none"
              stroke="url(#path-rib)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="4 12" />
      </svg>

      {/* Level nodes — offset by header (124px top) */}
      <div style={{ position: 'absolute', inset: '124px 0 0 0', zIndex: 2 }}>
        {nodes.map((node) => (
          <LevelNode key={node.n} node={node}
                     onClick={() => !node.locked && go('game', { level: node.n })} />
        ))}
      </div>

      {/* Bottom world switcher */}
      <div style={{
        position: 'absolute', bottom: 32, left: 16, right: 16, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10,
      }}>
        <button className="dp-icon-btn"
                onClick={() => setWorld(worldsMeta[Math.max(0, wIndex - 1)].id)}
                aria-label="prev world">
          <ArrowIcon dir="left" />
        </button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {worldsMeta.map((w, i) => (
            <button key={w.id}
                    onClick={() => setWorld(w.id)}
                    style={{
                      width: i === wIndex ? 32 : 10, height: 10,
                      borderRadius: 999, border: 'none',
                      background: i === wIndex ? 'var(--w-accent)' : 'rgba(255,255,255,0.85)',
                      boxShadow: '0 2px 4px rgba(43,37,80,0.18)',
                      transition: 'width 200ms ease',
                      cursor: 'pointer',
                    }} />
          ))}
        </div>
        <button className="dp-icon-btn"
                onClick={() => setWorld(worldsMeta[Math.min(3, wIndex + 1)].id)}
                aria-label="next world">
          <ArrowIcon dir="right" />
        </button>
      </div>

      <div className="phone-home" />
    </div>
  );
}

function LevelNode({ node, onClick }) {
  const { x, y, n, stars, locked, current, finale } = node;
  const size = current ? 76 : 68;
  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        position: 'absolute',
        left: x - size / 2, top: y - size / 2,
        width: size, height: size,
        padding: 0,
        border: 'none', background: 'transparent',
        cursor: locked ? 'default' : 'pointer',
      }}>
      {/* halo for current */}
      {current && (
        <div style={{
          position: 'absolute', inset: -16,
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in oklab, var(--w-accent) 50%, white) 0%, transparent 70%)',
          animation: 'dp-pulse 1.8s ease-in-out infinite',
        }} />
      )}
      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        borderRadius: '50%',
        border: '4px solid #fff',
        outline: 'var(--ink-stroke) solid color-mix(in oklab, var(--w-accent) 50%, #1A1340)',
        background: locked
          ? '#E2DEF4'
          : finale
            ? 'linear-gradient(180deg, #FFE684, var(--w-accent))'
            : current
              ? 'linear-gradient(180deg, color-mix(in oklab, var(--w-accent) 25%, white), color-mix(in oklab, var(--w-accent) 60%, white))'
              : 'linear-gradient(180deg, #fff, color-mix(in oklab, var(--w-accent) 25%, white))',
        boxShadow: locked ? '0 4px 0 rgba(27, 19, 64, 0.18)' : '0 5px 0 color-mix(in oklab, var(--w-accent) 40%, #1A1340), 0 8px 14px rgba(27, 19, 64, 0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: current ? 'dp-bounce 1.6s ease-in-out infinite' : 'none',
      }}>
        {locked ? (
          <LockIcon />
        ) : finale ? (
          <span style={{ fontSize: 28 }}>👑</span>
        ) : (
          <span className="dp-display" style={{
            fontSize: 26, color: 'var(--text-primary)', fontWeight: 700,
          }}>{n}</span>
        )}
        {/* gloss */}
        <div style={{
          position: 'absolute', top: 6, left: 12, right: 12, height: '35%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.7), transparent)',
          pointerEvents: 'none',
        }} />
      </div>
      {/* star row */}
      {!locked && (
        <div style={{
          position: 'absolute', top: -16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 2,
        }}>
          {[0, 1, 2].map((i) => (
            <StarSticker key={i} size={14} filled={i < stars} />
          ))}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. GameScreen
// ─────────────────────────────────────────────────────────────
const BOARD = [
  [0, 3, 1, 4, 2, 5, 6, 0],
  [2, 0, 6, 1, 3, 0, 4, 1],
  [1, 5, 2, 0, 6, 3, 1, 5],
  [4, 1, 0, 3, 5, 2, 0, 4],
  [6, 2, 4, 1, 0, 6, 3, 2],
  [3, 0, 5, 6, 1, 4, 2, 0],
  [2, 4, 3, 0, 6, 1, 5, 3],
  [0, 6, 1, 2, 4, 0, 3, 6],
];
const GEM_KEYS = ['red', 'green', 'blue', 'yellow', 'purple', 'white', 'orange'];
// One color gem and one line bomb seeded into the board.
const SPECIALS = { '2,4': 'color', '5,2': 'line', '4,7': 'bomb' };

function GameScreen({ go, world, level = 6, paused = false }) {
  const [selected, setSelected] = React.useState(null); // [r,c]

  const onCellTap = (r, c) => {
    if (paused) return;
    if (!selected) { setSelected([r, c]); return; }
    const [sr, sc] = selected;
    const adj = Math.abs(sr - r) + Math.abs(sc - c) === 1;
    if (adj) {
      // pretend swap then clear
      setSelected(null);
    } else {
      setSelected([r, c]);
    }
  };

  return (
    <div className="phone dp-root" data-world={world} style={{
      background: 'linear-gradient(180deg, var(--w-bg-c) 0%, var(--w-bg-a) 60%, var(--w-bg-b) 100%)',
    }}>
      <PhoneStatus />
      <DreamSky />

      {/* top hud */}
      <div style={{
        position: 'absolute', top: 54, left: 0, right: 0,
        padding: '0 14px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, zIndex: 10,
      }}>
        <button className="dp-icon-btn" onClick={() => go('pause')} aria-label="pause">
          <PauseIcon />
        </button>
        <div className="dp-panel" style={{
          flex: 1, height: 56, padding: '0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 999, borderColor: 'var(--w-accent)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>SCORE</span>
            <span className="dp-display" style={{ fontSize: 22, fontWeight: 700 }}>03,450</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <StarSticker size={22} />
            <StarSticker size={22} />
            <StarSticker size={22} filled={false} />
          </div>
        </div>
        <button className="dp-icon-btn" aria-label="settings">
          <SettingsIcon />
        </button>
      </div>

      {/* objective + moves */}
      <div style={{
        position: 'absolute', top: 124, left: 0, right: 0,
        padding: '0 16px', display: 'flex', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <ObjectiveChip type="red" current={6} total={15} />
        <MovesChip moves={12} />
      </div>

      {/* combo toast (preview) */}
      <div style={{
        position: 'absolute', top: 188, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
        zIndex: 8,
      }}>
        <div className="dp-display" style={{
          padding: '8px 20px',
          background: 'linear-gradient(180deg, #FFD93D, #FF7AB6)',
          color: '#fff',
          fontSize: 19,
          borderRadius: 999,
          border: '3px solid #fff',
          outline: 'var(--ink-stroke) solid #B8267A',
          boxShadow: '0 4px 0 #B8267A, var(--shadow-z1)',
          textShadow: '0 2px 0 #B8267A',
          transform: 'rotate(-3deg)',
          whiteSpace: 'nowrap',
        }}>✨ 連鎖！</div>
        <div className="dp-display" style={{
          padding: '4px 12px',
          background: '#fff',
          color: 'var(--w-accent)',
          fontSize: 18,
          fontWeight: 800,
          borderRadius: 999,
          border: '3px solid var(--w-accent)',
          outline: 'var(--ink-stroke) solid color-mix(in oklab, var(--w-accent) 40%, #1A1340)',
          boxShadow: '0 3px 0 color-mix(in oklab, var(--w-accent) 40%, #1A1340)',
          transform: 'rotate(4deg) translateY(2px)',
          whiteSpace: 'nowrap',
        }}>×3</div>
      </div>

      {/* board */}
      <Board selected={selected} onCellTap={onCellTap} />

      {/* hint button */}
      <div style={{ position: 'absolute', right: 16, bottom: 76, zIndex: 10 }}>
        <button className="dp-icon-btn" style={{
          width: 56, height: 56,
          background: 'linear-gradient(180deg, #FFE684, #FFC93A)',
          color: '#fff',
          fontSize: 24,
          animation: 'dp-bounce 2s ease-in-out infinite',
        }} aria-label="hint">💡</button>
      </div>

      <div className="phone-home" />
    </div>
  );
}

function Board({ selected, onCellTap }) {
  const cellSize = 38;
  const gap = 4;
  const boardSize = 8 * cellSize + 7 * gap + 24; // 24 = padding
  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: 280,
      transform: 'translateX(-50%)',
      width: boardSize,
    }}>
      <div style={{
        padding: 12,
        borderRadius: 28,
        background: 'linear-gradient(180deg, var(--bg-board) 0%, var(--bg-board-alt) 100%)',
        border: '3px solid #fff',
        outline: 'var(--ink-stroke) solid var(--bg-board-frame)',
        boxShadow: 'var(--shadow-z2), inset 0 2px 6px rgba(27, 19, 64, 0.08)',
        position: 'relative',
      }}>
        {/* board grid bg */}
        <div style={{
          position: 'absolute', inset: 12, borderRadius: 18, overflow: 'hidden',
        }}>
          {BOARD.map((row, r) => row.map((_, c) => (
            <div key={`bg-${r}-${c}`} style={{
              position: 'absolute',
              left: c * (cellSize + gap), top: r * (cellSize + gap),
              width: cellSize, height: cellSize,
              borderRadius: 10,
              background: (r + c) % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'transparent',
            }} />
          )))}
        </div>
        {/* gems */}
        <div style={{
          position: 'relative',
          width: 8 * cellSize + 7 * gap,
          height: 8 * cellSize + 7 * gap,
        }}>
          {BOARD.map((row, r) => row.map((g, c) => {
            const sel = selected && selected[0] === r && selected[1] === c;
            const sp = SPECIALS[r + ',' + c] || null;
            return (
              <div key={`g-${r}-${c}`}
                   onClick={() => onCellTap(r, c)}
                   style={{
                     position: 'absolute',
                     left: c * (cellSize + gap), top: r * (cellSize + gap),
                     width: cellSize, height: cellSize,
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     cursor: 'pointer',
                     transform: sel ? 'scale(1.1)' : 'scale(1)',
                     transition: 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                   }}>
                <Gem type={GEM_KEYS[g]} size={cellSize - 4} selected={sel} special={sp} idle={!sel} />
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
}

function ObjectiveChip({ type = 'red', current = 6, total = 15 }) {
  const pct = Math.min(100, (current / total) * 100);
  return (
    <div className="dp-chip dp-chip--accent" style={{ height: 48, padding: '0 14px 0 8px', gap: 10 }}>
      <Gem type={type} size={32} idle={false} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 64 }}>
        <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--text-primary)' }}>
          {current}<span style={{ color: 'var(--text-muted)' }}>/{total}</span>
        </span>
        <div style={{
          marginTop: 4, height: 6, width: 76, borderRadius: 999,
          background: '#EEE8FA', overflow: 'hidden',
        }}>
          <div style={{
            width: pct + '%', height: '100%',
            background: 'linear-gradient(90deg, #FF5C8A, #FF9F43)',
            borderRadius: 999,
          }} />
        </div>
      </div>
    </div>
  );
}

function MovesChip({ moves = 12 }) {
  return (
    <div className="dp-chip" style={{
      height: 48, padding: '0 14px',
      background: 'linear-gradient(180deg, #fff, #EDF6FF)',
    }}>
      <span style={{ fontSize: 22 }}>🫧</span>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>MOVES</span>
        <span className="dp-display" style={{ fontSize: 20 }}>{moves}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Pause modal — rendered as a GameScreen with overlay
// ─────────────────────────────────────────────────────────────
function PauseScreen({ go, world, level }) {
  return (
    <div style={{ position: 'relative' }}>
      <GameScreen go={() => {}} world={world} level={level} paused />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}>
        <div className="dp-panel" style={{
          width: 300,
          padding: '32px 28px 28px',
          borderRadius: 32,
          textAlign: 'center',
          position: 'relative',
          background: 'linear-gradient(180deg, #fff 0%, var(--w-bg-a) 100%)',
        }}>
          {/* Lumi tucked at top */}
          <div style={{ position: 'absolute', top: -34, left: '50%', transform: 'translateX(-50%)' }}>
            <Lumi size={68} />
          </div>
          <div className="dp-display" style={{
            marginTop: 24, fontSize: 28, color: 'var(--text-primary)',
          }}>暫停一下</div>
          <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 14 }}>
            Lumi 在這裡陪你休息一下
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            <button className="dp-btn" onClick={() => go('game')}>繼續</button>
            <button className="dp-btn dp-btn--secondary" onClick={() => go('game')}>再玩一次</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="dp-btn dp-btn--secondary" style={{ flex: 1, fontSize: 14, padding: '12px 8px' }}>設定</button>
              <button className="dp-btn dp-btn--secondary" style={{ flex: 1, fontSize: 14, padding: '12px 8px' }}
                      onClick={() => go('map')}>回地圖</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Level Complete
// ─────────────────────────────────────────────────────────────
function LevelComplete({ go, world, level = 6 }) {
  return (
    <div className="phone dp-root" data-world={world} style={{
      background: 'linear-gradient(180deg, var(--w-bg-c) 0%, var(--w-bg-a) 40%, var(--w-bg-b) 100%)',
    }}>
      <PhoneStatus />

      {/* confetti */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ConfettiBurst count={40} seed={7} />
      </div>

      {/* Lumi celebrating */}
      <div style={{
        position: 'absolute', top: 86, left: '50%', transform: 'translateX(-50%)',
      }}>
        <Lumi size={88} />
      </div>

      {/* Title */}
      <div style={{
        position: 'absolute', top: 200, left: 0, right: 0, textAlign: 'center',
      }}>
        <div className="dp-display dp-sticker-title-sm" style={{
          fontSize: 40, letterSpacing: '0.5px',
        }}>太棒了！過關！</div>
        <div className="dp-display" style={{
          marginTop: 2, fontSize: 15, color: 'var(--text-secondary)',
          letterSpacing: 4,
        }}>WORLD 1 · 第 {level} 關</div>
      </div>

      {/* Stars row */}
      <div style={{
        position: 'absolute', top: 282, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 8,
      }}>
        <RevealStar size={72} delay={0} filled />
        <RevealStar size={88} delay={180} filled />
        <RevealStar size={72} delay={360} filled={false} />
      </div>

      {/* Score panel */}
      <div className="dp-panel" style={{
        position: 'absolute', left: 28, right: 28, top: 416,
        padding: 22,
        background: 'linear-gradient(180deg, #fff 0%, var(--w-bg-a) 100%)',
        borderRadius: 28,
      }}>
        <ScoreRow label="分數" value="14,560" />
        <ScoreRow label={<>剩餘 5 步 <span style={{ color: 'var(--text-muted)' }}>× 200</span></>}
                  value="+1,000" />
        <div style={{ borderTop: '2px dashed #E7E1F5', margin: '12px 0' }} />
        <ScoreRow label="總分" value="15,560" bold />
        <div style={{ display: 'flex', gap: 22, marginTop: 14, justifyContent: 'space-between' }}>
          <StatTile icon="🔗" label="最長連鎖" value="5" />
          <StatTile icon="✨" label="特殊寶石" value="3" />
          <StatTile icon="🥇" label="新紀錄" value="!" highlight />
        </div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute', left: 28, right: 28, bottom: 56,
        display: 'flex', gap: 10,
      }}>
        <button className="dp-icon-btn" style={{ width: 60, height: 60 }}
                onClick={() => go('map')}
                aria-label="map">🗺️</button>
        <button className="dp-icon-btn" style={{ width: 60, height: 60, background: 'linear-gradient(180deg, #fff, #E7F5FF)' }}
                onClick={() => go('game')}
                aria-label="retry">🔄</button>
        <button className="dp-btn" style={{ flex: 1, padding: '18px 16px' }}
                onClick={() => go('game')}>下一關 →</button>
      </div>

      <div className="phone-home" />
    </div>
  );
}

function RevealStar({ size, delay, filled }) {
  return (
    <div style={{ display: 'inline-block' }}>
      <StarSticker size={size} filled={filled} />
    </div>
  );
}

function ScoreRow({ label, value, bold = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      marginTop: 6,
      fontFamily: 'var(--font-display)',
      fontSize: bold ? 22 : 17,
      fontWeight: bold ? 700 : 500,
      color: bold ? 'var(--text-primary)' : 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      gap: 12,
    }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function StatTile({ icon, label, value, highlight }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '8px 4px',
      borderRadius: 14,
      background: highlight ? 'linear-gradient(180deg, #FFE684, #FFD166)' : 'rgba(255,255,255,0.7)',
      border: '2px solid #fff',
      boxShadow: '0 2px 6px rgba(43,37,80,0.10)',
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div className="dp-display" style={{ fontSize: 18, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Icon helpers (kept inline for self-containment)
// ─────────────────────────────────────────────────────────────
function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
function ArrowIcon({ dir = 'left' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
         style={{ transform: dir === 'right' ? 'rotate(180deg)' : '' }}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.6" />
      <rect x="14" y="5" width="4" height="14" rx="1.6" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8E8AA8"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="3" fill="#fff" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

Object.assign(window, {
  MainMenu, WorldMap, GameScreen, PauseScreen, LevelComplete,
});
