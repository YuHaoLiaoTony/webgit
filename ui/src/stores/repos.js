import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useReposStore = defineStore('repos', () => {
  const repos = ref([])           // Array<{id, name, path, currentBranch}>
  const activeRepoId = ref(null)
  const loading = ref(false)

  const activeRepo = computed(() =>
    repos.value.find(r => r.id === activeRepoId.value) || null
  )

  function setActiveRepo(id) {
    activeRepoId.value = id
  }

  async function fetchRepos() {
    // Use native fetch to avoid circular dependency
    try {
      loading.value = true
      const res = await fetch('/api/repos')
      if (!res.ok) throw new Error('Failed to fetch repos')
      const data = await res.json()
      repos.value = data
      if (!activeRepoId.value && data.length > 0) {
        activeRepoId.value = data[0].id
      }
    } catch (e) {
      console.error('Failed to fetch repos:', e)
    } finally {
      loading.value = false
    }
  }

  async function openRepo(path) {
    const res = await fetch('/api/repos/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to open repo')
    }
    await fetchRepos()
  }

  async function cloneRepo(url, directory) {
    const res = await fetch('/api/repos/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, directory }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to clone repo')
    }
    await fetchRepos()
  }

  async function removeRepo(id) {
    const res = await fetch(`/api/repos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to remove repo')
    }
    repos.value = repos.value.filter(r => r.id !== id)
    if (activeRepoId.value === id) {
      activeRepoId.value = repos.value[0]?.id || null
    }
  }

  return {
    repos, activeRepoId, activeRepo, loading,
    setActiveRepo, fetchRepos, openRepo, cloneRepo, removeRepo,
  }
})
