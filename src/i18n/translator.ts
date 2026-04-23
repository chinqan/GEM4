// ─── 35.1 Translator 類別 ───────────────────────────────────
// load、t（翻譯）、參數替換、語言自動偵測

/** 支援的語言代碼 */
export type SupportedLocale = 'zh-TW' | 'en';

/** 所有支援的語言 */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['zh-TW', 'en'] as const;

/** 語言顯示名稱 */
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  'zh-TW': '繁體中文',
  en: 'English',
};

/**
 * 國際化翻譯器。
 *
 * 使用方式：
 * ```ts
 * const t = new Translator('zh-TW');
 * await t.load('zh-TW');
 * t.t('menu.play'); // "開始遊戲"
 * t.t('level.score', { score: 1000 }); // "分數：1000"
 * ```
 */
export class Translator {
  private _locale: SupportedLocale;
  private strings: Record<string, string> = {};
  private loaded = false;

  constructor(defaultLocale: SupportedLocale = 'zh-TW') {
    this._locale = defaultLocale;
  }

  /** 目前語言 */
  get locale(): SupportedLocale {
    return this._locale;
  }

  /** 是否已載入語言檔 */
  get isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 載入指定語言的翻譯檔。
   *
   * 使用動態 import 載入 JSON，支援 Vite 的 code splitting。
   */
  async load(locale: SupportedLocale): Promise<void> {
    try {
      let mod: { default: Record<string, string> };
      // 使用靜態路徑以支援 Vite 的 glob import
      if (locale === 'zh-TW') {
        mod = await import('./locales/zh-TW.json');
      } else {
        mod = await import('./locales/en.json');
      }
      this.strings = mod.default;
      this._locale = locale;
      this.loaded = true;
    } catch (err) {
      console.warn(`Failed to load locale "${locale}":`, err);
      // 保留現有翻譯
    }
  }

  /**
   * 翻譯指定 key。
   *
   * 支援參數替換：`{paramName}` 會被替換為對應的值。
   * 找不到 key 時回傳 key 本身（方便開發時發現缺漏）。
   *
   * @param key 翻譯鍵
   * @param params 替換參數
   * @returns 翻譯後的字串
   */
  t(key: string, params?: Record<string, string | number>): string {
    let str = this.strings[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }

  /**
   * 檢查指定 key 是否有翻譯。
   */
  has(key: string): boolean {
    return key in this.strings;
  }

  /**
   * 取得所有翻譯鍵（用於除錯）。
   */
  keys(): string[] {
    return Object.keys(this.strings);
  }
}

// ─── 35.4 語言自動偵測 ─────────────────────────────────────

/**
 * 偵測瀏覽器語言並回傳最佳匹配的支援語言。
 *
 * 優先順序：
 * 1. navigator.language 完全匹配
 * 2. navigator.language 前綴匹配（如 zh → zh-TW）
 * 3. navigator.languages 中的匹配
 * 4. 預設 'en'
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en';

  const candidates = [
    navigator.language,
    ...(navigator.languages ?? []),
  ];

  for (const lang of candidates) {
    // 完全匹配
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
      return lang as SupportedLocale;
    }
    // 前綴匹配
    const prefix = lang.split('-')[0].toLowerCase();
    if (prefix === 'zh') return 'zh-TW';
    if (prefix === 'en') return 'en';
  }

  return 'en';
}

// ─── 35.5 全域翻譯器實例 ──────────────────────────────────

/** 全域翻譯器實例（供 UI 整合使用） */
let globalTranslator: Translator | null = null;

/**
 * 初始化全域翻譯器。
 */
export async function initTranslator(locale?: SupportedLocale): Promise<Translator> {
  const resolvedLocale = locale ?? detectBrowserLocale();
  globalTranslator = new Translator(resolvedLocale);
  await globalTranslator.load(resolvedLocale);
  return globalTranslator;
}

/**
 * 取得全域翻譯器。
 * 若尚未初始化，回傳一個未載入的預設翻譯器。
 */
export function getTranslator(): Translator {
  if (!globalTranslator) {
    globalTranslator = new Translator('en');
  }
  return globalTranslator;
}

/**
 * 快捷翻譯函式（使用全域翻譯器）。
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return getTranslator().t(key, params);
}
