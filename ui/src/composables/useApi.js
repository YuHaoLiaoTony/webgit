/**
 * API composable stub — will be wired to actual backend later.
 * Provides a minimal { get, post } interface for the status store.
 */
export function useApi() {
  return {
    async get(url) {
      // Stub: return empty status
      return {
        current: 'master',
        tracking: 'origin/master',
        ahead: 0,
        behind: 0,
        files: {
          modified: [],
          added: [],
          deleted: [],
          untracked: [],
          staged: [],
          renamed: [],
        },
        isClean: true,
      }
    },
    async post(url, body) {
      // Stub: no-op
      return { ok: true }
    },
  }
}
