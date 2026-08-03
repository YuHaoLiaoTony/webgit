import { ref, computed, watch } from 'vue'
import { useApi } from './useApi.js'
import { useUiStore } from '../stores/ui.js'
import { showToast } from './useToast.js'
import { routeLanes, getLaneX, getRowGraph as genRowGraph } from '../lib/graph-core.js'

// ─── Parse refs string into structured labels ───────────────
//  'HEAD -> Tony, origin/Tony' → { local: ['Tony'], remote: ['origin/Tony'] }
function parseRefs(refsStr) {
  const labels = { local: [], remote: [], tags: [], stash: [] }
  if (!refsStr) return labels

  // Parse --decorate=full format:
  // "HEAD -> refs/heads/main, refs/remotes/origin/main, refs/tags/v1.0"
  refsStr.split(',').forEach(part => {
    const name = part.trim()
    if (!name) return

    // Strip 'HEAD -> ' prefix
    let clean = name.replace(/^HEAD -> /, '').trim()
    // Strip 'tag: ' prefix (git --decorate=full format)
    clean = clean.replace(/^tag:\s*/, '').trim()
    if (!clean) return

    if (clean.startsWith('refs/remotes/')) {
      labels.remote.push(clean.replace('refs/remotes/', ''))
    } else if (clean.startsWith('refs/heads/')) {
      labels.local.push(clean.replace('refs/heads/', ''))
    } else if (clean.startsWith('refs/tags/')) {
      labels.tags.push(clean.replace('refs/tags/', ''))
    } else if (clean.startsWith('refs/stash')) {
      labels.stash.push(clean.replace('refs/', ''))
    } else if (clean.startsWith('origin/')) {
      labels.remote.push(clean)
    } else if (/^v?\d+\./.test(clean)) {
      labels.tags.push(clean)
    } else if (clean !== 'HEAD') {
      // Plain branch name (no refs/ prefix)
      // Could be local or remote
      if (clean.includes('/')) {
        labels.remote.push(clean)
      } else {
        labels.local.push(clean)
      }
    }
  })
  return labels
}

export function useCommits() {
  const uiStore = useUiStore()

  // ─── State ─────────────────────────────────────────────────────
  const commits = ref([])
  const selectedCommitId = ref(null)
  const selectedCommit = ref(null)
  const loading = ref(true)
  const loadingMore = ref(false)
  const error = ref(null)
  const hasMore = ref(true)

  // ─── Filter state ─────────────────────────────────────────────
  const filterOrder = ref('date')    // 'date' or 'topo'
  const filterFirstParent = ref(false)

  // ─── Fetch real commits from API ───────────────────────────────
  async function fetchCommits(reset = false) {
    if (reset) {
      loading.value = true
      commits.value = []
      hasMore.value = true
    } else {
      loadingMore.value = true
    }

    error.value = null
    selectedCommit.value = null
    selectedCommitId.value = null

    try {
      const { get } = useApi()
      const skip = reset ? 0 : commits.value.length
      const limit = 50

      const query = `/commits?limit=${limit}&skip=${skip}&order=${filterOrder.value}&firstParent=${filterFirstParent.value}&allBranches=true`
      const data = await get(query)

      const mapped = data.map(c => ({
        id: c.hash,
        hash: c.shortHash || c.hash.substring(0, 7),
        fullHash: c.hash,
        subject: c.message,
        author: {
          initials: (c.author || '?').charAt(0).toUpperCase(),
          name: c.author || 'Unknown',
          email: c.email || '',
        },
        date: c.date,
        refs: c.refs || '',
        _labels: parseRefs(c.refs || ''),
        parents: (c.parents || []).map(p => typeof p === 'string' ? p : p.hash || p),
      }))

      if (reset) {
        commits.value = mapped
      } else {
        commits.value = [...commits.value, ...mapped]
      }

      // If we got fewer than limit, there are no more commits
      if (data.length < limit) {
        hasMore.value = false
      }
    } catch (e) {
      console.error('Failed to fetch commits:', e)
      error.value = e.message
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function loadMore() {
    if (!loadingMore.value && hasMore.value) {
      fetchCommits(false)
    }
  }

  // ─── Watch for branch-switch refresh & filter changes ───────────
  watch(() => uiStore.commitRefreshKey, () => {
    fetchCommits(true)
  })

  watch([filterOrder, filterFirstParent], () => {
    fetchCommits(true)
  })

  // ─── Actions ───────────────────────────────────────────────────
  function selectCommit(commit) {
    selectedCommitId.value = commit.id
    selectedCommit.value = commit
  }

  // ─── Copy hash to clipboard ─────────────────────────────────────────
  function copyHash(commit) {
    const fullHash = commit.fullHash || commit.id
    navigator.clipboard.writeText(fullHash).then(() => {
      showToast('success', '✅ Hash copied to clipboard')
    }).catch(() => {
      showToast('error', '❌ Failed to copy hash')
    })
  }

  function selectCommitByHash(hash) {
    const commit = commits.value.find(c => c.fullHash === hash || c.id === hash)
    if (commit) {
      selectCommit(commit)
    }
  }

  // ─── Computed lane routing ─────────────────────────────────────
  const laneRouting = computed(() => {
    return routeLanes(commits.value)
  })

  // ─── Dynamic graph column width ────────────────────────────────
  const graphColWidth = computed(() => {
    const routes = laneRouting.value
    if (!routes || routes.length === 0) return 80
    const maxLane = Math.max(...routes.flatMap(r => r.preMergeLanes), 0)
    return Math.max(80, getLaneX(maxLane) + 20)
  })

  // ═══════════════════════════════════════════════════════════════
  //  PER-ROW SVG GRAPH COLUMN (Vue wrapper: reads reactive state)
  // ═══════════════════════════════════════════════════════════════

  function getRowGraph(commit, index) {
    const data = commits.value
    const routes = laneRouting.value
    return genRowGraph(commit, index, data, routes)
  }

  return {
    commits,
    loading,
    loadingMore,
    error,
    hasMore,
    selectedCommitId,
    selectedCommit,
    filterOrder,
    filterFirstParent,
    fetchCommits,
    loadMore,
    selectCommit,
    copyHash,
    selectCommitByHash,
    laneRouting,
    graphColWidth,
    getRowGraph,
  }
}
