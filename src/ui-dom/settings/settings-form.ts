// ─── 33.1–33.7 設定畫面（DOM overlay） ──────────────────────
// DOM-based settings form with sections:
// - Audio (master/music/sfx sliders + mute)
// - Graphics (preset + reduce motion)
// - Accessibility (color blind mode, high contrast, long press confirm)
// - Gameplay (hint delay, auto-activate special)
// - Language
// - Keybinds

import type { Settings, AudioSettings, GraphicsPreset, AccessibilitySettings, GameplaySettings } from '../../state/save-state';
import type { KeyAction, KeybindMap } from '../../input/keybinds';
import { ALL_KEY_ACTIONS } from '../../input/keybinds';

// ─── 回呼介面 ──────────────────────────────────────────────

export interface SettingsFormCallbacks {
  onAudioChange?: (audio: AudioSettings) => void;
  onGraphicsPresetChange?: (preset: GraphicsPreset) => void;
  onReduceMotionChange?: (enabled: boolean) => void;
  onAccessibilityChange?: (accessibility: AccessibilitySettings) => void;
  onGameplayChange?: (gameplay: GameplaySettings) => void;
  onLanguageChange?: (language: string) => void;
  onKeybindChange?: (action: KeyAction, keys: string[]) => void;
  onClose?: () => void;
}

// ─── CSS 樣式 ──────────────────────────────────────────────

const SETTINGS_CSS = `
.gem-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(11, 16, 38, 0.85);
  font-family: Inter, "Noto Sans CJK TC", sans-serif;
  color: #fff;
}

.gem-settings-panel {
  background: #1a2040;
  border-radius: 20px;
  padding: 32px;
  width: 520px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.gem-settings-panel h2 {
  font-family: Cinzel, "Noto Serif CJK TC", serif;
  font-size: 28px;
  margin: 0 0 24px 0;
  text-align: center;
  color: #f6c453;
}

.gem-settings-section {
  margin-bottom: 24px;
}

.gem-settings-section h3 {
  font-size: 16px;
  color: #d5d9e8;
  margin: 0 0 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
}

.gem-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.gem-settings-row label {
  font-size: 14px;
  color: #d5d9e8;
  flex-shrink: 0;
  margin-right: 16px;
}

.gem-settings-row input[type="range"] {
  flex: 1;
  max-width: 200px;
  accent-color: #f6c453;
}

.gem-settings-row select {
  background: #0b1026;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
}

.gem-settings-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #f6c453;
  cursor: pointer;
}

.gem-settings-row input[type="number"] {
  background: #0b1026;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 14px;
  width: 80px;
  text-align: center;
}

.gem-settings-value {
  font-size: 13px;
  color: #8c93ad;
  min-width: 36px;
  text-align: right;
}

.gem-keybind-btn {
  background: #0b1026;
  color: #d5d9e8;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  min-width: 100px;
  text-align: center;
  transition: border-color 0.15s;
}

.gem-keybind-btn:hover {
  border-color: #f6c453;
}

.gem-keybind-btn.binding {
  border-color: #f6c453;
  color: #f6c453;
  animation: gem-pulse 0.8s ease-in-out infinite;
}

@keyframes gem-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.gem-settings-close {
  display: block;
  margin: 16px auto 0;
  background: #f6c453;
  color: #0b1026;
  border: none;
  border-radius: 12px;
  padding: 12px 48px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.15s;
}

.gem-settings-close:hover {
  opacity: 0.85;
}
`;

// ─── SettingsForm 類別 ─────────────────────────────────────

/**
 * DOM overlay 設定表單。
 *
 * 建立一個全螢幕 DOM overlay，包含所有設定區段。
 * 變更立即透過回呼通知外部。
 */
export class SettingsForm {
  private root: HTMLDivElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private settings: Settings;
  private keybinds: KeybindMap;
  private reduceMotion: boolean;
  private callbacks: SettingsFormCallbacks;
  private bindingAction: KeyAction | null = null;
  private bindingButton: HTMLButtonElement | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    settings: Settings,
    keybinds: KeybindMap,
    reduceMotion: boolean,
    callbacks: SettingsFormCallbacks,
  ) {
    this.settings = { ...settings };
    this.keybinds = { ...keybinds };
    this.reduceMotion = reduceMotion;
    this.callbacks = callbacks;
  }

  /** 顯示設定表單 */
  show(): void {
    if (this.root) return;

    // Play modal open sound
    import('../../audio/sfx-player').then(({ playModalOpen }) => playModalOpen());

    // 注入 CSS
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = SETTINGS_CSS;
    document.head.appendChild(this.styleEl);

    // 建立 overlay
    this.root = document.createElement('div');
    this.root.className = 'gem-settings-overlay';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Settings');

    const panel = document.createElement('div');
    panel.className = 'gem-settings-panel';

    // 標題
    const title = document.createElement('h2');
    title.textContent = 'Settings';
    panel.appendChild(title);

    // 33.2 音訊設定
    panel.appendChild(this.createAudioSection());

    // 33.3 圖形設定
    panel.appendChild(this.createGraphicsSection());

    // 33.4 無障礙設定
    panel.appendChild(this.createAccessibilitySection());

    // 33.5 遊玩設定
    panel.appendChild(this.createGameplaySection());

    // 33.6 語言切換
    panel.appendChild(this.createLanguageSection());

    // 33.7 快捷鍵配置
    panel.appendChild(this.createKeybindSection());

    // 關閉按鈕
    const closeBtn = document.createElement('button');
    closeBtn.className = 'gem-settings-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.hide());
    panel.appendChild(closeBtn);

    this.root.appendChild(panel);

    // 點擊 overlay 背景關閉
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.hide();
    });

    document.body.appendChild(this.root);
  }

  /** 隱藏設定表單 */
  hide(): void {
    this.cancelBinding();

    // Play modal close sound
    import('../../audio/sfx-player').then(({ playModalClose }) => playModalClose());

    if (this.root) {
      this.root.remove();
      this.root = null;
    }
    if (this.styleEl) {
      this.styleEl.remove();
      this.styleEl = null;
    }
    this.callbacks.onClose?.();
  }

  /** 是否正在顯示 */
  get isVisible(): boolean {
    return this.root !== null;
  }

  /** 銷毀 */
  dispose(): void {
    this.hide();
  }

  // ─── 33.2 音訊設定 ──────────────────────────────────

  private createAudioSection(): HTMLElement {
    const section = this.createSection('Audio');

    // Master Volume
    section.appendChild(
      this.createSliderRow('Master Volume', this.settings.audio.masterVolume, (v) => {
        this.settings.audio.masterVolume = v;
        this.callbacks.onAudioChange?.(this.settings.audio);
      }),
    );

    // Music Volume
    section.appendChild(
      this.createSliderRow('Music Volume', this.settings.audio.musicVolume, (v) => {
        this.settings.audio.musicVolume = v;
        this.callbacks.onAudioChange?.(this.settings.audio);
      }),
    );

    // SFX Volume
    section.appendChild(
      this.createSliderRow('SFX Volume', this.settings.audio.sfxVolume, (v) => {
        this.settings.audio.sfxVolume = v;
        this.callbacks.onAudioChange?.(this.settings.audio);
      }),
    );

    // Mute
    section.appendChild(
      this.createCheckboxRow('Mute All', this.settings.audio.muted, (v) => {
        this.settings.audio.muted = v;
        this.callbacks.onAudioChange?.(this.settings.audio);
      }),
    );

    return section;
  }

  // ─── 33.3 圖形設定 ──────────────────────────────────

  private createGraphicsSection(): HTMLElement {
    const section = this.createSection('Graphics');

    // Preset
    section.appendChild(
      this.createSelectRow(
        'Quality Preset',
        this.settings.graphicsPreset,
        [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
        (v) => {
          this.settings.graphicsPreset = v as GraphicsPreset;
          this.callbacks.onGraphicsPresetChange?.(this.settings.graphicsPreset);
        },
      ),
    );

    // Reduce Motion
    section.appendChild(
      this.createCheckboxRow('Reduce Motion', this.reduceMotion, (v) => {
        this.reduceMotion = v;
        this.callbacks.onReduceMotionChange?.(v);
      }),
    );

    return section;
  }

  // ─── 33.4 無障礙設定 ────────────────────────────────

  private createAccessibilitySection(): HTMLElement {
    const section = this.createSection('Accessibility');

    // Color Blind Mode
    section.appendChild(
      this.createSelectRow(
        'Color Blind Mode',
        this.settings.accessibility.colorBlindMode,
        [
          { value: 'none', label: 'None' },
          { value: 'deuteranopia', label: 'Deuteranopia (Green)' },
          { value: 'protanopia', label: 'Protanopia (Red)' },
          { value: 'tritanopia', label: 'Tritanopia (Blue)' },
        ],
        (v) => {
          this.settings.accessibility.colorBlindMode = v as AccessibilitySettings['colorBlindMode'];
          this.callbacks.onAccessibilityChange?.(this.settings.accessibility);
        },
      ),
    );

    // High Contrast
    section.appendChild(
      this.createCheckboxRow('High Contrast', this.settings.accessibility.highContrast, (v) => {
        this.settings.accessibility.highContrast = v;
        this.callbacks.onAccessibilityChange?.(this.settings.accessibility);
      }),
    );

    // Long Press Confirm
    section.appendChild(
      this.createCheckboxRow('Long Press Confirm', this.settings.accessibility.longPressConfirm, (v) => {
        this.settings.accessibility.longPressConfirm = v;
        this.callbacks.onAccessibilityChange?.(this.settings.accessibility);
      }),
    );

    return section;
  }

  // ─── 33.5 遊玩設定 ──────────────────────────────────

  private createGameplaySection(): HTMLElement {
    const section = this.createSection('Gameplay');

    // Hint Delay
    const row = document.createElement('div');
    row.className = 'gem-settings-row';
    const label = document.createElement('label');
    label.textContent = 'Hint Delay (ms)';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '30000';
    input.step = '1000';
    input.value = String(this.settings.gameplay.hintDelayMs);
    input.addEventListener('change', () => {
      const val = Math.max(0, Math.min(30000, parseInt(input.value, 10) || 0));
      input.value = String(val);
      this.settings.gameplay.hintDelayMs = val;
      this.callbacks.onGameplayChange?.(this.settings.gameplay);
    });
    row.appendChild(label);
    row.appendChild(input);
    section.appendChild(row);

    // Auto-activate Special
    section.appendChild(
      this.createCheckboxRow('Auto-activate Special Gems', this.settings.gameplay.autoActivateSpecial, (v) => {
        this.settings.gameplay.autoActivateSpecial = v;
        this.callbacks.onGameplayChange?.(this.settings.gameplay);
      }),
    );

    // Show Debug Panel
    section.appendChild(
      this.createCheckboxRow('Show Debug Panel', this.settings.gameplay.showDebugPanel, (v) => {
        this.settings.gameplay.showDebugPanel = v;
        this.callbacks.onGameplayChange?.(this.settings.gameplay);
        // Toggle debug panel visibility at runtime
        const gem = (window as any).__gem;
        if (gem?.setDebugVisible) gem.setDebugVisible(v);
      }),
    );

    return section;
  }

  // ─── 33.6 語言切換 ──────────────────────────────────

  private createLanguageSection(): HTMLElement {
    const section = this.createSection('Language');

    section.appendChild(
      this.createSelectRow(
        'Language',
        this.settings.language,
        [
          { value: 'zh-TW', label: '繁體中文' },
          { value: 'en', label: 'English' },
        ],
        (v) => {
          this.settings.language = v;
          this.callbacks.onLanguageChange?.(v);
        },
      ),
    );

    return section;
  }

  // ─── 33.7 快捷鍵配置 ────────────────────────────────

  private createKeybindSection(): HTMLElement {
    const section = this.createSection('Keybinds');

    const actionLabels: Record<KeyAction, string> = {
      moveUp: 'Move Up',
      moveDown: 'Move Down',
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      select: 'Select / Swap',
      pause: 'Pause',
      mute: 'Mute',
      focusNext: 'Focus Next',
      focusPrev: 'Focus Previous',
    };

    for (const action of ALL_KEY_ACTIONS) {
      const row = document.createElement('div');
      row.className = 'gem-settings-row';

      const label = document.createElement('label');
      label.textContent = actionLabels[action];

      const btn = document.createElement('button');
      btn.className = 'gem-keybind-btn';
      btn.textContent = this.keybinds[action]?.join(', ') || '(none)';
      btn.addEventListener('click', () => {
        this.startBinding(action, btn);
      });

      row.appendChild(label);
      row.appendChild(btn);
      section.appendChild(row);
    }

    return section;
  }

  // ─── Press-to-bind ──────────────────────────────────

  private startBinding(action: KeyAction, btn: HTMLButtonElement): void {
    this.cancelBinding();
    this.bindingAction = action;
    this.bindingButton = btn;
    btn.classList.add('binding');
    btn.textContent = 'Press a key...';

    this.keydownHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        this.cancelBinding();
        return;
      }

      const keyCode = e.code === 'Tab' && e.shiftKey ? 'ShiftTab' : e.code;

      // Remove this key from other actions
      for (const a of ALL_KEY_ACTIONS) {
        this.keybinds[a] = (this.keybinds[a] || []).filter((k) => k !== keyCode);
      }

      // Set new binding
      this.keybinds[action] = [keyCode];
      btn.textContent = keyCode;
      btn.classList.remove('binding');

      this.callbacks.onKeybindChange?.(action, this.keybinds[action]);
      this.cleanupBinding();
    };

    document.addEventListener('keydown', this.keydownHandler, { capture: true });
  }

  private cancelBinding(): void {
    if (this.bindingButton && this.bindingAction) {
      this.bindingButton.classList.remove('binding');
      this.bindingButton.textContent =
        this.keybinds[this.bindingAction]?.join(', ') || '(none)';
    }
    this.cleanupBinding();
  }

  private cleanupBinding(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, { capture: true });
      this.keydownHandler = null;
    }
    this.bindingAction = null;
    this.bindingButton = null;
  }

  // ─── 共用 DOM 建構輔助 ──────────────────────────────

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'gem-settings-section';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    section.appendChild(h3);
    return section;
  }

  private createSliderRow(
    labelText: string,
    initialValue: number,
    onChange: (value: number) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'gem-settings-row';

    const label = document.createElement('label');
    label.textContent = labelText;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = String(initialValue);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'gem-settings-value';
    valueDisplay.textContent = `${Math.round(initialValue * 100)}%`;

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueDisplay.textContent = `${Math.round(v * 100)}%`;
      onChange(v);
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valueDisplay);
    return row;
  }

  private createCheckboxRow(
    labelText: string,
    initialValue: boolean,
    onChange: (value: boolean) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'gem-settings-row';

    const label = document.createElement('label');
    label.textContent = labelText;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialValue;
    checkbox.addEventListener('change', () => {
      onChange(checkbox.checked);
    });

    row.appendChild(label);
    row.appendChild(checkbox);
    return row;
  }

  private createSelectRow(
    labelText: string,
    initialValue: string,
    options: Array<{ value: string; label: string }>,
    onChange: (value: string) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'gem-settings-row';

    const label = document.createElement('label');
    label.textContent = labelText;

    const select = document.createElement('select');
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === initialValue) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      onChange(select.value);
    });

    row.appendChild(label);
    row.appendChild(select);
    return row;
  }
}
