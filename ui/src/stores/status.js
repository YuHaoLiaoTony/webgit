import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useStatusStore = defineStore('status', {
  state: () => ({
    current: '',
    tracking: '',
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
    loading: false,
    error: null,
  }),

  getters: {
    totalChanges: (state) => {
      return state.files.modified.length +
        state.files.added.length +
        state.files.deleted.length +
        state.files.untracked.length
    },
    /** Normalize a file entry from the API to a { path, status } object.
     *  Handles both string paths and simple-git renamed objects ({ from, to }). */
    normalizeFile: (state) => (f, status) => {
      if (typeof f === 'string') return { path: f, status }
      // simple-git returns renamed entries as { from, to } objects
      if (f && typeof f === 'object' && f.to) return { path: f.to, status }
      return { path: String(f), status }
    },
    unstagedFiles: (state) => {
      const stagedSet = new Set(state.files.staged)
      const normalize = (f, status) => {
        if (typeof f === 'string') return { path: f, status }
        if (f && typeof f === 'object' && f.to) return { path: f.to, status }
        return { path: String(f), status }
      }
      return [
        ...state.files.modified.filter(f => !stagedSet.has(f)).map(f => normalize(f, 'modified')),
        ...state.files.added.filter(f => !stagedSet.has(f)).map(f => normalize(f, 'added')),
        ...state.files.deleted.filter(f => !stagedSet.has(f)).map(f => normalize(f, 'deleted')),
        ...state.files.untracked.map(f => normalize(f, 'added')),
        // simple-git reports renamed files only when they are in the index (staged).
        // If they appear here, they are already tracked in stagedFiles below.
      ]
    },
    stagedFiles: (state) => {
      // Build lookup sets for each change type
      const addedSet = new Set(state.files.added)
      const deletedSet = new Set(state.files.deleted)
      const modifiedSet = new Set(state.files.modified)
      // renamed entries are objects { from, to } — collect the "to" paths
      const renamedSet = new Set(
        (state.files.renamed || []).map(r => typeof r === 'object' && r.to ? r.to : String(r))
      )

      // simple-git's status.renamed always means files in the index (staged)
      // Dedup: skip renamed paths already in state.files.staged
      const stagedPaths = new Set((state.files.staged || []).map(f => typeof f === 'string' ? f : String(f)))
      const renamedStaged = (state.files.renamed || [])
        .filter(r => {
          const path = typeof r === 'object' && r.to ? r.to : String(r)
          return !stagedPaths.has(path)
        })
        .map(r => {
          const path = typeof r === 'object' && r.to ? r.to : String(r)
          return { path, status: 'renamed' }
        })
      return [
        ...(state.files.staged || []).map(f => {
        const path = typeof f === 'string' ? f : (typeof f === 'object' && f.path ? f.path : String(f))
        // Determine the actual change type by priority
        let status = 'staged'
        if (renamedSet.has(path)) status = 'renamed'
        else if (deletedSet.has(path)) status = 'deleted'
        else if (addedSet.has(path)) status = 'added'
        else if (modifiedSet.has(path)) status = 'modified'
        return { path, status }
      }),
        ...renamedStaged,
      ]
    },
  },

  actions: {
    async fetchStatus() {
      this.loading = true
      this.error = null
      try {
        const { get } = useApi()
        const data = await get('/status')
        this.current = data.current
        this.tracking = data.tracking
        this.ahead = data.ahead
        this.behind = data.behind
        this.files = data.files
        this.isClean = data.isClean
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async stageFiles(files) {
      const { post } = useApi()
      await post('/stage', { files })
      await this.fetchStatus()
    },

    async unstageFiles(files) {
      const { post } = useApi()
      await post('/unstage', { files })
      await this.fetchStatus()
    },

    async discardFiles(files) {
      const { post } = useApi()
      await post('/discard', { files })
      await this.fetchStatus()
    },

    async commit(message) {
      const { post } = useApi()
      const result = await post('/commit', { message })
      await this.fetchStatus()
      return result
    },
  },
})
