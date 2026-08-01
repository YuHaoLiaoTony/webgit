import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useReposStore = defineStore('repos', () => {
  const repos = ref([])           // Array<{id, name, path, currentBranch, label}> — open repos (tabs)
  const allRepos = ref([])        // Array<{id, name, path, label, status, currentBranch}> — repos.json 全部 (含 closed)
  const activeRepoId = ref(null)
  const loading = ref(false)

  const activeRepo = computed(() =>
    repos.value.find(r => r.id === activeRepoId.value) || null
  )

  /** 顯示名稱：有 label 時「label (name)」，否則用 name */
  const displayName = (repo) => {
    if (!repo) return ''
    if (repo.label && repo.label.trim()) {
      return `${repo.label.trim()} (${repo.name})`
    }
    return repo.name || ''
  }

  async function fetchRepos() {
    // Use native fetch to avoid circular dependency
    try {
      loading.value = true
      const res = await fetch('/api/repos')
      if (!res.ok) throw new Error('Failed to fetch repos')
      const data = await res.json()
      // Server 回傳 { repos: [...], activeRepo: id }（相容舊的純陣列格式）
      const list = Array.isArray(data) ? data : (data.repos || [])
      repos.value = list
      const serverActive = Array.isArray(data) ? null : (data.activeRepo || null)
      if (serverActive && list.some(r => r.id === serverActive)) {
        activeRepoId.value = serverActive
      } else if (!activeRepoId.value && list.length > 0) {
        activeRepoId.value = list[0].id
      }
    } catch (e) {
      console.error('Failed to fetch repos:', e)
    } finally {
      loading.value = false
    }
  }

  async function setActiveRepo(id) {
    if (activeRepoId.value === id) return
    activeRepoId.value = id
    try {
      const res = await fetch('/api/repos/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: id }),
      })
      if (!res.ok) {
        console.error('Failed to persist active repo:', res.status)
      }
    } catch (e) {
      console.error('Failed to persist active repo:', e)
    }
  }

  async function fetchAllRepos() {
    try {
      const res = await fetch('/api/repos/all')
      if (!res.ok) throw new Error('Failed to fetch all repos')
      const data = await res.json()
      allRepos.value = (data.repos || [])
    } catch (e) {
      console.error('Failed to fetch all repos:', e)
    }
  }

  /** 設定/清除 label（空字串 = 清除） */
  async function setLabel(id, label) {
    const res = await fetch(`/api/repos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to set label')
    }
    // 同步更新兩個清單
    for (const list of [repos.value, allRepos.value]) {
      const item = list.find(r => r.id === id)
      if (item) item.label = (label && label.trim()) ? label.trim() : null
    }
  }

  async function openRepo(path, label = null) {
    const res = await fetch('/api/repos/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, label }),
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

  /** 關閉 repo（從 tab 移除，repos.json 保留） */
  async function closeRepo(id, purge = false) {
    const suffix = purge ? '?purge=true' : ''
    const res = await fetch(`/api/repos/${encodeURIComponent(id)}${suffix}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to close repo')
    }
    repos.value = repos.value.filter(r => r.id !== id)
    if (activeRepoId.value === id) {
      activeRepoId.value = repos.value[0]?.id || null
    }
  }

  return {
    repos, allRepos, activeRepoId, activeRepo, loading, displayName,
    setActiveRepo, fetchRepos, fetchAllRepos, openRepo, cloneRepo, closeRepo, setLabel,
  }
})
