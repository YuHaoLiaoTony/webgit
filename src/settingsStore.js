import { homedir } from 'os';
import { join, resolve } from 'path';
import { mkdir, readFile, writeFile, rename } from 'fs/promises';

/**
 * 應用程式設定持久化層
 *
 * 存放位置：~/.webgit/settings.json（使用者家目錄，所有 webgit 實例共用）
 *
 * 檔案格式：
 * {
 *   "version": 1,
 *   "sourceCodeFolders": ["/abs/path/one", "/abs/path/two"]  // 第一筆 = Open Repo 預設資料夾
 * }
 */

const CONFIG_DIR = join(homedir(), '.webgit');
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json');

export function getSettingsFilePath() {
  return SETTINGS_FILE;
}

export function defaultSettings() {
  return { version: 1, sourceCodeFolders: [] };
}

/**
 * 從磁碟載入設定。檔案不存在或格式錯誤時回傳預設值（不拋錯）。
 * 路徑一律正規化為絕對路徑（相對路徑依伺服器 cwd 解析）。
 */
export async function loadSettings() {
  try {
    const raw = await readFile(SETTINGS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const folders = Array.isArray(data?.sourceCodeFolders)
      ? data.sourceCodeFolders
          .filter((f) => typeof f === 'string' && f.trim().length > 0)
          .map((f) => resolve(f.trim()))
      : [];
    // 去重（保留順序）
    return { version: 1, sourceCodeFolders: [...new Set(folders)] };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[settingsStore] 無法讀取 ${SETTINGS_FILE}: ${err.message}`);
    }
    return defaultSettings();
  }
}

/**
 * 寫入設定（先寫暫存檔再 rename，避免寫到一半 crash 造成檔案損毀）。
 */
export async function saveSettings(settings) {
  await mkdir(CONFIG_DIR, { recursive: true });
  const tmp = `${SETTINGS_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  await rename(tmp, SETTINGS_FILE);
}
