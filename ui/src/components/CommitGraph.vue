<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useUiStore } from '../stores/ui.js'

const uiStore = useUiStore()

// ─── State ─────────────────────────────────────────────────────
const commits = ref([])
const selectedCommitId = ref(null)
const selectedCommit = ref(null)
const loading = ref(true)
const error = ref(null)

// ─── Right panel resizer ───────────────────────────────────────
const graphPanelRef = ref(null)
const graphResizerRef = ref(null)
let isDraggingGraph = false
let graphStartX = 0
let graphStartWidth = 0

function onGraphResizerMouseDown(e) {
  isDraggingGraph = true
  graphStartX = e.clientX
  if (graphPanelRef.value) graphStartWidth = graphPanelRef.value.offsetWidth
  if (graphResizerRef.value) graphResizerRef.value.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

function onMouseMove(e) {
  if (isDraggingGraph && graphPanelRef.value) {
    const deltaX = graphStartX - e.clientX
    const newWidth = graphStartWidth + deltaX
    if (newWidth >= 140 && newWidth <= 500) {
      graphPanelRef.value.style.width = newWidth + 'px'
    }
  }
}

function onMouseUp() {
  if (isDraggingGraph) {
    isDraggingGraph = false
    if (graphResizerRef.value) graphResizerRef.value.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  fetchCommits()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
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

// ─── Actions ───────────────────────────────────────────────────
function selectCommit(commit) {
  selectedCommitId.value = commit.id
  selectedCommit.value = commit
}

defineExpose({ selectedCommit })

// ═══════════════════════════════════════════════════════════════
//  LANE ROUTING (Track Allocation)
// ═══════════════════════════════════════════════════════════════
//
//  1. Topological order (given by API order — newest first)
//  2. Master (trunk) always stays on lane 0
//  3. Branch point → allocate next free lane to the right
//  4. Merge point → reclaim lane after merge
//  5. Each row tracks ALL active lanes that pass through it
//
//  For now, simulate lane routing based on refs / author grouping.
//  When real DAG data (parents) arrives, replace the heuristic.
// ═══════════════════════════════════════════════════════════════

const LANE_COLORS = ['#f5a623', '#4a90e2', '#e056fd', '#28a745', '#cb2431']
const LANE_X_BASE = 25  // lane 0 x position
const LANE_X_STEP = 30  // spacing between lanes

/**
 * Lane routing (Track Allocation)
 *
 * Heuristic for flat commit list without parent DAG info:
 *  1. Lane 0 = trunk (master/main) — runs through all commits
 *  2. Different branch names get lanes 1, 2, 3…
 *  3. A branch lane is active from its first occurrence to its last
 *  4. Branch point = when a non-trunk lane FIRST appears
 *  5. Merge point = when a non-trunk lane LAST appears
 *
 * Returns array (same order):
 *   { id, lane, activeLanes[], isBranchPoint, isMergePoint, … }
 */
function routeLanes(data) {
  if (!data || !data.length) return []

  // ── Pass 1: assign lanes ──
  //  Only refs that look like branch names (contain '/') get dedicated lanes.
  //  Tags, HEAD, and empty refs all stay on trunk (lane 0).
  const refToLane = new Map()
  let nextLane = 1

  const commitLanes = data.map((c) => {
    const ref = (c.refs || '').trim()
    if (!ref) return 0
    // Treat as branch reference only if it looks like a branch path
    // (e.g., "origin/feature-xxx", "refs/heads/xxx")
    const isBranchRef = ref.includes('/')
    if (!isBranchRef) return 0

    if (!refToLane.has(ref)) {
      refToLane.set(ref, nextLane++)
    }
    return refToLane.get(ref)
  })

  // ── Pass 2: determine active range for each lane ──
  const laneFirst = new Map()
  const laneLast = new Map()
  commitLanes.forEach((lane, idx) => {
    if (!laneFirst.has(lane) || idx < laneFirst.get(lane)) laneFirst.set(lane, idx)
    if (!laneLast.has(lane) || idx > laneLast.get(lane)) laneLast.set(lane, idx)
  })
  // Trunk (lane 0) runs the full list
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

    // Row is a branch point if it's the FIRST occurrence of a non-trunk lane
    const isBranchPoint = myLane !== 0 && idx === laneFirst.get(myLane)
    // Row is a merge point if it's the LAST occurrence of a non-trunk lane
    const isMergePoint = myLane !== 0 && idx === laneLast.get(myLane)
    // Trunk spawns a branch: trunk commit right BEFORE a new non-trunk lane
    const isTrunkBranchOut = myLane === 0 && nextLane !== 0 && nextLane !== myLane && idx + 1 === laneFirst.get(nextLane)
    // Trunk absorbs a merge: trunk commit right AFTER a non-trunk lane ends
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

// ═══════════════════════════════════════════════════════════════
//  RIGHT PANEL — OVERVIEW GRAPH
// ═══════════════════════════════════════════════════════════════

const overviewData = computed(() => {
  const data = commits.value
  if (!data || !data.length) return { height: 0, segments: [], nodes: [] }

  const routes = laneRouting.value
  if (!routes || !routes.length) return { height: 0, segments: [], nodes: [] }

  const nodeHeight = 28
  const totalHeight = data.length * nodeHeight + 40

  // Build nodes
  const nodes = data.map((c, idx) => {
    const r = routes[idx]
    return {
      id: c.id,
      x: getLaneX(r.lane),
      y: 20 + idx * nodeHeight + nodeHeight / 2,
      lane: r.lane,
      color: getLaneColor(r.lane),
    }
  })

  // Build segments: for each consecutive pair, connect lanes properly
  const segments = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i]
    const to = nodes[i + 1]

    if (from.lane === to.lane) {
      // Same lane → straight line, colored by lane
      segments.push({
        type: 'line',
        x1: from.x, y1: from.y,
        x2: to.x, y2: to.y,
        color: from.color,
      })
    } else {
      // Different lane → curve from source lane to target lane
      // Color = source lane (the branch that's diverging/merging)
      const midY = (from.y + to.y) / 2
      segments.push({
        type: 'curve',
        x1: from.x, y1: from.y,
        x2: to.x, y2: to.y,
        midY,
        color: getLaneColor(from.lane),
      })

      // Also draw a straight continuation on each lane
      // (the through-line for lanes that persist)
      const fromRoute = routes[i]
      const toRoute = routes[i + 1]

      // For lanes that continue through both rows, draw vertical lines
      for (const lane of fromRoute.activeLanes) {
        if (toRoute.activeLanes.includes(lane) && lane !== from.lane && lane !== to.lane) {
          const lx = getLaneX(lane)
          segments.push({
            type: 'line',
            x1: lx, y1: from.y,
            x2: lx, y2: to.y,
            color: getLaneColor(lane),
          })
        }
      }
    }
  }

  return { height: totalHeight, segments, nodes }
})
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

  <!-- Split Layout: Table + Graph Overview -->
  <div v-else class="commit-split-container">
    <!-- Left: Commit Table -->
    <div class="commit-table-panel">
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
          >
            <!-- Graph Column -->
            <td class="graph-col" v-html="getRowGraph(commit, idx)"></td>

            <!-- Subject Column -->
            <td>
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
    </div>

    <!-- Graph Resizer -->
    <div
      class="graph-resizer"
      ref="graphResizerRef"
      @mousedown="onGraphResizerMouseDown"
    ></div>

    <!-- Right: Commit Graph Overview -->
    <div class="graph-panel" ref="graphPanelRef">
      <div class="graph-panel-header">
        <span class="graph-panel-title">Graph</span>
      </div>
      <div class="graph-panel-body">
        <svg
          :viewBox="`0 0 200 ${overviewData.height}`"
          class="graph-overview-svg"
          preserveAspectRatio="xMidYMin meet"
        >
          <!-- Segments: lines and curves -->
          <template v-for="(seg, i) in overviewData.segments" :key="'seg-' + i">
            <line
              v-if="seg.type === 'line'"
              :x1="seg.x1" :y1="seg.y1"
              :x2="seg.x2" :y2="seg.y2"
              :stroke="seg.color"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <path
              v-else
              :d="`M ${seg.x1} ${seg.y1} Q ${seg.x1} ${seg.midY} ${seg.x2} ${seg.y2}`"
              fill="none"
              :stroke="seg.color"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </template>

          <!-- Commit dots on every row -->
          <circle
            v-for="node in overviewData.nodes"
            :key="'n-' + node.id"
            :cx="node.x"
            :cy="node.y"
            r="4"
            :fill="node.color"
            stroke="#fff"
            stroke-width="1.5"
            class="graph-overview-node"
          />
        </svg>
      </div>
    </div>
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

/* ─── Split Layout ───────────────────────────────────────────── */
.commit-split-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.commit-table-panel {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  min-width: 400px;
}

/* ─── Graph Resizer ──────────────────────────────────────────── */
.graph-resizer {
  width: 5px;
  background-color: #e2e2e2;
  cursor: col-resize;
  transition: background-color 0.15s;
  z-index: 10;
  flex-shrink: 0;
}

.graph-resizer:hover,
.graph-resizer.dragging {
  background-color: #007acc;
}

/* ─── Graph Panel (Right Side) ───────────────────────────────── */
.graph-panel {
  width: 160px;
  min-width: 120px;
  max-width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #fafbfc;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

.graph-panel-header {
  padding: 8px 12px;
  font-weight: bold;
  font-size: 12px;
  color: #333;
  border-bottom: 1px solid #ececec;
  background-color: #f5f6f8;
  flex-shrink: 0;
}

.graph-panel-title {
  font-size: 12px;
  font-weight: bold;
  color: #555;
}

.graph-panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.graph-overview-svg {
  width: 100%;
  display: block;
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
</style>
