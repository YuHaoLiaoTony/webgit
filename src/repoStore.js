import { homedir } from 'os';
import { basename, join } from 'path';
import { mkdir, readFile, writeFile, rename } from 'fs/promises';

/**
 * Repo 清單持久化層
 *
 * 存放位置：~/.webgit/repos.json（使用者家目錄，所有 webgit 實例共用）
 *
 * 檔案格式：
 * {
 *   "version": 1,
 *   "activeRepo": "/path/to/repo",          // 上次選中的 repo (path 即 id)
 *   "repos": [
 *     {
 *       "path": "/path/to/repo",            // 絕對路徑，同時是 repo id
 *       "name": "repo-name",                // basename，可被 label 取代顯示
 *       "label": "自訂標籤",                 // 可選，顯示用別名
 *       "status": "open" | "closed"         // closed = 從 tab 移除但保留在清單
 *     }
 *   ]
 * }
 */

const CONFIG_DIR = join(homedir(), '.webgit');
const REPOS_FILE = join(CONFIG_DIR, 'repos.json');

export function getReposFilePath() {
  return REPOS_FILE;
}

export function defaultStore() {
  return { version: 1, activeRepo: null, repos: [] };
}

/**
 * 從磁碟載入 repo 清單。檔案不存在或格式錯誤時回傳空清單（不拋錯）。
 */
export async function loadStore() {
  try {
    const raw = await readFile(REPOS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.repos)) return defaultStore();

    const repos = data.repos
      .filter((r) => r && typeof r.path === 'string' && r.path.trim().length > 0)
      .map((r) => ({
        path: r.path,
        name: typeof r.name === 'string' && r.name.trim() ? r.name : basename(r.path),
        label: typeof r.label === 'string' && r.label.trim() ? r.label : null,
        status: r.status === 'closed' ? 'closed' : 'open',
      }));

    return {
      version: 1,
      activeRepo: typeof data.activeRepo === 'string' && data.activeRepo ? data.activeRepo : null,
      repos,
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[repoStore] 無法讀取 ${REPOS_FILE}: ${err.message}`);
    }
    return defaultStore();
  }
}

/**
 * 寫入 repo 清單（先寫暫存檔再 rename，避免寫到一半 crash 造成檔案損毀）。
 */
export async function saveStore(store) {
  await mkdir(CONFIG_DIR, { recursive: true });
  const tmp = `${REPOS_FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2) + '\n', 'utf8');
  await rename(tmp, REPOS_FILE);
}

/** 依 path 找清單中的 entry（path 即 id）。 */
export function findRepo(store, path) {
  return store.repos.find((r) => r.path === path) || null;
}

/**
 * 新增或更新清單中的 entry。
 */
export function upsertRepo(store, { path, name, label = null, status = 'open' }) {
  const entry = {
    path,
    name: name || basename(path),
    label: label || null,
    status,
  };
  const existing = findRepo(store, path);
  if (existing) {
    Object.assign(existing, entry);
  } else {
    store.repos.push(entry);
  }
  return entry;
}
