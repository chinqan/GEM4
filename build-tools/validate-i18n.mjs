// i18n 驗證（GDD 09§3.9）：檢查各 locale 的 key 對齊與空值。
// 用法：node build-tools/validate-i18n.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALE_DIR = join(__dirname, '..', 'src', 'i18n', 'locales');
const LOCALES = ['zh-TW', 'en'];

const maps = new Map();
for (const locale of LOCALES) {
  const json = JSON.parse(readFileSync(join(LOCALE_DIR, `${locale}.json`), 'utf8'));
  maps.set(locale, json);
}

let errors = 0;
const [base, ...rest] = LOCALES;
const baseKeys = new Set(Object.keys(maps.get(base)));

for (const locale of rest) {
  const keys = new Set(Object.keys(maps.get(locale)));
  for (const k of baseKeys) {
    if (!keys.has(k)) {
      console.error(`✗ ${locale} 缺少 key: ${k}`);
      errors++;
    }
  }
  for (const k of keys) {
    if (!baseKeys.has(k)) {
      console.error(`✗ ${locale} 多出 key（${base} 沒有）: ${k}`);
      errors++;
    }
  }
}

for (const locale of LOCALES) {
  for (const [k, v] of Object.entries(maps.get(locale))) {
    if (typeof v !== 'string' || v.trim() === '') {
      console.error(`✗ ${locale}.${k} 為空值`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n✗ i18n 驗證失敗：${errors} 個問題`);
  process.exit(1);
}
console.log(`✓ i18n 驗證通過（${LOCALES.join(', ')}；${baseKeys.size} keys 對齊）`);
