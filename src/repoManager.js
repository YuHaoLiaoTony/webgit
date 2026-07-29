import simpleGit from 'simple-git';
import { basename } from 'path';
import { createGitAPI } from './git.js';

/**
 * Create a multi-repository manager.
 *
 * @param {Object} [options]
 * @param {string} [options.repoPath] - Optional path to open as the first repo.
 *                                       If not provided, call openRepo() manually.
 * @returns {{
 *   openRepo: (path: string) => Promise<{id: string, name: string, path: string, currentBranch: string}>,
 *   removeRepo: (id: string) => void,
 *   getRepo: (id: string) => {git: object, path: string, name: string},
 *   getAPI: (id: string) => object,
 *   getGit: (id: string) => object,
 *   getAllRepos: () => Promise<Array<{id: string, name: string, path: string, currentBranch: string}>>,
 *   getDefaultRepo: () => string | null
 * }}
 */
export function createRepoManager(options = {}) {
  const repos = new Map();
  let nextId = 1;
  let defaultId = null;

  const manager = {
    /**
     * Open (or re-use) a git repository at the given path.
     * Validates that the path is a valid git directory.
     */
    async openRepo(path) {
      if (typeof path !== 'string' || path.trim().length === 0) {
        throw new Error('Path must be a non-empty string');
      }

      // Prevent path traversal
      if (path.includes('..')) {
        throw new Error('Path traversal is not allowed');
      }

      // Check if already opened — deduplicate by resolved path
      for (const [id, repo] of repos) {
        if (repo.path === path) {
          // Refresh current branch
          try {
            const branches = await repo.api.getBranches();
            repo.currentBranch = branches.current;
          } catch (_) {
            // repository may be empty
          }
          return { id, name: repo.name, path: repo.path, currentBranch: repo.currentBranch };
        }
      }

      // Validate it's a git repo
      const git = simpleGit(path);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error(`Not a valid git repository: ${path}`);
      }

      const name = basename(path);
      const id = String(nextId++);
      const api = createGitAPI(path);

      let currentBranch = 'unknown';
      try {
        const branches = await api.getBranches();
        currentBranch = branches.current;
      } catch (_) {
        // repository may have no commits yet
      }

      repos.set(id, { api, git, path, name, currentBranch });

      if (defaultId === null) {
        defaultId = id;
      }

      return { id, name, path, currentBranch };
    },

    /**
     * Remove / close a repository by id.
     */
    removeRepo(id) {
      if (!repos.has(id)) {
        throw new Error(`Repository not found: ${id}`);
      }
      repos.delete(id);
      if (defaultId === id) {
        const keys = [...repos.keys()];
        defaultId = keys.length > 0 ? keys[0] : null;
      }
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
      return { git: repo.api, path: repo.path, name: repo.name };
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
        result.push({ id, name: repo.name, path: repo.path, currentBranch: repo.currentBranch });
      }
      return result;
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
