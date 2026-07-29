<script setup>
import { ref, reactive, computed } from 'vue'

// ─── Branch color palette ──────────────────────────────────────
const C = {
  master: '#f5a623',
  fix41651: '#4a90e2',
  lego: '#e056fd',
}

// ─── Mock commits (15 rows matching docs/uiux/index.html) ──────
const commits = [
  // Row 1: master HEAD
  {
    id: 1, hash: 'ee57040',
    subject: 'Update package-lock.json',
    subjectStrong: true,
    author: { initials: 'TB', cls: 'bot', name: 'TypeScript Bot' },
    date: '27 Nov 2020 07:21',
    badge: { type: 'branch', icon: '✓', name: 'master' },
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 14, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 5, fill: C.master, stroke: '#fff', 'stroke-width': 1.5 } },
    ],
    toggle: null,
  },
  // Row 2: master
  {
    id: 2, hash: '411c6d0',
    subject: 'Fix getTypeFacts for pattern template literal types (#41693)',
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '26 Nov 2020 17:55',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 3: master
  {
    id: 3, hash: 'd616d8f',
    subject: 'Update package-lock.json',
    author: { initials: 'TB', cls: 'bot', name: 'TypeScript Bot' },
    date: '26 Nov 2020 07:21',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 4: master
  {
    id: 4, hash: 'ec1490f',
    subject: 'Properly cache types for shared control flow nodes (#41665)',
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '26 Nov 2020 01:51',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 5: branch point fix41651 (toggle point)
  {
    id: 5, hash: '5e2509b',
    subject: 'Accept new baselines',
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '25 Nov 2020 21:17',
    badge: { type: 'tag', name: 'origin/fix41651' },
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'path', attrs: { d: 'M 25 14 Q 38 14 50 28', fill: 'none', stroke: C.fix41651, 'stroke-width': 2.5 }, cls: 'toggle-branch-line' },
    ],
    toggle: { group: 'fix41651', cx: 25, cy: 14, stroke: C.master, extraCls: ['fix41651-merge-line'] },
  },
  // Row 6: fix41651 branch commit 1
  {
    id: 6, hash: '24c6da9',
    subject: 'Add tests',
    subjectIndent: true,
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '25 Nov 2020 21:17',
    badge: null,
    group: 'fix41651',
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'line', attrs: { x1: 50, y1: 0, x2: 50, y2: 28, stroke: C.fix41651, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 50, cy: 14, r: 4, fill: C.fix41651 } },
    ],
    toggle: null,
  },
  // Row 7: fix41651 branch commit 2
  {
    id: 7, hash: 'f9e8d7c',
    subject: 'Update test snapshots',
    subjectIndent: true,
    author: { initials: 'SG', cls: 'sg', name: 'Song Gao' },
    date: '25 Nov 2020 20:45',
    badge: null,
    group: 'fix41651',
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'line', attrs: { x1: 50, y1: 0, x2: 50, y2: 28, stroke: C.fix41651, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 50, cy: 14, r: 4, fill: C.fix41651 } },
    ],
    toggle: null,
  },
  // Row 8: merge back to master
  {
    id: 8, hash: '3c3fbbd',
    subject: 'Normalize `${string}` to just string, fix getTypeFacts',
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '25 Nov 2020 18:49',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'path', attrs: { d: 'M 50 0 Q 38 14 25 14', fill: 'none', stroke: C.fix41651, 'stroke-width': 2.5 }, cls: 'fix41651-merge-line' },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 9: master
  {
    id: 9, hash: 'd5779c7',
    subject: 'replace whole path if directory separator appears for import completion. (#41412)',
    author: { initials: 'SG', cls: 'sg', name: 'Song Gao' },
    date: '25 Nov 2020 18:37',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 10: master
  {
    id: 10, hash: '242e020',
    subject: 'fix(41216): update baseline (#41687)',
    author: { initials: 'OT', cls: 'ot', name: 'Oleksandr T' },
    date: '25 Nov 2020 18:11',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 11: LEGO merge point (toggle point)
  {
    id: 11, hash: '86429aa',
    subject: 'LEGO: Merge pull request 41678',
    subjectStrong: true,
    author: { initials: 'cs', cls: 'cs', name: 'csigs' },
    date: '25 Nov 2020 01:11',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'path', attrs: { d: 'M 25 14 Q 38 14 50 28', fill: 'none', stroke: C.lego, 'stroke-width': 2.5 }, cls: 'toggle-branch-line' },
    ],
    toggle: { group: 'lego', cx: 25, cy: 14, stroke: C.master, extraCls: ['lego-merge-line'] },
  },
  // Row 12: LEGO branch commit
  {
    id: 12, hash: 'dbcbe93',
    subject: 'LEGO: check in for master to temporary branch.',
    subjectIndent: true,
    author: { initials: 'cs', cls: 'cs', name: 'csigs' },
    date: '25 Nov 2020 01:11',
    badge: null,
    group: 'lego',
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'line', attrs: { x1: 50, y1: 0, x2: 50, y2: 28, stroke: C.lego, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 50, cy: 14, r: 4, fill: C.lego } },
    ],
    toggle: null,
  },
  // Row 13: merge back to master
  {
    id: 13, hash: '5adb55e',
    subject: 'feat(41216): show JSDoc for aliases (#41452)',
    author: { initials: 'OT', cls: 'ot', name: 'Oleksandr T' },
    date: '24 Nov 2020 23:40',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'path', attrs: { d: 'M 50 0 Q 38 14 25 14', fill: 'none', stroke: C.lego, 'stroke-width': 2.5 }, cls: 'lego-merge-line' },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 14: tagged version
  {
    id: 14, hash: 'a1b2c3d',
    subject: 'Bump version to 4.2.0',
    author: { initials: 'TB', cls: 'bot', name: 'TypeScript Bot' },
    date: '20 Nov 2020 10:00',
    badge: { type: 'tag', name: 'v4.2.0' },
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 28, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
  // Row 15: first commit
  {
    id: 15, hash: '0000001',
    subject: 'Initial commit',
    author: { initials: 'AH', cls: 'ah', name: 'Anders Hejlsberg' },
    date: '1 Jan 2020 00:00',
    badge: null,
    group: null,
    graph: [
      { tag: 'line', attrs: { x1: 25, y1: 0, x2: 25, y2: 14, stroke: C.master, 'stroke-width': 2.5 } },
      { tag: 'circle', attrs: { cx: 25, cy: 14, r: 4, fill: C.master } },
    ],
    toggle: null,
  },
]

// ─── State ─────────────────────────────────────────────────────
const selectedCommitId = ref(null)
const collapsedGroups = reactive({})
const selectedCommit = ref(null)

// ─── Computed: toggle states ───────────────────────────────────
function isGroupCollapsed(group) {
  return !!collapsedGroups[group]
}

function isCommitVisible(commit) {
  if (!commit.group) return true
  return !collapsedGroups[commit.group]
}

function isExtraLineVisible(cls) {
  // extraCls lines should be hidden when their group is collapsed
  // Map cls to group name
  for (const [group, collapsed] of Object.entries(collapsedGroups)) {
    if (!collapsed) continue
    const toggle = commits.find(c => c.toggle && c.toggle.group === group)
    if (toggle && toggle.toggle.extraCls.includes(cls)) {
      return false
    }
  }
  return true
}

// ─── Actions ───────────────────────────────────────────────────
function selectCommit(commit) {
  selectedCommitId.value = commit.id
  selectedCommit.value = commit
}

function toggleBranch(group) {
  collapsedGroups[group] = !collapsedGroups[group]
}

function getChevronPath(group) {
  return collapsedGroups[group]
    ? 'M 23 11 L 28 14 L 23 17'   // collapsed (pointing right)
    : 'M 22 12 L 25 17 L 28 12'   // expanded (pointing down)
}

// Expose selected commit for parent access
defineExpose({ selectedCommit })
</script>

<template>
  <table class="commit-table">
    <thead>
      <tr>
        <th style="width: 80px;">Graph</th>
        <th>Subject</th>
        <th style="width: 140px;">Author</th>
        <th style="width: 80px;">Hash</th>
        <th style="width: 130px;">Date</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="commit in commits"
        :key="commit.id"
          :data-commit-id="commit.id"
          :class="{
            selected: selectedCommitId === commit.id,
            'collapsed-child': !isCommitVisible(commit),
          }"
          @click="selectCommit(commit)"
        >
        <!-- Graph Column -->
        <td
          class="graph-col"
          :class="{ 'graph-col-toggle': !!commit.toggle }"
        >
            <svg class="graph-svg" viewBox="0 0 80 28">
            <!-- Render SVG elements -->
            <template v-for="(el, ei) in commit.graph" :key="ei">
              <line
                v-if="el.tag === 'line'"
                v-bind="el.attrs"
                :class="el.cls"
                :style="el.cls && !isExtraLineVisible(el.cls) ? { opacity: 0 } : {}"
              />
              <circle
                v-if="el.tag === 'circle'"
                v-bind="el.attrs"
              />
              <path
                v-if="el.tag === 'path'"
                v-bind="el.attrs"
                :class="el.cls"
                :style="el.cls && !isExtraLineVisible(el.cls) ? { opacity: 0 } : {}"
              />
            </template>

            <!-- Toggle overlay (ring + chevron) -->
            <template v-if="commit.toggle">
              <circle
                :cx="commit.toggle.cx"
                :cy="commit.toggle.cy"
                r="8"
                fill="#fff"
                class="toggle-bg"
              />
              <circle
                :cx="commit.toggle.cx"
                :cy="commit.toggle.cy"
                r="7"
                fill="none"
                :stroke="commit.toggle.stroke"
                stroke-width="2.5"
                class="toggle-part toggle-ring"
                @click.stop="toggleBranch(commit.toggle.group)"
              />
              <path
                :d="getChevronPath(commit.toggle.group)"
                fill="none"
                :stroke="commit.toggle.stroke"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="toggle-part toggle-chevron"
                @click.stop="toggleBranch(commit.toggle.group)"
              />
            </template>
          </svg>
        </td>

        <!-- Subject Column -->
        <td>
          <template v-if="commit.badge">
            <span v-if="commit.badge.type === 'branch'" class="badge-branch">
              {{ commit.badge.icon }} {{ commit.badge.name }}
            </span>
            <span v-else-if="commit.badge.type === 'tag'" class="badge-tag">
              {{ commit.badge.name }}
            </span>
          </template>
          <span :style="commit.subjectIndent ? { paddingLeft: '20px' } : {}">
            <strong v-if="commit.subjectStrong">{{ commit.subject }}</strong>
            <template v-else>{{ commit.subject }}</template>
          </span>
        </td>

        <!-- Author Column -->
        <td>
          <span :class="['author-tag', 'author-' + commit.author.cls]">
            {{ commit.author.initials }}
          </span>
          {{ commit.author.name }}
        </td>

        <!-- Hash Column -->
        <td style="font-family: monospace;">{{ commit.hash }}</td>

        <!-- Date Column -->
        <td>{{ commit.date }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
/* Only component-scoped overrides; most styles come from assets/styles.css */
.graph-col-toggle {
  cursor: pointer;
}

.toggle-bg {
  pointer-events: none;
}

.toggle-part {
  cursor: pointer;
}

.graph-col-toggle:hover .toggle-part {
  stroke: #4a90e2 !important;
}

.collapsed-child {
  display: none;
}
</style>
