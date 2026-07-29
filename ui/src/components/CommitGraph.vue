<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useUiStore } from '../stores/ui.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'
import CheckoutFastForwardDialog from './CheckoutFastForwardDialog.vue'

const uiStore = useUiStore()
const statusStore = useStatusStore()

// ─── State ─────────────────────────────────────────────────────
const commits = ref([])
const selectedCommitId = ref(null)
const selectedCommit = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(() => {
  fetchCommits()
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

// ─── Fetch real commits from API ───────────────────────────────
async function fetchCommits() {
  loading.value = true
  error.value = null
  selectedCommit.value = null
  selectedCommitId.value = null

  try {
    const { get } = useApi()
    const data = await get('/commits?limit=50')
    commits.value = data.map(c => ({
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
  } catch (e) {
    console.error('Failed to fetch commits:', e)
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ─── Watch for branch-switch refresh ───────────────────────────
watch(() => uiStore.commitRefreshKey, () => {
  fetchCommits()
})

// ─── Context Menu ─────────────────────────────────────────────
const contextMenu = ref({ visible: false, x: 0, y: 0, commit: null })
const resetDialog = ref({ visible: false, commit: null })
const pushDialog = ref({ visible: false })

// ── Checkout & Fast-Forward Dialog ────────────────────────────
const checkoutFFDialog = ref({ visible: false, localBranch: '', remoteBranch: '' })

function openCheckoutFFDialog(commit) {
  // Derive local & remote branches from commit refs
  const labels = commit._labels || { local: [], remote: [], tags: [] }

  let localBranch = ''
  let remoteBranch = ''

  // Prioritize matching pairs: e.g., 'Tony' ↔ 'origin/Tony'
  if (labels.local.length > 0) {
    localBranch = labels.local[0]
    // Look for a matching remote branch
    const matchingRemote = labels.remote.find(r => r === `origin/${localBranch}`)
    if (matchingRemote) {
      remoteBranch = matchingRemote
    } else if (labels.remote.length > 0) {
      remoteBranch = labels.remote[0]
    } else {
      remoteBranch = `origin/${localBranch}`
    }
  } else if (labels.remote.length > 0) {
    // Only remote refs available – strip origin/ for local
    const full = labels.remote[0]
    remoteBranch = full
    if (full.startsWith('origin/')) {
      localBranch = full.slice(7)
    } else {
      localBranch = full
    }
  } else {
    // Fallback to current branch
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

// ── Push ──────────────────────────────────────────────────────
function openPushDialog() {
  pushDialog.value = { visible: true }
  closeContextMenu()
}

function closePushDialog() {
  pushDialog.value.visible = false
}

const pushModes = [
  { id: 'normal',   label: 'Normal Push',    desc: '推送目前分支到 origin',                     icon: '📤' },
  { id: 'upstream', label: 'Push & Set Upstream', desc: '推送 + 設定 upstream（新分支第一次用）', icon: '🔗' },
  { id: 'force',    label: 'Force Push',     desc: '⚠ 強制推送，覆蓋遠端歷史',                  icon: '⚠️' },
]

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

function selectCommitByHash(hash) {
  const commit = commits.value.find(c => c.fullHash === hash || c.id === hash)
  if (commit) {
    selectCommit(commit)
  }
}

defineExpose({ selectedCommit, selectCommitByHash })

// ═══════════════════════════════════════════════════════════════
//  LANE ROUTING (Track Allocation) — parent-hash based
// ═══════════════════════════════════════════════════════════════
//
//  Algorithm:
//    1. HEAD (data[0]) → lane 0 (trunk)
//    2. Walk forward: if commit[i] is the parent of commit[i-1] (i.e., linear),
//       it inherits the same lane.
//    3. Else: commit[i-1]'s parent is NOT commit[i] → this means
//       commit[i-1] is a merge or the first commit of a branch.
//       -> commit[i] gets a new lane OR reuses an already-assigned lane.
//
//  Active lanes per row: determined by each lane's first→last row span.
//  Branch/merge events: detected when lane appears/disappears.
// ═══════════════════════════════════════════════════════════════

const LANE_COLORS = ['#f5a623', '#4a90e2', '#e056fd', '#28a745', '#cb2431']
const LANE_X_BASE = 25
const LANE_X_STEP = 30

function routeLanes(data) {
  if (!data || !data.length) return []

  // hash → lane index
  const hashToLane = new Map()
  let nextLane = 1

  // ── Pass 1: assign lanes by following parent chain ──
  const commitLanes = data.map((c, idx) => {
    let lane

    if (idx === 0) {
      // HEAD → lane 0 (trunk)
      lane = 0
    } else {
      const prev = data[idx - 1]
      // Does this commit connect linearly to the previous one?
      // Compare using full hash (parents from API are full 40-char hashes)
      const isParentOfPrev = prev.parents && prev.parents.some(ph => ph === c.fullHash)

      if (isParentOfPrev) {
        // Linear: this is the parent of the previous commit → same lane
        lane = hashToLane.get(prev.hash)
      } else if (hashToLane.has(c.hash)) {
        // Already assigned (was a parent of an earlier commit from another branch)
        lane = hashToLane.get(c.hash)
      } else {
        // New branch: this commit is NOT the parent of the previous one
        lane = nextLane++
      }
    }

    hashToLane.set(c.hash, lane)
    return lane
  })

  // ── Pass 2: determine active range for each lane ──
  const laneFirst = new Map()
  const laneLast = new Map()
  commitLanes.forEach((lane, idx) => {
    if (!laneFirst.has(lane) || idx < laneFirst.get(lane)) laneFirst.set(lane, idx)
    if (!laneLast.has(lane) || idx > laneLast.get(lane)) laneLast.set(lane, idx)
  })
  laneFirst.set(0, 0)
  laneLast.set(0, data.length - 1)

  const maxLane = Math.max(...Array.from(laneFirst.keys()))

  // ── Pass 3: build per-row info ──
  return data.map((c, idx) => {
    const myLane = commitLanes[idx]
    const prevLane = idx > 0 ? commitLanes[idx - 1] : myLane
    const nextLane = idx < data.length - 1 ? commitLanes[idx + 1] : myLane

    // Active lanes at this row
    const activeLanes = []
    for (let l = 0; l <= maxLane; l++) {
      const first = laneFirst.get(l)
      const last = laneLast.get(l)
      if (first !== undefined && last !== undefined && idx >= first && idx <= last) {
        activeLanes.push(l)
      }
    }

    // Branch point: first occurrence of a non-trunk lane
    const isBranchPoint = myLane !== 0 && idx === laneFirst.get(myLane)
    // Merge point: last occurrence of a non-trunk lane
    const isMergePoint = myLane !== 0 && idx === laneLast.get(myLane)
    // Trunk spawns a branch: trunk row just before a new non-trunk lane starts
    const isTrunkBranchOut = myLane === 0 && nextLane !== 0 && nextLane !== myLane && idx + 1 === laneFirst.get(nextLane)
    // Trunk absorbs a merge: trunk row just after a non-trunk lane ends
    const isTrunkMergeIn = myLane === 0 && prevLane !== 0 && prevLane !== myLane && idx - 1 === laneLast.get(prevLane)

    return {
      id: c.id,
      lane: myLane,
      activeLanes,
      prevLane,
      nextLane,
      isBranchPoint,
      isMergePoint,
      isTrunkBranchOut,
      isTrunkMergeIn,
    }
  })
}

// ─── Computed lane routing ─────────────────────────────────────
const laneRouting = computed(() => {
  return routeLanes(commits.value)
})

// ─── Convenience: laneInfo lookup ──────────────────────────────
function getLaneX(lane) {
  return LANE_X_BASE + lane * LANE_X_STEP
}

function getLaneColor(lane) {
  return LANE_COLORS[lane % LANE_COLORS.length]
}

// ═══════════════════════════════════════════════════════════════
//  PER-ROW SVG GRAPH COLUMN
// ═══════════════════════════════════════════════════════════════
//
//  Each row draws:
//  1. Vertical through-lines for EVERY active lane
//  2. Branch curves when lanes appear/disappear
//  3. The commit dot on its own lane (with optional ring)
// ═══════════════════════════════════════════════════════════════

function getRowGraph(commit, index) {
  const data = commits.value
  if (!data || !data.length) return ''

  const routes = laneRouting.value
  if (!routes || index >= routes.length) return ''

  const r = routes[index]
  const isFirst = index === 0
  const isLast = index === data.length - 1
  const nodeY = 14
  const topY = 0
  const botY = 28
  const viewW = 80

  let svg = `<svg class="graph-svg" viewBox="0 0 ${viewW} 28" xmlns="http://www.w3.org/2000/svg">`

  // ── 1. Draw vertical through-lines for each active lane ──
  for (const lane of r.activeLanes) {
    const cx = getLaneX(lane)
    const color = getLaneColor(lane)
    const isMyLane = lane === r.lane

    // Determine lane-specific events
    const laneWasActivePrev = index > 0 && routes[index - 1].activeLanes.includes(lane)
    const laneIsActiveNext = index < data.length - 1 && routes[index + 1].activeLanes.includes(lane)

    // Does this lane have a branch event at this row?
    // A lane "branches in" if it's new at this row (wasn't active before)
    const laneBranchesIn = !laneWasActivePrev && laneIsActiveNext
    // A lane "merges out" if it ends at this row (won't be active next)
    const laneMergesOut = laneWasActivePrev && !laneIsActiveNext

    // ── Vertical line (top half) ──
    if (laneWasActivePrev && !laneBranchesIn) {
      // Simple vertical continuation from above
      svg += `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${nodeY}" stroke="${color}" stroke-width="2.5" />`
    } else if (laneBranchesIn && lane !== r.lane) {
      // This lane branches IN from below (curve from my lane to this lane)
      const myCx = getLaneX(r.lane)
      svg += `<path d="M ${myCx} ${topY} Q ${(myCx + cx) / 2} ${topY} ${cx} ${nodeY}" fill="none" stroke="${color}" stroke-width="2.5" />`
    }

    // ── Vertical line (bottom half) ──
    if (laneIsActiveNext && !laneMergesOut) {
      // Simple vertical continuation downward
      svg += `<line x1="${cx}" y1="${nodeY}" x2="${cx}" y2="${botY}" stroke="${color}" stroke-width="2.5" />`
    } else if (laneMergesOut && lane !== r.lane) {
      // This lane merges OUT (curve from this lane to my lane)
      const myCx = getLaneX(r.lane)
      svg += `<path d="M ${cx} ${nodeY} Q ${(myCx + cx) / 2} ${botY} ${myCx} ${botY}" fill="none" stroke="${color}" stroke-width="2.5" />`
    }
  }

  // ── 2. Draw commit dot on every row ──
  //  Branch/merge points get toggle ring (+ chevron) instead of a plain dot
  //  First commit (HEAD) gets a larger dot with white border
  const dotCx = getLaneX(r.lane)
  const dotColor = getLaneColor(r.lane)

  // Ring + chevron only on trunk commits that spawn a branch (divergence point)
  const isBranchRow = r.isTrunkBranchOut

  if (isBranchRow) {
    // Toggle ring: white inner + colored stroke
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="8" fill="#fff" />`
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="7" fill="none" stroke="${dotColor}" stroke-width="2.5" />`
    // Chevron pointing down
    svg += `<path d="M ${dotCx - 3} ${nodeY - 4} L ${dotCx} ${nodeY} L ${dotCx + 3} ${nodeY - 4}" fill="none" stroke="${dotColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
  } else if (isFirst) {
    // HEAD commit: larger dot with white border
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="5" fill="${dotColor}" stroke="#fff" stroke-width="1.5" />`
  } else {
    // Normal commit: solid filled circle
    svg += `<circle cx="${dotCx}" cy="${nodeY}" r="4" fill="${dotColor}" />`
  }

  svg += `</svg>`
  return svg
}

// ─── Parse refs string into structured labels ───────────────
//  'HEAD -> Tony, origin/Tony' → { local: ['Tony'], remote: ['origin/Tony'] }
//  'origin/main, 測試, main'   → { local: ['測試', 'main'], remote: ['origin/main'] }
function parseRefs(refsStr) {
  const labels = { local: [], remote: [], tags: [] }
  if (!refsStr) return labels

  refsStr.split(',').forEach(part => {
    const name = part.trim()
    if (!name || name === 'HEAD') return
    // Strip 'HEAD -> ' prefix (e.g., 'HEAD -> Tony' → 'Tony')
    const clean = name.replace(/^HEAD -> /, '').trim()
    if (!clean) return

    if (clean.startsWith('origin/') || clean.startsWith('refs/remotes/')) {
      labels.remote.push(clean)
    } else if (clean.startsWith('refs/tags/') || /^v?\d+\./.test(clean)) {
      labels.tags.push(clean)
    } else {
      labels.local.push(clean)
    }
  })
  return labels
}
</script>

<template>
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
          <th style="width: 80px;">Graph</th>
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
          @dblclick="openCheckoutFFDialog(commit)"
          @contextmenu="showContextMenu($event, commit)"
        >
          <!-- Graph Column -->
          <td class="graph-col" v-html="getRowGraph(commit, idx)"></td>

          <!-- Subject Column -->
          <td>
            <span v-for="lb in commit._labels.local" :key="'l-' + lb" class="badge-branch">✓ {{ lb }}</span>
            <span v-for="lb in commit._labels.remote" :key="'r-' + lb" class="badge-tag">{{ lb.replace('origin/', '') }}</span>
            <span>{{ commit.subject }}</span>
          </td>

          <!-- Author Column -->
          <td>
            <span class="author-tag" style="background-color: #4a90e2;">
              {{ commit.author.initials }}
            </span>
            {{ commit.author.name }}
          </td>

          <!-- Hash Column -->
          <td style="font-family: monospace; font-size: 11px; color: #007acc;">
            {{ commit.hash }}
          </td>

          <!-- Date Column -->
          <td style="font-size: 11px; color: #666;">{{ commit.date }}</td>
        </tr>
      </tbody>
    </table>

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
        <div
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
      @done="fetchCommits"
    />
  </div>
</template>

<style scoped>
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

/* ─── Subject column badges (docs/uiux style) ─── */
.badge-branch {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background-color: #fff;
  border: 1px solid #4a90e2;
  color: #333;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  margin-right: 4px;
}

.badge-tag {
  display: inline-flex;
  align-items: center;
  background-color: #fff2cc;
  border: 1px solid #d6b656;
  color: #333;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 10px;
  margin-right: 4px;
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
  border-bottom: 1px solid #f0f0f0;
}

.commit-table .graph-col {
  padding: 0 !important;
  text-align: center;
  width: 80px;
}

.commit-table :deep(.graph-svg) {
  width: 100%;
  height: 28px;
  display: block;
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
