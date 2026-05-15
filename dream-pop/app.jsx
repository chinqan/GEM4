// Dream Pop Gems — app entrypoint.
// Five mobile artboards arranged in a Design Canvas. Each artboard is a
// self-contained Phone with its own navigation state, so the user can
// flow through screens *inside* a single artboard (Main Menu → World Map
// → Game → Pause / Level Complete) or compare all five side-by-side.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "world": "w1",
  "font": "Fredoka",
  "stickerStroke": 3,
  "shadowIntensity": 1,
  "showLumi": true,
  "vibrance": "vivid"
}/*EDITMODE-END*/;

const SCREEN_LIST = [
  { id: 'menu',     title: '01 · Main Menu',       label: 'Main Menu' },
  { id: 'map',      title: '02 · World Map',       label: 'World Map' },
  { id: 'game',     title: '03 · Game Screen',     label: 'Game · HUD + 8×8 Board' },
  { id: 'pause',    title: '04 · Pause Modal',     label: 'Pause' },
  { id: 'complete', title: '05 · Level Complete',  label: 'Level Complete' },
];

// One artboard = one fresh app instance starting on a given screen. State
// lives inside; clicking buttons navigates within this artboard only.
function PhoneApp({ initial = 'menu', sharedWorld, sharedFont, sharedStroke, sharedShadow, sharedVibrance }) {
  const [screen, setScreen] = React.useState(initial);
  const [level, setLevel] = React.useState(6);
  // Each artboard has its own world override, but defaults to the global
  // (Tweaks-controlled) world.
  const [world, setWorldLocal] = React.useState(sharedWorld);
  React.useEffect(() => { setWorldLocal(sharedWorld); }, [sharedWorld]);

  const go = (next, opts = {}) => {
    if (opts.level) setLevel(opts.level);
    setScreen(next);
  };

  const fontStyle = {
    '--font-display': sharedFont === 'Baloo' ? "'Baloo 2', 'Noto Sans TC', sans-serif" : "'Fredoka', 'Noto Sans TC', sans-serif",
    '--stroke-w': sharedStroke + 'px',
    '--shadow-z1': sharedVibrance === 'soft'
      ? `0 ${4 * sharedShadow}px ${8 * sharedShadow}px rgba(64, 50, 110, ${0.18 * sharedShadow})`
      : `0 ${4 * sharedShadow}px 0 rgba(27, 19, 64, ${0.22 * sharedShadow}), 0 ${6 * sharedShadow}px ${12 * sharedShadow}px rgba(27, 19, 64, ${0.18 * sharedShadow})`,
    '--shadow-z2': sharedVibrance === 'soft'
      ? `0 ${8 * sharedShadow}px ${18 * sharedShadow}px rgba(64, 50, 110, ${0.18 * sharedShadow})`
      : `0 ${6 * sharedShadow}px 0 rgba(27, 19, 64, ${0.22 * sharedShadow}), 0 ${10 * sharedShadow}px ${20 * sharedShadow}px rgba(27, 19, 64, ${0.20 * sharedShadow})`,
    '--shadow-z3': sharedVibrance === 'soft'
      ? `0 ${12 * sharedShadow}px ${28 * sharedShadow}px rgba(64, 50, 110, ${0.22 * sharedShadow})`
      : `0 ${10 * sharedShadow}px 0 rgba(27, 19, 64, ${0.20 * sharedShadow}), 0 ${16 * sharedShadow}px ${32 * sharedShadow}px rgba(27, 19, 64, ${0.28 * sharedShadow})`,
    height: '100%',
  };

  let node = null;
  if (screen === 'menu') node = <MainMenu go={go} world={world} />;
  else if (screen === 'map') node = <WorldMap go={go} world={world} setWorld={setWorldLocal} level={level} />;
  else if (screen === 'game') node = <GameScreen go={go} world={world} level={level} />;
  else if (screen === 'pause') node = <PauseScreen go={go} world={world} level={level} />;
  else if (screen === 'complete') node = <LevelComplete go={go} world={world} level={level} />;

  return <div data-vibrance={sharedVibrance} style={fontStyle}>{node}</div>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <DesignCanvas>
        <DCSection id="flow" title="Dream Pop Gems · 寶石消除 Mobile Flow"
                   subtitle="點任一畫面內的按鈕可實際跳轉；五個畫面為同一原型的不同入口">
          {SCREEN_LIST.map((s) => (
            <DCArtboard key={s.id} id={s.id} label={s.title} width={390} height={844}>
              <PhoneApp initial={s.id}
                        sharedWorld={t.world}
                        sharedFont={t.font}
                        sharedStroke={t.stickerStroke}
                        sharedShadow={t.shadowIntensity}
                        sharedVibrance={t.vibrance} />
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="色彩飽和度" />
        <TweakRadio
          label="Vibrance"
          value={t.vibrance}
          options={['vivid', 'soft']}
          onChange={(v) => setTweak('vibrance', v)} />

        <TweakSection label="World 主題色" />
        <TweakRadio
          label="World"
          value={t.world}
          options={[
            { value: 'w1', label: 'W1 花園' },
            { value: 'w2', label: 'W2 水晶' },
            { value: 'w3', label: 'W3 糖果' },
            { value: 'w4', label: 'W4 樂園' },
          ]}
          onChange={(v) => setTweak('world', v)} />

        <TweakSection label="Typography" />
        <TweakRadio
          label="Display"
          value={t.font}
          options={['Fredoka', 'Baloo']}
          onChange={(v) => setTweak('font', v)} />

        <TweakSection label="Sticker 強度" />
        <TweakSlider label="描邊粗細" value={t.stickerStroke}
                     min={1} max={6} step={1} unit="px"
                     onChange={(v) => setTweak('stickerStroke', v)} />
        <TweakSlider label="陰影強度" value={t.shadowIntensity}
                     min={0} max={2} step={0.1} unit="x"
                     onChange={(v) => setTweak('shadowIntensity', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
