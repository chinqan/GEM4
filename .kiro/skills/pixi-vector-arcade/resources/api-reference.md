# PixiJS v8 API Quick Reference

> Covers GC, Texture lifecycle, BitmapText, BlendModes, Events optimization, Scene Graph, and Ticker details.

---

## Garbage Collection (TextureGCSystem)

Automatic GC removes textures unused for ~1 minute. Configurable:

```typescript
await app.init({
  textureGCActive: true,
  textureGCMaxIdle: 7200,        // frames before texture eligible for GC
  textureGCCheckCountMax: 1200,  // frames between GC sweeps
});
```

- Use `texture.source.unload()` to manually unload from GPU (keeps in memory)
- Use `texture.destroy()` to fully destroy
- If destroying many textures at once, add random delays to avoid frame spikes

---

## Texture Lifecycle

```
Source File → TextureSource → Texture → Sprite
```

- `await Assets.load('image.png')` — load texture
- `Texture.from(resource)` — create from loaded resource (**NOT from URL in v8!**)
- `app.renderer.generateTexture({ target: container })` — render to texture
- `texture.destroy()` / `Assets.unload('image.png')` — free memory
- `texture.source.unload()` — unload from GPU but keep in memory
- `texture.source.scaleMode`: `'linear'` | `'nearest'`
- `texture.source.wrapMode`: `'clamp-to-edge'` | `'repeat'` | `'mirror-repeat'`

---

## BitmapText (High Performance Text)

Best for frequently updating text (scores, HP, timers):

```typescript
const text = new BitmapText({
  text: 'Score: 0',
  style: { fontFamily: 'MyFont', fontSize: 32, fill: '#ffcc00' },
});
```

- ✅ No per-frame rasterization — text changes are cheap
- ✅ Shares glyph textures for efficiency
- ⚠️ Not suitable for CJK/emoji — use `Text` for those
- Canvas `Text` re-rasterizes on every change — **avoid updating every frame**

---

## BlendModes & Batching

- Different blend modes **break batches** (de-optimize draw calls)
- Group objects with the same blend mode together
- Order matters: `sprite / sprite / graphic / graphic` > `sprite / graphic / sprite / graphic`

---

## Events Optimization

```typescript
// Skip event traversal for non-interactive containers
container.interactiveChildren = false;

// Use explicit hit areas to avoid shape crawling
sprite.hitArea = new Rectangle(0, 0, width, height);
```

---

## Scene Graph Tips

- Root = `app.stage`
- Parent transforms cascade to children (position, rotation, scale, alpha)
- Render order = tree insertion order (later children render on top)
- `container.sortableChildren = true` + `child.zIndex = N` for custom ordering
- `container.cullable = true` for automatic viewport culling

---

## Ticker Details

```typescript
app.ticker.add((ticker) => {
  ticker.deltaTime;    // scaled frame delta (1.0 at 60fps)
  ticker.elapsedMS;    // unscaled delta in ms
  ticker.maxFPS = 60;  // limit framerate
});
```
