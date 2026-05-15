---
inclusion: fileMatch
fileMatchPattern: '**/rendering/**,**/ui/**'
---

# PixiJS CSS Styling Adapter

When translating CSS/Figma prototypes into PixiJS, you are transitioning from a **declarative model** to an **imperative model**. You MUST strictly follow these rules to avoid rendering bugs, memory leaks, and layout shifts.

## 0. Strict Fidelity & V8 API Adherence (Crucial)

- **Strict V8 API:** You MUST generate code exclusively for PixiJS v8. For `Graphics`, strictly use the modern API (e.g., `graphics.rect(x, y, w, h).fill(color)`). Do NOT use deprecated v7 methods like `beginFill()` or `endFill()`.
- **Do NOT over-interpret:** Implement exactly what is in the CSS/prototype. Do not add unprompted visual enhancements (e.g., simulated highlights, extra offsets) unless explicitly defined in the source.
- **Complete Attribute Parsing:** Read ALL attributes of a CSS class (including default `font-size`, `padding`) before calculating final dimensions.

## 1. Layout & Coordinates (Responsive Sizing)

- **Explicit Dimensions:** PixiJS requires explicit pixel values. Do not rely on implicit CSS sizing. Pre-calculate final `px` dimensions (e.g., element height = font-size + padding*2) before rendering.
- **Coordinate System Inversion:** CSS `bottom: Xpx` measures from the bottom up. PixiJS `y` measures from the top down. You MUST calculate: `y = containerHeight - (bottomOffset * scaleY) - elementHeight`.
- **Scaling Factors:** For non-standard screens (e.g., base 390x844), always apply scaling factors `sx`, `sy`, and `s = Math.min(sx, sy)` to all positions and sizes.

## 2. Gradients & Colors

- **Native Gradients:** Use `FillGradient` for smooth gradients. DO NOT use rect strips to simulate gradients.
- **Texture Space:** When applying `FillGradient`, you MUST set `textureSpace: 'local'` and use normalized coordinates (0 to 1) for start/end points.
- **Color Formatting:** Convert CSS hex numbers to strings using `hexToCSS()` (e.g., `0xFF3D8E` -> `'#ff3d8e'`) for color stops.
- **Unsupported CSS Functions:** PixiJS does not support `color-mix()`. You must manually pre-calculate the mixed hex color using a lerp function.

## 3. Shadows & Borders (Graphics Routing)

- **Soft Shadows:** Do not use hard-edged Graphics to simulate CSS `box-shadow` blur. You MUST use a separate `Graphics` or `Text` object combined with `BlurFilter`.
- **Border vs. Outline:** CSS `border` and `outline` are distinct. Draw them as separate stroke layers.
- **Visibility:** Ensure shadows are offset correctly or have sufficient alpha so they are not completely occluded by the main body Graphic.

## 4. Z-Order (Drawing Sequence)

- **Manual Ordering:** CSS layers automatically (shadow -> bg -> border -> outline -> content). In PixiJS, the order of `addChild` dictates the Z-order.
- **Execution Strategy:** You MUST `addChild` in the exact bottom-to-top visual order. If using multiple shapes inside a single `Graphics` instance, draw the bottom-most elements first. If effects (like blur) require isolation, use separate Containers.

## 5. Animations & Memory Management

- **Ticker Binding:** Objects with a `tick()` or update method MUST be explicitly hooked to `Ticker.shared.add(fn)`.
- **Relative Animation Positioning:** Never override an object's external position with an absolute animation value. Always store the `baseY` or `baseX` and apply animation as `basePosition + offset`.
- **Complete Keyframes:** Translate ALL steps of a `@keyframes` animation, not just the floating transitions.
- **Memory Leak Prevention:** You MUST remove the Ticker callback when the container is destroyed: `container.on('destroyed', () => Ticker.shared.remove(fn))`.

## 6. Masking & Overflow

- **Clipping Limits:** When simulating CSS `overflow: hidden` or complex `border-radius` clipping, you MUST create a separate `Graphics` shape, draw the required boundary, and assign it to the container's `.mask` property. Do not attempt to clip using textures alone.

## 7. Text Styling

- **Typography Mapping:** Translate CSS `line-height`, `letter-spacing`, and `font-weight` explicitly into a PixiJS `TextStyle` object.
- **Padding Adjustments:** Note that native PixiJS `Text` padding works differently than CSS padding; if custom fonts get clipped, manually adjust the `padding` property within the `TextStyle`.

## 8. Interactions (Hover & Active States)

- **Event Binding:** To simulate CSS `:hover` or `:active` states, you MUST set `eventMode = 'static'` (or `'pointer'`) on the target display object and bind explicit event listeners (e.g., `pointerover`, `pointerdown`) to trigger the visual changes.
