import { defineStore } from 'pinia'
import { useApi } from '../composables/useApi'

export const useStatusStore = defineStore('status', {
  state: () => ({
    current: '',
    tracking: '',
    ahead: 0,
    behind: 0,
    isClean: true,
    unstaged: [],
    staged: [],
    conflicted: [],
    loading: false,
    error: null,
  }),

  getters: {
    totalChanges: (state) => state.unstaged.length + state.staged.length + state.conflicted.length,
    unstagedFiles: (state) => state.unstaged,
    stagedFiles: (state) => state.staged,
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
        this.unstaged = data.unstaged || []
        this.staged = data.staged || []
        this.conflicted = data.conflicted || []
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

    async commit({ title, body } = {}) {
      const { post } = useApi()
      const message = body ? `${title}\n\n${body}` : title
      const result = await post('/commit', { message })
      await this.fetchStatus()
      return result
    },
  },
})
