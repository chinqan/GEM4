// ─── 音訊匯流排 (Audio Buses) ──────────────────────────────
// 管理 master / music / sfx 音量通道與靜音切換。
// 使用 Howler.js 的全域音量控制搭配每個 bus 的獨立增益。

// ─── 型別 ──────────────────────────────────────────────────

/** 音量值，範圍 0..1 */
export type Volume = number;

/** 單一匯流排狀態 */
export interface BusState {
  /** 使用者設定的音量 (0..1) */
  volume: Volume;
  /** 是否靜音 */
  muted: boolean;
}

/** 所有匯流排的設定快照 */
export interface BusSnapshot {
  master: BusState;
  music: BusState;
  sfx: BusState;
  /** 環境音匯流排（GDD 07§5）；舊快照可能缺少此欄位 */
  ambience?: BusState;
}

/** 音量變更回呼 */
export type VolumeChangeCallback = (snapshot: BusSnapshot) => void;

// ─── 常數 ──────────────────────────────────────────────────

const DEFAULT_MASTER_VOLUME = 0.8;
const DEFAULT_MUSIC_VOLUME = 0.8;
const DEFAULT_SFX_VOLUME = 0.9;
/** GDD 07§9：Ambience 滑桿預設 40% */
const DEFAULT_AMBIENCE_VOLUME = 0.4;

// ─── 工具函式 ──────────────────────────────────────────────

/** 將值夾在 [0, 1] 範圍 */
function clampVolume(v: number): Volume {
  return Math.max(0, Math.min(1, v));
}

// ─── AudioBuses ────────────────────────────────────────────

/**
 * 音訊匯流排管理器。
 *
 * 提供 master / music / sfx 三個通道的音量控制與靜音切換。
 * 實際音量 = bus.volume × master.volume（若任一 muted 則為 0）。
 *
 * 不直接操作 Howler 全域音量——由 AudioSystem 讀取有效音量後
 * 套用到對應的 Howl 實例。
 */
export class AudioBuses {
  private _master: BusState;
  private _music: BusState;
  private _sfx: BusState;
  private _ambience: BusState;
  private _listeners: VolumeChangeCallback[] = [];

  constructor(snapshot?: Partial<BusSnapshot>) {
    this._master = {
      volume: snapshot?.master?.volume ?? DEFAULT_MASTER_VOLUME,
      muted: snapshot?.master?.muted ?? false,
    };
    this._music = {
      volume: snapshot?.music?.volume ?? DEFAULT_MUSIC_VOLUME,
      muted: snapshot?.music?.muted ?? false,
    };
    this._sfx = {
      volume: snapshot?.sfx?.volume ?? DEFAULT_SFX_VOLUME,
      muted: snapshot?.sfx?.muted ?? false,
    };
    this._ambience = {
      volume: snapshot?.ambience?.volume ?? DEFAULT_AMBIENCE_VOLUME,
      muted: snapshot?.ambience?.muted ?? false,
    };
  }

  // ─── Getters ───────────────────────────────────────────

  /** Master 匯流排狀態 */
  get master(): Readonly<BusState> {
    return this._master;
  }

  /** Music 匯流排狀態 */
  get music(): Readonly<BusState> {
    return this._music;
  }

  /** SFX 匯流排狀態 */
  get sfx(): Readonly<BusState> {
    return this._sfx;
  }

  /** Ambience 匯流排狀態 */
  get ambience(): Readonly<BusState> {
    return this._ambience;
  }

  // ─── 有效音量計算 ─────────────────────────────────────

  /** 計算 music 的有效音量（考慮 master 與 mute） */
  get effectiveMusicVolume(): Volume {
    if (this._master.muted || this._music.muted) return 0;
    return this._master.volume * this._music.volume;
  }

  /** 計算 sfx 的有效音量（考慮 master 與 mute） */
  get effectiveSfxVolume(): Volume {
    if (this._master.muted || this._sfx.muted) return 0;
    return this._master.volume * this._sfx.volume;
  }

  /** 計算 ambience 的有效音量（考慮 master 與 mute） */
  get effectiveAmbienceVolume(): Volume {
    if (this._master.muted || this._ambience.muted) return 0;
    return this._master.volume * this._ambience.volume;
  }

  /** 全域是否靜音（master muted） */
  get isGlobalMuted(): boolean {
    return this._master.muted;
  }

  // ─── Setters ───────────────────────────────────────────

  /** 設定 master 音量 */
  setMasterVolume(v: number): void {
    this._master.volume = clampVolume(v);
    this._notify();
  }

  /** 設定 music 音量 */
  setMusicVolume(v: number): void {
    this._music.volume = clampVolume(v);
    this._notify();
  }

  /** 設定 sfx 音量 */
  setSfxVolume(v: number): void {
    this._sfx.volume = clampVolume(v);
    this._notify();
  }

  /** 設定 ambience 音量 */
  setAmbienceVolume(v: number): void {
    this._ambience.volume = clampVolume(v);
    this._notify();
  }

  /** 切換 master 靜音 */
  toggleMasterMute(): boolean {
    this._master.muted = !this._master.muted;
    this._notify();
    return this._master.muted;
  }

  /** 設定 master 靜音狀態 */
  setMasterMute(muted: boolean): void {
    this._master.muted = muted;
    this._notify();
  }

  /** 切換 music 靜音 */
  toggleMusicMute(): boolean {
    this._music.muted = !this._music.muted;
    this._notify();
    return this._music.muted;
  }

  /** 切換 sfx 靜音 */
  toggleSfxMute(): boolean {
    this._sfx.muted = !this._sfx.muted;
    this._notify();
    return this._sfx.muted;
  }

  // ─── 快照 ─────────────────────────────────────────────

  /** 取得當前所有匯流排的快照（可用於存檔） */
  snapshot(): BusSnapshot {
    return {
      master: { ...this._master },
      music: { ...this._music },
      sfx: { ...this._sfx },
      ambience: { ...this._ambience },
    };
  }

  /** 從快照還原匯流排狀態 */
  restore(snap: Partial<BusSnapshot>): void {
    if (snap.master) {
      this._master.volume = clampVolume(snap.master.volume);
      this._master.muted = snap.master.muted;
    }
    if (snap.music) {
      this._music.volume = clampVolume(snap.music.volume);
      this._music.muted = snap.music.muted;
    }
    if (snap.sfx) {
      this._sfx.volume = clampVolume(snap.sfx.volume);
      this._sfx.muted = snap.sfx.muted;
    }
    if (snap.ambience) {
      this._ambience.volume = clampVolume(snap.ambience.volume);
      this._ambience.muted = snap.ambience.muted;
    }
    this._notify();
  }

  // ─── 監聽 ─────────────────────────────────────────────

  /** 註冊音量變更回呼，回傳取消訂閱函式 */
  onChange(cb: VolumeChangeCallback): () => void {
    this._listeners.push(cb);
    return () => {
      const idx = this._listeners.indexOf(cb);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  // ─── 內部 ─────────────────────────────────────────────

  private _notify(): void {
    const snap = this.snapshot();
    for (const cb of this._listeners) {
      cb(snap);
    }
  }
}
