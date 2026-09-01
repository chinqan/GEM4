// ─── 音樂資產清單 ───────────────────────────────────────────
// 佔位合成音樂已因音質不佳移除（2026-09-01）；播放接線全數保留。
// 正式音樂（OQ-32 定案後）依下列命名放入 public/ 對應路徑，
// 再把旗標改為 true 即可啟用，其餘程式不需變動：
//
//   音樂：assets/audio/music/music_menu.mp3
//         assets/audio/music/music_world_{1..4}_l{0..3}.mp3
//         （每世界 4 層 stem，同 BPM 同調性，GDD 07§4.2）
//   環境音：assets/audio/ambience/ambience_world_{1..4}.mp3
//
// 支援 OGG 主格式時，於 createTrackDef 的 formats 傳 ['ogg', 'mp3'] 即可。

/** 音樂資產是否已到位（未到位時所有音樂播放靜默跳過） */
export const MUSIC_ASSETS_READY = false;

/** 環境音資產是否已到位 */
export const AMBIENCE_ASSETS_READY = false;

/** 選單曲 base path（不含副檔名） */
export const MENU_MUSIC_BASE = 'assets/audio/music/music_menu';

/** 世界音樂 4 層 stem 的 base paths（L0..L3，不含副檔名） */
export function worldMusicBasePaths(worldId: number): string[] {
  return [0, 1, 2, 3].map((i) => `assets/audio/music/music_world_${worldId}_l${i}`);
}

/** 世界環境音檔案路徑 */
export function worldAmbiencePath(worldId: number): string {
  return `assets/audio/ambience/ambience_world_${worldId}.mp3`;
}
