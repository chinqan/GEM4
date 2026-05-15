// Dream Pop Gems — SVG gem set, Lumi, particles, atmospheric props.
// All SVG-only; jelly look comes from radial gradient + white gloss + rim.

const GEM_COLORS = {
  red:    { hue: '#FF3D78', dark: '#9C1844', light: '#FFAFC8' },
  green:  { hue: '#34C04E', dark: '#0E6D24', light: '#A6F0AE' },
  blue:   { hue: '#2EB3F8', dark: '#0F5E96', light: '#B0E2FF' },
  yellow: { hue: '#FFC233', dark: '#9C6E0F', light: '#FFE89A' },
  purple: { hue: '#8B5DFF', dark: '#3F1F94', light: '#CFB6FF' },
  white:  { hue: '#F8FBFF', dark: '#7C88B0', light: '#FFFFFF' },
  orange: { hue: '#FF7A1A', dark: '#943200', light: '#FFC892' },
};

// Each shape returns a <path>/<ellipse> element with a viewBox of 100×100,
// centered on (50,50). The fill is whatever the caller passes (we apply a
// gradient + the gloss overlay around it).
function gemShape(type, fill, strokeColor, strokeWidth) {
  const common = {
    fill,
    stroke: strokeColor != null ? strokeColor : 'rgba(255,255,255,0.85)',
    strokeWidth: strokeWidth != null ? strokeWidth : 4,
    strokeLinejoin: 'round',
  };
  switch (type) {
    case 'red': // teardrop
      return (
        <path d="M50 8 C 30 30, 12 50, 18 70 C 24 90, 76 90, 82 70 C 88 50, 70 30, 50 8 Z"
              {...common} />
      );
    case 'green': // rounded square
      return (
        <rect x="14" y="14" width="72" height="72" rx="22" ry="22" {...common} />
      );
    case 'blue': // oval bubble
      return (
        <ellipse cx="50" cy="50" rx="36" ry="42" {...common} />
      );
    case 'yellow': { // rounded star
      const pts = [];
      const cx = 50, cy = 51;
      for (let i = 0; i < 10; i++) {
        const a = (-90 + i * 36) * Math.PI / 180;
        const r = i % 2 === 0 ? 40 : 19;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') + ' Z';
      return <path d={d} {...common} strokeLinejoin="round" />;
    }
    case 'purple': // marquise (lens)
      return (
        <path d="M50 8 C 78 26, 78 74, 50 92 C 22 74, 22 26, 50 8 Z" {...common} />
      );
    case 'white': // round
      return (
        <circle cx="50" cy="50" r="38" {...common} />
      );
    case 'orange': // rounded triangle
      return (
        <path d="M50 12 C 60 12, 86 60, 86 70 C 86 82, 60 86, 50 86 C 40 86, 14 82, 14 70 C 14 60, 40 12, 50 12 Z"
              {...common} />
      );
    default:
      return <circle cx="50" cy="50" r="38" {...common} />;
  }
}

// <Gem type="red" size={36} selected special={'color'|'line'|'bomb'|null} />
function Gem({ type = 'blue', size = 40, selected = false, special = null, idle = true, style = {} }) {
  const c = GEM_COLORS[type] || GEM_COLORS.blue;
  const gradId = React.useId();
  const baseFill = `url(#${gradId})`;
  // A darker stroke gives the gem a clear comic-style edge against the
  // board. White rim is drawn on top via the gloss highlight.
  const stroke = c.dark;

  return (
    <div style={{
      width: size, height: size, position: 'relative', display: 'inline-block',
      animation: idle ? `dp-shine ${2200 + (size % 7) * 130}ms ease-in-out infinite` : 'none',
      ...style,
    }}>
      {selected && (
        <div style={{
          position: 'absolute', inset: -4,
          border: '3px solid #fff',
          borderRadius: '50%',
          boxShadow: '0 0 0 3px var(--w-accent), 0 0 18px rgba(255,255,255,0.7)',
          animation: 'dp-pulse 900ms ease-in-out infinite',
        }} />
      )}
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id={gradId} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor={c.light} stopOpacity="1" />
            <stop offset="55%" stopColor={c.hue} stopOpacity="1" />
            <stop offset="100%" stopColor={c.dark} stopOpacity="1" />
          </radialGradient>
        </defs>
        {/* soft drop-shadow disc below the gem */}
        <ellipse cx="50" cy="92" rx="30" ry="5" fill="rgba(27, 19, 64, 0.28)" />
        {/* dark outline under the white rim — comic-style edge */}
        {gemShape(type, c.dark, c.dark, 9)}
        {gemShape(type, baseFill, '#fff', 3.5)}
        {/* gloss highlight (top-left blob) */}
        <ellipse cx="36" cy="32" rx="14" ry="9"
                 fill="rgba(255,255,255,0.78)"
                 transform="rotate(-22 36 32)" />
        {/* tiny sparkle */}
        <circle cx="62" cy="26" r="2.6" fill="rgba(255,255,255,0.95)" />

        {/* Special overlays */}
        {special === 'line' && (
          <g>
            <rect x="6" y="44" width="88" height="12" rx="6"
                  fill="url(#rb)" opacity="0.92" />
            <defs>
              <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF3D78" />
                <stop offset="25%" stopColor="#FFC233" />
                <stop offset="50%" stopColor="#34C04E" />
                <stop offset="75%" stopColor="#2EB3F8" />
                <stop offset="100%" stopColor="#8B5DFF" />
              </linearGradient>
            </defs>
          </g>
        )}
        {special === 'bomb' && (
          <g>
            <Star cx={50} cy={50} r={14} fill="#fff" stroke={c.dark} strokeWidth={1.5} />
            <circle cx={50} cy={50} r={5} fill={c.dark} />
          </g>
        )}
        {special === 'color' && (
          <g style={{ transformOrigin: '50px 50px', animation: 'dp-spin-slow 6s linear infinite' }}>
            <Star cx={50} cy={50} r={18} fill="rgba(255,255,255,0.92)" stroke={c.dark} strokeWidth={1} />
          </g>
        )}
      </svg>
    </div>
  );
}

// Simple 5-point star helper used inside SVGs.
function Star({ cx = 50, cy = 50, r = 18, fill = '#FFD84D', stroke = 'none', strokeWidth = 0 }) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (-90 + i * 36) * Math.PI / 180;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push((cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2));
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
}

// Standalone star sticker (for HUD, level nodes, results).
function StarSticker({ size = 32, filled = true, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible', ...style }}>
      <defs>
        <radialGradient id={'sf' + size} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF6BB" />
          <stop offset="60%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#E0A21A" />
        </radialGradient>
      </defs>
      {filled ? (
        <>
          <Star cx={50} cy={52} r={42} fill={`url(#sf${size})`} stroke="#fff" strokeWidth={6} />
          <ellipse cx="38" cy="34" rx="10" ry="6" fill="rgba(255,255,255,0.7)" transform="rotate(-22 38 34)" />
        </>
      ) : (
        <Star cx={50} cy={52} r={42} fill="#E7E1F5" stroke="#fff" strokeWidth={6} />
      )}
    </svg>
  );
}

// Lumi — friendly star-orb sprite. Two pastel wings, soft glow, big eyes.
function Lumi({ size = 80, idle = true, style = {} }) {
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      animation: idle ? 'dp-float 3.6s ease-in-out infinite' : 'none',
      ...style,
    }}>
      <svg viewBox="0 0 120 120" width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="lumi-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF6BB" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#FFD84D" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFD84D" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lumi-body" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#FFE89A" />
            <stop offset="100%" stopColor="#FFC448" />
          </radialGradient>
        </defs>
        {/* aura */}
        <circle cx="60" cy="60" r="58" fill="url(#lumi-glow)" />
        {/* wings */}
        <path d="M22 56 C 4 44, 6 72, 26 70 Z" fill="#FFD7EE" stroke="#fff" strokeWidth="3" />
        <path d="M98 56 C 116 44, 114 72, 94 70 Z" fill="#FFD7EE" stroke="#fff" strokeWidth="3" />
        {/* body */}
        <circle cx="60" cy="60" r="32" fill="url(#lumi-body)" stroke="#fff" strokeWidth="4" />
        {/* eyes */}
        <ellipse cx="50" cy="60" rx="3.4" ry="5" fill="#2B2550" />
        <ellipse cx="70" cy="60" rx="3.4" ry="5" fill="#2B2550" />
        <circle cx="51.2" cy="58" r="1.2" fill="#fff" />
        <circle cx="71.2" cy="58" r="1.2" fill="#fff" />
        {/* smile */}
        <path d="M53 70 Q 60 76 67 70" stroke="#2B2550" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* cheek blush */}
        <circle cx="46" cy="68" r="2.6" fill="#FF9DBE" opacity="0.7" />
        <circle cx="74" cy="68" r="2.6" fill="#FF9DBE" opacity="0.7" />
        {/* head sparkle */}
        <circle cx="48" cy="42" r="2.4" fill="#fff" />
      </svg>
    </div>
  );
}

// Soft background atmosphere (clouds + bubbles + stars). One layer; uses
// absolute-positioned blobs and floats lazily.
function DreamSky({ density = 1 }) {
  const stars = [
    { x: 12, y: 110, s: 10, d: 0 },
    { x: 320, y: 80, s: 14, d: 600 },
    { x: 70, y: 220, s: 8, d: 1100 },
    { x: 340, y: 360, s: 11, d: 300 },
    { x: 20, y: 520, s: 9, d: 900 },
    { x: 350, y: 620, s: 7, d: 200 },
    { x: 200, y: 740, s: 9, d: 500 },
  ];
  const bubbles = [
    { x: 60, y: 380, r: 30 },
    { x: 290, y: 460, r: 22 },
    { x: 30, y: 660, r: 18 },
    { x: 330, y: 720, r: 26 },
  ];
  const clouds = [
    { x: -30, y: 140, w: 170 },
    { x: 250, y: 280, w: 200 },
    { x: -20, y: 600, w: 180 },
    { x: 240, y: 540, w: 150 },
  ];
  return (
    <>
      {clouds.map((c, i) => (
        <Cloud key={'c' + i} x={c.x} y={c.y} w={c.w}
               style={{ animation: `dp-float ${5 + (i % 3)}s ease-in-out infinite`, opacity: 0.85 }} />
      ))}
      {bubbles.map((b, i) => (
        <div key={'b' + i} style={{
          position: 'absolute', left: b.x, top: b.y,
          width: b.r * 2, height: b.r * 2, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15) 60%, rgba(255,255,255,0) 75%)',
          border: '1.5px solid rgba(255,255,255,0.7)',
          animation: `dp-float ${4 + i}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
      ))}
      {stars.map((st, i) => (
        <div key={'s' + i} style={{
          position: 'absolute', left: st.x, top: st.y,
          animation: `dp-shine ${2000 + i * 240}ms ease-in-out infinite`,
          animationDelay: st.d + 'ms',
          pointerEvents: 'none',
        }}>
          <StarSticker size={st.s} />
        </div>
      ))}
    </>
  );
}

function Cloud({ x = 0, y = 0, w = 180, style = {} }) {
  const h = w * 0.55;
  return (
    <svg width={w} height={h} viewBox="0 0 180 100" style={{
      position: 'absolute', left: x, top: y, pointerEvents: 'none', ...style,
    }}>
      <path d="M30 70 Q 10 70 10 52 Q 10 36 30 36 Q 32 18 56 22 Q 64 4 90 10 Q 116 4 124 22 Q 150 18 152 38 Q 174 38 174 56 Q 174 76 152 76 L 30 76 Q 26 76 30 70 Z"
            fill="rgba(255,255,255,0.95)" stroke="rgba(43,37,80,0.05)" strokeWidth="1" />
    </svg>
  );
}

// Confetti bits for the level-complete screen.
function ConfettiBurst({ count = 30, seed = 1 }) {
  const colors = ['#FF5C8A', '#65D96E', '#4FC3FF', '#FFD84D', '#B28DFF', '#FF9F43'];
  const items = [];
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i++) {
    const left = rand() * 100;
    const top = rand() * 100;
    const color = colors[Math.floor(rand() * colors.length)];
    const rot = rand() * 360;
    const size = 6 + rand() * 10;
    const isStar = rand() > 0.6;
    const dur = 2400 + rand() * 1800;
    items.push(
      <div key={i} style={{
        position: 'absolute', left: left + '%', top: top + '%',
        transform: `rotate(${rot}deg)`,
        animation: `dp-float ${dur}ms ease-in-out infinite`,
        animationDelay: -rand() * dur + 'ms',
        pointerEvents: 'none',
      }}>
        {isStar ? (
          <StarSticker size={size} />
        ) : (
          <div style={{
            width: size * 1.4, height: size * 0.5, background: color, borderRadius: '999px',
            boxShadow: '0 2px 4px rgba(43,37,80,0.18)',
          }} />
        )}
      </div>
    );
  }
  return <>{items}</>;
}

// Status bar (light) for use inside the phone shell.
function PhoneStatus({ time = '9:41', dark = false }) {
  const col = dark ? '#fff' : '#2B2550';
  return (
    <div className="phone-status" style={{ color: col }}>
      <span>{time}</span>
      <span className="ind">
        <svg width="17" height="11" viewBox="0 0 17 11"><g fill={col}>
          <rect x="0" y="6" width="3" height="5" rx="0.6"/>
          <rect x="4.5" y="4" width="3" height="7" rx="0.6"/>
          <rect x="9" y="2" width="3" height="9" rx="0.6"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.6"/>
        </g></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><g fill={col}>
          <path d="M8 3C10.2 3 12.2 3.9 13.6 5.3L14.7 4.2C12.9 2.4 10.5 1.3 8 1.3C5.5 1.3 3.1 2.4 1.3 4.2L2.4 5.3C3.8 3.9 5.8 3 8 3Z"/>
          <path d="M8 6.4C9.3 6.4 10.5 6.9 11.3 7.8L12.3 6.7C11.1 5.6 9.6 4.9 8 4.9C6.4 4.9 4.9 5.6 3.7 6.7L4.7 7.8C5.5 6.9 6.7 6.4 8 6.4Z"/>
          <circle cx="8" cy="9.8" r="1.3"/>
        </g></svg>
        <svg width="25" height="12" viewBox="0 0 25 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke={col} strokeOpacity="0.45" fill="none"/>
          <rect x="2" y="2" width="18" height="8" rx="1.8" fill={col}/>
          <path d="M23 4.2V7.8C23.6 7.5 24 7 24 6C24 5 23.6 4.5 23 4.2Z" fill={col} fillOpacity="0.5"/>
        </svg>
      </span>
    </div>
  );
}

Object.assign(window, {
  Gem, GEM_COLORS, Lumi, StarSticker, Star, DreamSky, Cloud,
  ConfettiBurst, PhoneStatus,
});
