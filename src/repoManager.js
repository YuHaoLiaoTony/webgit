import simpleGit from 'simple-git';
import { basename, resolve, isAbsolute } from 'path';
import { createGitAPI } from './git.js';
import { loadStore, saveStore, findRepo, upsertRepo } from './repoStore.js';

/**
 * Create a multi-repository manager.
 *
 * Repo id 即絕對路徑（穩定、唯一），跨重啟不變。
 * 清單會持久化到 ~/.webgit/repos.json（見 repoStore.js）。
 *
 * @returns {{
 *   init: (options?: {ensureRepoPath?: string}) => Promise<object>,
 *   openRepo: (path: string, options?: {persist?: boolean, label?: string}) => Promise<object>,
 *   closeRepo: (id: string, options?: {purge?: boolean}) => Promise<{success: boolean}>,
 *   setActiveRepo: (id: string) => Promise<void>,
 *   getActiveRepoId: () => string | null,
 *   getRepo: (id: string) => object,
 *   getAPI: (id: string) => object,
 *   getGit: (id: string) => object,
 *   getAllRepos: () => Promise<Array<object>>,
 *   getDefaultRepo: () => string | null
 * }}
 */
export function createRepoManager() {
  const repos = new Map();
  let defaultId = null;
  let activeRepoId = null;
  let store = { version: 1, activeRepo: null, repos: [] };

  const manager = {
    /**
     * 啟動時初始化：
     * 1. 載入 ~/.webgit/repos.json
     * 2. 確保預設 repo（cwd/REPO_PATH）有寫進清單（檔案即唯一真相）
     * 3. 開啟所有 status=open 的 repo（失敗的略過並警告）
     * 4. 還原上次選中的 active repo
     */
    async init({ ensureRepoPath = null } = {}) {
      store = await loadStore();

      // 預設 repo 必須寫進清單（使用者決策：清單就是唯一真相）
      if (ensureRepoPath) {
        const resolved = resolve(ensureRepoPath);
        if (!findRepo(store, resolved)) {
          upsertRepo(store, { path: resolved, name: basename(resolved), status: 'open' });
          await saveStore(store);
        }
        // 預設 repo 打不開則維持原本行為：直接失敗（不吞錯誤）
        const info = await this.openRepo(resolved, { persist: false });
        defaultId = info.id;
      }

      // 開啟清單中所有 open 狀態的 repo
      for (const entry of store.repos) {
        if (entry.status !== 'open') continue;
        try {
          const info = await this.openRepo(entry.path, { persist: false, label: entry.label });
          if (defaultId === null) defaultId = info.id;
        } catch (e) {
          console.warn(`[repoManager] 略過無法開啟的 repo ${entry.path}: ${e.message}`);
        }
      }

      // 還原上次選中的 repo
      if (store.activeRepo) {
        const active = resolve(store.activeRepo);
        if (repos.has(active)) activeRepoId = active;
      }
      if (activeRepoId === null && defaultId !== null) {
        activeRepoId = defaultId;
      }

      return this;
    },

    /**
     * Open (or re-use) a git repository at the given path.
     * Validates that the path is a valid git directory.
     * id = 絕對路徑。
     */
    async openRepo(path, { persist = true, label = null } = {}) {
      if (typeof path !== 'string' || path.trim().length === 0) {
        throw new Error('Path must be a non-empty string');
      }

      // Normalize to an absolute canonical path
      const resolvedPath = resolve(path);
      if (!isAbsolute(resolvedPath)) {
        throw new Error('Path must be absolute');
      }

      // Check if already opened — deduplicate by resolved path
      for (const [id, repo] of repos) {
        if (repo.path === resolvedPath) {
          // Refresh current branch
          try {
            const branches = await repo.api.getBranches();
            repo.currentBranch = branches.current;
          } catch (_) {
            // repository may be empty
          }
          if (persist) {
            upsertRepo(store, { path: resolvedPath, name: repo.name, label: label ?? repo.label, status: 'open' });
            await saveStore(store);
          }
          return {
            id,
            name: repo.name,
            path: repo.path,
            currentBranch: repo.currentBranch,
            label: label ?? repo.label ?? null,
          };
        }
      }

      // Validate it's a git repo
      const git = simpleGit(resolvedPath);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`Not a valid git repository: ${resolvedPath}`);
      }

      const name = basename(resolvedPath);
      const id = resolvedPath;
      const api = createGitAPI(resolvedPath);

      let currentBranch = 'unknown';
      try {
        const branches = await api.getBranches();
        currentBranch = branches.current;
      } catch (_) {
        // repository may have no commits yet
      }

      repos.set(id, { api, git, path: resolvedPath, name, currentBranch, label: label || null });

      if (defaultId === null) {
        defaultId = id;
      }

      if (persist) {
        upsertRepo(store, { path: resolvedPath, name, label, status: 'open' });
        await saveStore(store);
      }

      return { id, name, path: resolvedPath, currentBranch, label: label || null };
    },

    /**
     * 關閉 repo：從 tab（記憶體）移除。
     * 預設只把清單狀態標成 closed（保留在 repos.json）；
     * purge=true 則從 repos.json 徹底刪除。
     */
    async closeRepo(id, { purge = false } = {}) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      repos.delete(id);

      const entry = findRepo(store, id);
      if (entry) {
        if (purge) {
          store.repos = store.repos.filter((r) => r.path !== id);
        } else {
          entry.status = 'closed';
        }
        await saveStore(store);
      }

      if (defaultId === id) {
        const keys = [...repos.keys()];
        defaultId = keys.length > 0 ? keys[0] : null;
      }
      if (activeRepoId === id) {
        const keys = [...repos.keys()];
        activeRepoId = keys.length > 0 ? keys[0] : null;
        store.activeRepo = activeRepoId;
        await saveStore(store);
      }
      return { success: true };
    },

    /**
     * 記住目前選中的 repo（寫入清單，重啟後自動還原）。
     */
    async setActiveRepo(id) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      activeRepoId = id;
      store.activeRepo = id;
      await saveStore(store);
    },

    /**
     * 回傳目前 active repo 的 id（path），沒有則 null。
     */
    getActiveRepoId() {
      return activeRepoId;
    },

    /**
     * Get repo info with the API wrapper as `git`.
     * Throws if id not found.
     */
    getRepo(id) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      const repo = repos.get(id);
      return { git: repo.api, path: repo.path, name: repo.name, label: repo.label };
    },

    /**
     * Get the createGitAPI wrapper for a given repo id.
     * Throws if id not found.
     */
    getAPI(id) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      return repos.get(id).api;
    },

    /**
     * Get the raw simple-git instance for a given repo id.
     * Throws if id not found.
     */
    getGit(id) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      return repos.get(id).git;
    },

    /**
     * Return summary info for all open repos.
     */
    async getAllRepos() {
      const result = [];
      for (const [id, repo] of repos) {
        try {
          const branches = await repo.api.getBranches();
          repo.currentBranch = branches.current;
        } catch (_) {
          // repository may be empty
        }
        result.push({
          id,
          name: repo.name,
          path: repo.path,
          currentBranch: repo.currentBranch,
          label: repo.label || null,
        });
      }
      return result;
    },

    /**
     * Return ALL repos from the persisted list (including closed ones),
     * merged with live data for repos that are currently open.
     */
    async getAllPersistedRepos() {
      const result = [];
      for (const entry of store.repos) {
        const live = repos.get(entry.path);
        let currentBranch = null;
        if (live) {
          try {
            const branches = await live.api.getBranches();
            currentBranch = branches.current;
          } catch (_) {
            // repository may be empty
          }
        }
        result.push({
          id: entry.path,
          path: entry.path,
          name: entry.name,
          label: entry.label,
          status: live ? 'open' : 'closed',
          currentBranch,
        });
      }
      return result;
    },

    /**
     * 設定/清除 repo 的自訂標籤（label）。空字串或空白 = 清除（回到 basename）。
     * 對 open 與 closed 的 repo 都有效。
     */
    async setLabel(id, label) {
      const cleaned = typeof label === 'string' && label.trim() ? label.trim() : null;
      const entry = findRepo(store, id);
      if (!entry) {
        throw new Error(`Repository not found: ${id}`);
      }
      entry.label = cleaned;
      await saveStore(store);

      const live = repos.get(id);
      if (live) live.label = cleaned;

      return { id, label: cleaned };
    },

    /**
     * Return the id of the first (default) repo, or null if none.
     */
    getDefaultRepo() {
      return defaultId;
    }
  };

  return manager;
}
