<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useUiStore } from '../stores/ui.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'
import CheckoutFastForwardDialog from './CheckoutFastForwardDialog.vue'
import { routeLanes, getLaneX, getLaneColor, getRowGraph as renderRowGraph, LANE_COLORS, ROW_H, DOT_Y } from '../lib/graph-core.js'

const uiStore = useUiStore()
const statusStore = useStatusStore()

// ─── State ─────────────────────────────────────────────────────
const commits = ref([])
const selectedCommitId = ref(null)
const selectedCommit = ref(null)
const loading = ref(true)
const error = ref(null)
const loadingMore = ref(false)
const hasMore = ref(true)

// ─── Filter state ─────────────────────────────────────────────
const filterOrder = ref('date')    // 'date' or 'topo'
const filterFirstParent = ref(false)

onMounted(() => {
  fetchCommits(true)
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

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

// ─── Context Menu ─────────────────────────────────────────────
const contextMenu = ref({ visible: false, x: 0, y: 0, commit: null })
const resetDialog = ref({ visible: false, commit: null })
const pushDialog = ref({ visible: false })

// ── Checkout & Fast-Forward Dialog ────────────────────────────
const checkoutFFDialog = ref({ visible: false, localBranch: '', remoteBranch: '' })

function openCheckoutFFDialog(commit) {
  const labels = commit._labels || { local: [], remote: [], tags: [] }

  let localBranch = ''
  let remoteBranch = ''

  if (labels.local.length > 0) {
    localBranch = labels.local[0]
    const matchingRemote = labels.remote.find(r => r === `origin/${localBranch}`)
    if (matchingRemote) {
      remoteBranch = matchingRemote
    } else if (labels.remote.length > 0) {
      remoteBranch = labels.remote[0]
    } else {
      remoteBranch = `origin/${localBranch}`
    }
  } else if (labels.remote.length > 0) {
    const full = labels.remote[0]
    remoteBranch = full
    if (full.startsWith('origin/')) {
      localBranch = full.slice(7)
    } else {
      localBranch = full
    }
  } else {
    localBranch = statusStore.current || 'main'
    remoteBranch = `origin/${localBranch}`
  }

  checkoutFFDialog.value = {
    visible: true,
    localBranch,
    remoteBranch,
  }
}

function closeCheckoutFFDialog() {
  checkoutFFDialog.value.visible = false
}

function showContextMenu(event, commit) {
  event.preventDefault()
  selectCommit(commit)
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    commit
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function onDocumentClick(e) {
  const menu = document.querySelector('.commit-context-menu')
  if (menu && !menu.contains(e.target)) {
    closeContextMenu()
  }
}

// ── Commit info helpers for context menu ─────────────────────
const isCurrentHeadCommit = computed(() => {
  if (!contextMenu.value.commit || !commits.value.length) return false
  return contextMenu.value.commit.id === commits.value[0].id
})

const isRemoteCommit = computed(() => {
  const labels = contextMenu.value.commit?._labels
  return labels && labels.remote.length > 0 && labels.local.length === 0
})

// ── Reset ─────────────────────────────────────────────────────
function openResetDialog(commit) {
  resetDialog.value = { visible: true, commit }
  closeContextMenu()
}

function closeResetDialog() {
  resetDialog.value.visible = false
  resetDialog.value.commit = null
}

const resetModes = [
  { id: 'soft',  label: 'Soft',  desc: '僅移動 HEAD，保留所有變更在 staged',     icon: '🔹' },
  { id: 'mixed', label: 'Mixed', desc: '移動 HEAD，保留變更但 unstaged（預設）', icon: '🔸' },
  { id: 'hard',  label: 'Hard',  desc: '⚠ 移動 HEAD，丟棄所有變更',            icon: '🔴' },
]

async function resetToHere(commit, mode) {
  const branchName = statusStore.current
  const hash = commit.id

  if (mode === 'hard') {
    const confirmed = confirm(
      `⚠ ⚠ ⚠  HARD RESET  ⚠ ⚠ ⚠\n\n` +
      `Reset ${branchName} to ${commit.hash} (${commit.subject})\n` +
      `and DISCARD ALL uncommitted changes permanently!\n\n` +
      `Are you sure?`
    )
    if (!confirmed) return
  }

  try {
    const { post } = useApi()
    await post('/reset', { hash, mode })
    showToast('success', `✅ ${mode} reset ${branchName} → ${commit.hash}`)
    uiStore.triggerCommitRefresh()
    statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `❌ Reset failed: ${e.message}`)
  } finally {
    closeResetDialog()
  }
}

// ── Checkout commit (detached HEAD) ──────────────────────────
async function checkoutCommit(commit) {
  const hash = commit.fullHash || commit.id
  const { post } = useApi()
  try {
    await post('/branches/checkout', { branch: hash })
    showToast('success', `🔀 Switched to commit ${commit.hash}`)
    uiStore.triggerCommitRefresh()
    statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `❌ Checkout failed: ${e.message}`)
  }
}

// ── Push ──────────────────────────────────────────────────────
function openPushDialog() {
  pushDialog.value = { visible: true }
  closeContextMenu()
}

function closePushDialog() {
  pushDialog.value.visible = false
}

async function doPush(mode) {
  if (mode === 'force') {
    const confirmed = confirm(
      `⚠ ⚠ ⚠  FORCE PUSH  ⚠ ⚠ ⚠\n\n` +
      `Force push ${statusStore.current} to origin?\n` +
      `This will OVERWRITE remote history!\n\n` +
      `Are you sure?`
    )
    if (!confirmed) return
  }

  try {
    const { post } = useApi()
    const opts = {
      force: mode === 'force',
      setUpstream: mode === 'upstream',
    }
    await post('/push', opts)
    showToast('success', `📤 Pushed ${statusStore.current} → origin`)
    statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `❌ Push failed: ${e.message}`)
  } finally {
    closePushDialog()
  }
}

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

defineExpose({ selectedCommit, selectCommitByHash })

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
  return renderRowGraph(commit, index, data, routes)
}

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
    const clean = name.replace(/^HEAD -> /, '').trim()
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
</script>

<template>
  <!-- ─── Filter toolbar ─── -->
  <div class="filter-toolbar" v-if="!loading">
    <div class="filter-group">
      <span class="filter-label">Order:</span>
      <button
        class="filter-btn"
        :class="{ active: filterOrder === 'date' }"
        @click="filterOrder = 'date'"
      >
        Date
      </button>
      <button
        class="filter-btn"
        :class="{ active: filterOrder === 'topo' }"
        @click="filterOrder = 'topo'"
      >
        Topo
      </button>
    </div>
    <label class="filter-checkbox">
      <input type="checkbox" v-model="filterFirstParent" />
      <span>First Parent</span>
    </label>
  </div>

  <!-- Loading State -->
  <div v-if="loading" class="commit-list-loading">
    <div class="loading">
      <div class="spinner"></div>
      <span style="margin-left: 8px; color: #888;">Loading commits...</span>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="commit-list-error">
    <div class="empty-state">
      <h3 class="empty-state-title">Error loading commits</h3>
      <p class="empty-state-message">{{ error }}</p>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="commits.length === 0" class="commit-list-empty">
    <div class="empty-state">
      <h3 class="empty-state-title">No commits</h3>
      <p class="empty-state-message">This repository has no commits yet.</p>
    </div>
  </div>

  <!-- Commit Table with inline graph -->
  <div v-else class="commit-table-wrapper">
    <table class="commit-table">
      <thead>
        <tr>
          <th :style="{ width: graphColWidth + 'px' }">Graph</th>
          <th>Subject</th>
          <th style="width: 160px;">Author</th>
          <th style="width: 80px;">Hash</th>
          <th style="width: 140px;">Date</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(commit, idx) in commits"
          :key="commit.id"
          :data-commit-id="commit.id"
          :class="{ selected: selectedCommitId === commit.id }"
          @click="selectCommit(commit)"
          @dblclick="checkoutCommit(commit)"
          @contextmenu="showContextMenu($event, commit)"
        >
          <!-- Graph Column -->
          <td class="graph-col" v-html="getRowGraph(commit, idx)"></td>

          <!-- Subject Column -->
          <td class="subject-col">
            <!-- Local branch badges -->
            <span v-for="lb in commit._labels.local" :key="'l-' + lb" class="badge badge-branch">
              <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
                <path d="M5.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
                <path d="M4 7.5V12h1.5v-4.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <path d="M11 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" fill="currentColor"/>
                <path d="M12.5 9H7" fill="none" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              {{ lb }}
            </span>
            <!-- Remote branch badges (italic + bold) -->
            <span v-for="rb in commit._labels.remote" :key="'r-' + rb" class="badge badge-remote">
              <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
                <circle cx="8" cy="3" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <circle cx="4" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <line x1="8" y1="5.5" x2="4" y2="9.5" stroke="currentColor" stroke-width="1"/>
                <line x1="8" y1="5.5" x2="12" y2="9.5" stroke="currentColor" stroke-width="1"/>
              </svg>
              {{ rb.replace('origin/', '') }}
            </span>
            <!-- Tags -->
            <span v-for="t in commit._labels.tags" :key="'t-' + t" class="badge badge-tag">
              <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
                <path d="M2 2h5l7 7-5 5-7-7V2z" fill="none" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              {{ t }}
            </span>
            <!-- Stash badge -->
            <span v-for="s in commit._labels.stash" :key="'s-' + s" class="badge badge-stash">
              <svg class="badge-icon" viewBox="0 0 16 16" width="10" height="10">
                <rect x="3" y="2" width="10" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>
                <line x1="6" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.2"/>
                <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.2"/>
              </svg>
              {{ s }}
            </span>
            <span class="commit-subject">{{ commit.subject }}</span>
          </td>

          <!-- Author Column -->
          <td>
            <span class="author-tag" style="background-color: #4a90e2;">
              {{ commit.author.initials }}
            </span>
            {{ commit.author.name }}
          </td>

          <!-- Hash Column -->
          <td
            style="font-family: monospace; font-size: 11px; color: #007acc; cursor: pointer;"
            @click.stop="copyHash(commit)"
            title="Click to copy full hash"
          >
            {{ commit.hash }}
          </td>

          <!-- Date Column -->
          <td style="font-size: 11px; color: #666;">{{ commit.date }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Load More Button -->
    <div v-if="hasMore" class="load-more-row">
      <button
        class="load-more-btn"
        :disabled="loadingMore"
        @click="loadMore"
      >
        <span v-if="loadingMore" class="spinner-small"></span>
        {{ loadingMore ? 'Loading...' : 'Load more commits' }}
      </button>
    </div>

    <!-- Context Menu -->
    <teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="commit-context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div class="context-menu-header">
          {{ statusStore.current }}
        </div>
        <div class="context-menu-separator"></div>

        <!-- Checkout (for non-HEAD commits) -->
        <div
          v-if="!isCurrentHeadCommit"
          class="context-menu-item"
          @click="openCheckoutFFDialog(contextMenu.commit)"
        >
          <span class="context-menu-icon">🔀</span>
          <span class="context-menu-title">
            Checkout <strong>{{ contextMenu.commit?.hash }}</strong>
          </span>
        </div>

        <!-- Reset (not allowed on current HEAD) -->
        <div
          v-if="!isCurrentHeadCommit"
          class="context-menu-item"
          @click="openResetDialog(contextMenu.commit)"
        >
          <span class="context-menu-icon">↩</span>
          <span class="context-menu-title">
            Reset <strong>{{ statusStore.current }}</strong> to Here
          </span>
        </div>
      </div>
    </teleport>

    <!-- Reset Type Dialog -->
    <teleport to="body">
      <div v-if="resetDialog.visible" class="reset-overlay" @click.self="closeResetDialog">
        <div class="reset-dialog">
          <div class="reset-dialog-header">
            Reset {{ statusStore.current }} to
            <span class="reset-dialog-hash">{{ resetDialog.commit?.hash }}</span>
          </div>
          <div class="reset-dialog-subject">{{ resetDialog.commit?.subject }}</div>
          <div class="reset-dialog-body">
            <div
              v-for="rm in resetModes"
              :key="rm.id"
              class="reset-option"
              :class="{ danger: rm.id === 'hard' }"
              @click="resetToHere(resetDialog.commit, rm.id)"
            >
              <span class="reset-option-icon">{{ rm.icon }}</span>
              <div class="reset-option-label">
                <span class="reset-option-title">{{ rm.label }}</span>
                <span class="reset-option-desc">{{ rm.desc }}</span>
              </div>
            </div>
          </div>
          <div class="reset-dialog-footer">
            <button class="reset-dialog-cancel" @click="closeResetDialog">Cancel</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Checkout & Fast-Forward Dialog -->
    <CheckoutFastForwardDialog
      :show="checkoutFFDialog.visible"
      :local-branch="checkoutFFDialog.localBranch"
      :remote-branch="checkoutFFDialog.remoteBranch"
      @close="closeCheckoutFFDialog"
      @done="fetchCommits(true)"
    />
  </div>
</template>

<style scoped>
/* ─── Filter Toolbar ──────────────────────────────────────────── */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-label {
  font-size: 11px;
  color: #888;
  margin-right: 2px;
}

.filter-btn {
  padding: 3px 10px;
  font-size: 11px;
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #555;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover {
  background: #f0f0f0;
}

.filter-btn.active {
  background: #4a90e2;
  color: #fff;
  border-color: #4a90e2;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
}

.filter-checkbox input {
  margin: 0;
}

/* ─── Load / Error / Empty ───────────────────────────────────── */
.commit-list-loading,
.commit-list-error,
.commit-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.commit-list-loading .loading {
  display: flex;
  align-items: center;
}

/* ─── Table Wrapper ──────────────────────────────────────────── */
.commit-table-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-width: 400px;
  height: 100%;
}

/* ─── Badges ─── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  margin-right: 4px;
  white-space: nowrap;
}

.badge-icon {
  flex-shrink: 0;
}

.badge-branch {
  background-color: #fff;
  border: 1px solid #4a90e2;
  color: #333;
}

.badge-remote {
  background-color: #f0f6ff;
  border: 1px solid #7a9ec7;
  color: #4a6a8a;
  font-style: italic;
  font-weight: 700;
}

.badge-tag {
  background-color: #fff2cc;
  border: 1px solid #d6b656;
  color: #333;
}

.badge-stash {
  background-color: #fce4ec;
  border: 1px solid #e91e63;
  color: #880e4f;
  font-weight: 700;
}

.commit-subject {
  color: #333;
}

/* ─── Subject column ─── */
.subject-col {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Commit Table Styles ────────────────────────────────────── */
.commit-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.commit-table thead {
  position: sticky;
  top: 0;
  z-index: 5;
}

.commit-table th {
  background-color: #fafafa;
  border-bottom: 1px solid #ddd;
  font-size: 11px;
  color: #666;
  text-align: left;
  padding: 4px 6px;
}

.commit-table tr {
  height: 28px;
}

.commit-table tr:hover {
  background-color: #f7f9fa;
}

.commit-table tr.selected {
  background-color: #e5edf8 !important;
}

.commit-table td {
  padding: 2px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.commit-table .graph-col {
  padding: 0 !important;
  text-align: center;
  vertical-align: middle;
  line-height: 0;
}

.commit-table .subject-col {
  padding-left: 8px;
}

.commit-table :deep(.graph-svg) {
  width: 100%;
  height: 28px;
  display: block;
  vertical-align: top;
}

.author-tag {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 2px;
  font-size: 10px;
  color: #fff;
  font-weight: bold;
  margin-right: 4px;
}

/* ─── Load More ───────────────────────────────────────────────── */
.load-more-row {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.load-more-btn {
  padding: 6px 20px;
  font-size: 12px;
  color: #4a90e2;
  background: #fff;
  border: 1px solid #4a90e2;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.load-more-btn:hover:not(:disabled) {
  background: #f0f6ff;
}

.load-more-btn:disabled {
  color: #aaa;
  border-color: #ccc;
  cursor: not-allowed;
}

.spinner-small {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #4a90e2;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}

/* ─── Context Menu ─────────────────────────────────────────────── */
.commit-context-menu {
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  padding: 6px 0;
  min-width: 200px;
  font-size: 12px;
}

.context-menu-header {
  padding: 5px 14px 3px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-menu-item {
  padding: 7px 14px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: background-color 0.1s;
}

.context-menu-item:hover {
  background-color: #f0f6fc;
}

.context-menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.context-menu-title {
  font-size: 12px;
  line-height: 1.3;
}

.context-menu-separator {
  height: 1px;
  background: #e8e8e8;
  margin: 4px 0;
}

/* ─── Reset Type Dialog ────────────────────────────────────────── */
.reset-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  min-width: 360px;
  max-width: 440px;
  overflow: hidden;
}

.reset-dialog-header {
  padding: 16px 20px 4px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.reset-dialog-hash {
  font-family: 'SF Mono', Consolas, monospace;
  color: #007acc;
}

.reset-dialog-subject {
  padding: 0 20px 12px;
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #eee;
}

.reset-dialog-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reset-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.reset-option:hover {
  background-color: #f0f6fc;
}

.reset-option.danger:hover {
  background-color: #fff0f0;
}

.reset-option-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.reset-option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reset-option-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.reset-option.danger .reset-option-title {
  color: #cb2431;
}

.reset-option-desc {
  font-size: 11px;
  color: #888;
  line-height: 1.3;
}

.reset-dialog-footer {
  padding: 10px 20px 16px;
  display: flex;
  justify-content: center;
}

.reset-dialog-cancel {
  padding: 6px 24px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-dialog-cancel:hover {
  background: #e8e8e8;
  border-color: #aaa;
}
</style>
