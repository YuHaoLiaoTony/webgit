<script setup>
import { ref, computed, reactive } from 'vue'
import { showToast } from '../composables/useToast.js'
import DiffViewer from './DiffViewer.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  selectedCommit: { type: Object, default: null },
})

// ─── Tabs ──────────────────────────────────────────────────────────────
const activeTab = ref('changes')

function setTab(tab) {
  activeTab.value = tab
}

// ─── Commit detail mock data ──────────────────────────────────────────
const authorColors = {
  TB: '#2da44e',
  AH: '#107c41',
  SG: '#e3008c',
  OT: '#0078d4',
  AB: '#107c41',
  cs: '#f7a242',
}

const authorNames = {
  TB: 'TypeScript Bot',
  AH: 'Anders Hejlsberg',
  SG: 'Song Gao',
  OT: 'Oleksandr T',
  AB: 'Andrew Branch',
  cs: 'csigs',
}

const authorEmails = {
  TB: 'typescriptbot@microsoft.com',
  AH: 'andersh@microsoft.com',
  SG: 'songgao@microsoft.com',
  OT: 'oleksandrt@microsoft.com',
  AB: 'andrewb@microsoft.com',
  cs: 'csigs@users.noreply.github.com',
}

// ─── Author info helper for real commits ───────────────────────────────
function getAuthorName(author) {
  if (!author) return 'Unknown'
  return author.name || 'Unknown'
}

function getAuthorEmail(author) {
  if (!author) return ''
  return author.email || ''
}

function getAuthorColor(author) {
  if (!author) return '#888'
  const initial = (author.name || '?').charAt(0).toUpperCase()
  return authorColors[initial] || '#4a90e2'
}

const commitDetailMap = {
  1: {
    shortHash: 'ee57040',
    sha: 'ee57040e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'TB',
    date: '27 Nov 2020 07:21:30 +01:00',
    title: 'Update package-lock.json',
    body: 'Automated dependency update.',
    files: [
      { path: 'package-lock.json', status: 'modified', additions: 142, deletions: 98 },
      { path: 'package.json', status: 'modified', additions: 2, deletions: 2 },
    ],
  },
  2: {
    shortHash: '411c6d0',
    sha: '411c6d0e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '26 Nov 2020 17:55:10 +01:00',
    title: 'Fix getTypeFacts for pattern template literal types (#41693)',
    body: 'When a template literal type has a pattern like `${string}`, we should normalize it to just `string` in getTypeFacts to avoid incorrect narrowing.',
    files: [
      { path: 'src/compiler/checker.ts', status: 'modified', additions: 15, deletions: 3 },
      { path: 'src/compiler/types.ts', status: 'modified', additions: 8, deletions: 1 },
      { path: 'tests/cases/compiler/templateLiteralTypes.ts', status: 'modified', additions: 34, deletions: 0 },
    ],
  },
  3: {
    shortHash: 'd616d8f',
    sha: 'd616d8fe8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'TB',
    date: '26 Nov 2020 07:21:15 +01:00',
    title: 'Update package-lock.json',
    body: 'Automated dependency update.',
    files: [
      { path: 'package-lock.json', status: 'modified', additions: 86, deletions: 72 },
    ],
  },
  4: {
    shortHash: 'ec1490f',
    sha: 'ec1490fe8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '26 Nov 2020 01:51:45 +01:00',
    title: 'Properly cache types for shared control flow nodes (#41665)',
    body: 'When two different control flow nodes share the same type, we should cache the result to avoid redundant computation.',
    files: [
      { path: 'src/compiler/checker.ts', status: 'modified', additions: 22, deletions: 6 },
      { path: 'src/compiler/binder.ts', status: 'modified', additions: 4, deletions: 4 },
    ],
  },
  5: {
    shortHash: '5e2509b',
    sha: '5e2509be8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '25 Nov 2020 21:17:30 +01:00',
    title: 'Accept new baselines',
    body: 'Update test baselines after behavior changes.',
    files: [
      { path: 'tests/baselines/local/typeFacts.js', status: 'modified', additions: 12, deletions: 8 },
    ],
  },
  6: {
    shortHash: '24c6da9',
    sha: '24c6da9e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '25 Nov 2020 21:17:30 +01:00',
    title: 'Add tests',
    body: 'Add test cases for pattern template literal type narrowing.',
    files: [
      { path: 'tests/cases/compiler/templateLiteralPatterns.ts', status: 'added', additions: 56, deletions: 0 },
    ],
  },
  7: {
    shortHash: 'f9e8d7c',
    sha: 'f9e8d7ce8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'SG',
    date: '25 Nov 2020 20:45:00 +01:00',
    title: 'Update test snapshots',
    body: 'Regenerate test snapshots after type fact changes.',
    files: [
      { path: 'tests/baselines/local/typeFacts.snap', status: 'modified', additions: 18, deletions: 14 },
    ],
  },
  8: {
    shortHash: '3c3fbbd',
    sha: '3c3fbbde8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '25 Nov 2020 18:49:20 +01:00',
    title: 'Normalize `${string}` to just string, fix getTypeFacts',
    body: 'Merge branch fix41651: Normalize template literal pattern types in getTypeFacts.',
    files: [
      { path: 'src/compiler/checker.ts', status: 'modified', additions: 5, deletions: 2 },
    ],
  },
  9: {
    shortHash: 'd5779c7',
    sha: 'd5779c7e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'SG',
    date: '25 Nov 2020 18:37:45 +01:00',
    title: 'replace whole path if directory separator appears for import completion. (#41412)',
    body: 'When completing imports, if the path contains a directory separator, replace the whole path instead of just the last segment.',
    files: [
      { path: 'src/services/completions.ts', status: 'modified', additions: 28, deletions: 5 },
      { path: 'src/harness/unittests/completions.ts', status: 'modified', additions: 42, deletions: 0 },
    ],
  },
  10: {
    shortHash: '242e020',
    sha: '242e020e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'OT',
    date: '25 Nov 2020 18:11:00 +01:00',
    title: 'fix(41216): update baseline (#41687)',
    body: 'Update baselines for issue 41216.',
    files: [
      { path: 'tests/baselines/local/completions.js', status: 'modified', additions: 6, deletions: 6 },
    ],
  },
  11: {
    shortHash: '86429aa',
    sha: '86429aae330aa076f9c776c785cd47c69044187a',
    authorId: 'cs',
    date: '25 Nov 2020 01:11:30 +01:00',
    title: 'LEGO: Merge pull request 41678',
    body: 'LEGO: Merge pull request 41678',
    files: [
      { path: 'src/loc/lcl/fra/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'modified', additions: 89, deletions: 12 },
      { path: 'src/loc/lcl/ita/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'modified', additions: 65, deletions: 15 },
      { path: 'src/loc/lcl/deu/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'added', additions: 92, deletions: 0 },
    ],
  },
  12: {
    shortHash: 'dbcbe93',
    sha: 'dbcbe93e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'cs',
    date: '25 Nov 2020 01:11:30 +01:00',
    title: 'LEGO: check in for master to temporary branch.',
    body: 'Intermediate commit for LEGO merge process.',
    files: [
      { path: 'src/loc/lcl/fra/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'modified', additions: 45, deletions: 6 },
    ],
  },
  13: {
    shortHash: '5adb55e',
    sha: '5adb55ee8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'OT',
    date: '24 Nov 2020 23:40:15 +01:00',
    title: 'feat(41216): show JSDoc for aliases (#41452)',
    body: 'When hovering over an alias type, show the JSDoc documentation from the original type.',
    files: [
      { path: 'src/services/services.ts', status: 'modified', additions: 18, deletions: 2 },
      { path: 'src/services/completions.ts', status: 'modified', additions: 7, deletions: 1 },
    ],
  },
  14: {
    shortHash: 'a1b2c3d',
    sha: 'a1b2c3de8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'TB',
    date: '20 Nov 2020 10:00:00 +01:00',
    title: 'Bump version to 4.2.0',
    body: 'Version bump for the 4.2.0 release.',
    files: [
      { path: 'package.json', status: 'modified', additions: 1, deletions: 1 },
      { path: 'package-lock.json', status: 'modified', additions: 1, deletions: 1 },
    ],
  },
  15: {
    shortHash: '0000001',
    sha: '0000001e8a7c5fc2b2e2b8a9c0b1c2d3e4f5a6b7',
    authorId: 'AH',
    date: '1 Jan 2020 00:00:00 +01:00',
    title: 'Initial commit',
    body: 'First commit of the TypeScript repository.',
    files: [],
  },
}

// ─── Derived commit detail ─────────────────────────────────────────────
const commitDetail = computed(() => {
  if (!props.selectedCommit) return null
  const mock = commitDetailMap[props.selectedCommit.id]
  if (mock) return mock
  // Real commit from API — construct detail from available data
  return {
    shortHash: props.selectedCommit.hash || props.selectedCommit.fullHash?.substring(0, 7),
    sha: props.selectedCommit.fullHash || props.selectedCommit.id,
    authorId: (props.selectedCommit.author?.name || '?').charAt(0).toUpperCase(),
    date: props.selectedCommit.date || '',
    title: props.selectedCommit.subject || '(no message)',
    body: '',
    files: [],
  }
})

// ─── Author info ───────────────────────────────────────────────────────
const authorInfo = computed(() => {
  if (!commitDetail.value) return null
  const id = commitDetail.value.authorId
  // Check if mock data has this author
  if (authorNames[id]) {
    return {
      initials: id,
      name: authorNames[id],
      email: authorEmails[id],
      color: authorColors[id] || '#888',
    }
  }
  // Real commit author
  const commitAuthor = props.selectedCommit?.author
  return {
    initials: commitAuthor?.initials || id,
    name: getAuthorName(commitAuthor),
    email: getAuthorEmail(commitAuthor),
    color: getAuthorColor(commitAuthor),
  }
})

// ─── File tree ─────────────────────────────────────────────────────────
const fileTreeSearch = ref('')

function buildTree(files) {
  const root = { name: '', children: [], files: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let node = root

    // Navigate/create directories
    for (let i = 0; i < parts.length - 1; i++) {
      let child = node.children.find(c => c.name === parts[i])
      if (!child) {
        child = { name: parts[i], children: [], files: [], _path: parts.slice(0, i + 1).join('/') }
        node.children.push(child)
      }
      node = child
    }

    // Add file
    node.files.push({
      name: parts[parts.length - 1],
      path: file.path,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    })
  }

  return root
}

const fileTree = computed(() => {
  if (!commitDetail.value) return { name: '', children: [], files: [] }
  return buildTree(commitDetail.value.files)
})

// Filtered tree for search
function filterTree(node, query) {
  if (!query) return node

  const q = query.toLowerCase()
  const filteredChildren = node.children
    .map(c => filterTree(c, q))
    .filter(c => c.matched || c.children.length > 0 || c.files.length > 0)

  const filteredFiles = node.files.filter(f =>
    f.path.toLowerCase().includes(q)
  )

  const matched = node.name.toLowerCase().includes(q)

  return {
    ...node,
    children: filteredChildren,
    files: filteredFiles,
    matched: matched || filteredFiles.length > 0 || filteredChildren.length > 0,
  }
}

const filteredTree = computed(() => filterTree(fileTree.value, fileTreeSearch.value))

// ─── Tree collapsed state ──────────────────────────────────────────────
const collapsedFolders = reactive(new Set())

function toggleFolder(path) {
  if (collapsedFolders.has(path)) {
    collapsedFolders.delete(path)
  } else {
    collapsedFolders.add(path)
  }
}

function isFolderOpen(path) {
  return !collapsedFolders.has(path)
}

// ─── Expanded file diffs in Changes tab ────────────────────────────────
const expandedFilePaths = reactive(new Set())

function toggleFileDiff(path) {
  if (expandedFilePaths.has(path)) {
    expandedFilePaths.delete(path)
  } else {
    expandedFilePaths.add(path)
  }
}

function isFileExpanded(path) {
  return expandedFilePaths.has(path)
}

// ─── Copy SHA ──────────────────────────────────────────────────────────
function copySHA() {
  if (!commitDetail.value) return
  navigator.clipboard.writeText(commitDetail.value.sha).then(() => {
    showToast('success', 'SHA copied to clipboard')
  }).catch(() => {
    showToast('error', 'Failed to copy SHA')
  })
}

// ─── Stats ─────────────────────────────────────────────────────────────
const stats = computed(() => {
  if (!commitDetail.value) return { files: 0, additions: 0, deletions: 0 }
  const files = commitDetail.value.files
  const additions = files.reduce((sum, f) => sum + (f.additions || 0), 0)
  const deletions = files.reduce((sum, f) => sum + (f.deletions || 0), 0)
  return { files: files.length, additions, deletions }
})

// ─── Status helpers ────────────────────────────────────────────────────
const statusLabel = { modified: 'M', added: 'A', deleted: 'D', renamed: 'R' }
</script>

<template>
  <div class="details-panel-inner">
    <!-- ── Commit Metadata (shared across all tabs) ── -->
    <div v-if="commitDetail" class="commit-metadata">
      <!-- Author Card -->
      <div class="metadata-author-area">
        <div class="author-card">
          <div
            class="avatar"
            :style="{ backgroundColor: authorInfo?.color || '#888' }"
          >
            {{ authorInfo?.initials || '?' }}
          </div>
          <div>
            <div class="meta-label">Author</div>
            <div class="author-name">
              {{ authorInfo?.name }}
              <span class="author-email">&lt;{{ authorInfo?.email }}&gt;</span>
            </div>
            <div class="meta-value">{{ commitDetail.date }}</div>
          </div>
        </div>
      </div>

      <!-- SHA -->
      <div class="sha-info">
        <span class="sha-label">SHA</span>
        <code class="sha-value" @click="copySHA" title="Click to copy SHA">
          {{ commitDetail.sha }}
        </code>
        <span class="sha-copy-hint">📋</span>
      </div>

      <!-- Commit Message -->
      <div class="commit-msg-title">{{ commitDetail.title }}</div>
      <div v-if="commitDetail.body" class="commit-msg-body">{{ commitDetail.body }}</div>
    </div>

    <!-- Empty state when no commit selected -->
    <div v-else class="metadata-empty">
      <EmptyState
        icon="🔍"
        title="No commit selected"
        message="Select a commit from the graph above to view its details."
      />
    </div>

    <!-- ── Tabs ── -->
    <div class="details-tabs" v-if="commitDetail">
      <div
        class="details-tab"
        :class="{ active: activeTab === 'changes' }"
        @click="setTab('changes')"
      >Changes</div>
      <div
        class="details-tab"
        :class="{ active: activeTab === 'filetree' }"
        @click="setTab('filetree')"
      >File Tree</div>
      <div
        class="details-tab"
        :class="{ active: activeTab === 'history' }"
        @click="setTab('history')"
      >History</div>
    </div>

    <!-- ── Tab Content ── -->
    <div class="details-content-scroll" v-if="commitDetail">
      <!-- Changes Tab -->
      <div v-show="activeTab === 'changes'" class="tab-content-changes">
        <!-- Filter toolbar -->
        <div class="changes-toolbar">
          <span
            class="changes-filter active"
          >All</span>
          <span
            class="changes-filter"
          >Modified</span>
          <span
            class="changes-filter"
          >Added</span>
          <span
            class="changes-filter"
          >Deleted</span>
          <span class="changes-summary">
            {{ stats.files }} files, <span class="additions">+{{ stats.additions }}</span>
            <span class="deletions">-{{ stats.deletions }}</span>
          </span>
        </div>

        <!-- File list -->
        <div class="changes-file-list">
          <div
            v-for="file in commitDetail.files"
            :key="file.path"
            class="changes-file-item"
          >
            <div
              class="changes-file-header"
              @click="toggleFileDiff(file.path)"
            >
              <span
                :class="['file-status-badge', `file-status-${file.status}`]"
              >{{ statusLabel[file.status] || '?' }}</span>
              <span class="file-path">{{ file.path }}</span>
              <span class="file-diff-stats">
                <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
                <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
              </span>
              <span
                class="file-expand-icon"
                :class="{ expanded: isFileExpanded(file.path) }"
              >▶</span>
            </div>
            <div
              class="file-diff-content"
              :class="{ visible: isFileExpanded(file.path) }"
            >
              <DiffViewer
                :filePath="file.path"
                :fileStatus="file.status"
                :additions="file.additions"
                :deletions="file.deletions"
              />
            </div>
          </div>
        </div>

        <!-- Summary footer -->
        <div class="file-change-summary">
          <span>{{ stats.files }} files changed</span>
          <span class="additions">+{{ stats.additions }} additions</span>
          <span class="deletions">-{{ stats.deletions }} deletions</span>
        </div>
      </div>

      <!-- File Tree Tab -->
      <div v-show="activeTab === 'filetree'" class="tab-content-filetree">
        <div class="filetree-toolbar">
          <span class="ft-label">📦 Files</span>
          <input
            class="ft-search"
            type="text"
            placeholder="Filter files..."
            v-model="fileTreeSearch"
          />
          <span class="ft-count">{{ commitDetail.files.length }} files</span>
        </div>
        <div class="filetree-scroll">
          <!-- Root level rendering -->
          <template v-if="filteredTree.matched !== false">
            <div
              v-for="child in filteredTree.children"
              :key="child._path"
              class="ft-folder"
            >
              <div
                class="ft-folder-label"
                @click="toggleFolder(child._path)"
              >
                <span class="ft-toggle">{{ isFolderOpen(child._path) ? '▾' : '▸' }}</span>
                <span class="ft-folder-icon">📁</span>
                <span>{{ child.name }}/</span>
              </div>
              <div v-if="isFolderOpen(child._path)" class="ft-folder-children">
                <!-- Subfolders -->
                <div
                  v-for="sub in child.children"
                  :key="sub._path"
                  class="ft-folder"
                  :style="{ paddingLeft: '16px' }"
                >
                  <div
                    class="ft-folder-label"
                    @click="toggleFolder(sub._path)"
                  >
                    <span class="ft-toggle">{{ isFolderOpen(sub._path) ? '▾' : '▸' }}</span>
                    <span class="ft-folder-icon">📁</span>
                    <span>{{ sub.name }}/</span>
                  </div>
                  <div v-if="isFolderOpen(sub._path)" class="ft-folder-children" :style="{ paddingLeft: '16px' }">
                    <!-- Sub-subfolders -->
                    <div
                      v-for="sub2 in sub.children"
                      :key="sub2._path"
                      class="ft-folder"
                    >
                      <div
                        class="ft-folder-label"
                        @click="toggleFolder(sub2._path)"
                      >
                        <span class="ft-toggle">{{ isFolderOpen(sub2._path) ? '▾' : '▸' }}</span>
                        <span class="ft-folder-icon">📁</span>
                        <span>{{ sub2.name }}/</span>
                      </div>
                      <div v-if="isFolderOpen(sub2._path)" class="ft-folder-children" :style="{ paddingLeft: '16px' }">
                        <div
                          v-for="file in sub2.files"
                          :key="file.path"
                          class="ft-file"
                        >
                          <span class="ft-file-icon">📄</span>
                          <span class="ft-file-name">{{ file.name }}</span>
                          <span class="file-diff-stats">
                            <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
                            <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <!-- Files in sub directory -->
                    <div
                      v-for="file in sub.files"
                      :key="file.path"
                      class="ft-file"
                    >
                      <span class="ft-file-icon">📄</span>
                      <span class="ft-file-name">{{ file.name }}</span>
                      <span class="file-diff-stats">
                        <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
                        <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <!-- Files in root directory -->
                <div
                  v-for="file in child.files"
                  :key="file.path"
                  class="ft-file"
                >
                  <span class="ft-file-icon">📄</span>
                  <span class="ft-file-name">{{ file.name }}</span>
                  <span class="file-diff-stats">
                    <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
                    <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
                  </span>
                </div>
              </div>
            </div>
            <!-- Root-level files -->
            <div
              v-for="file in filteredTree.files"
              :key="file.path"
              class="ft-file"
              :style="{ paddingLeft: '0' }"
            >
              <span class="ft-file-icon">📄</span>
              <span class="ft-file-name">{{ file.name }}</span>
              <span class="file-diff-stats">
                <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
                <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
              </span>
            </div>
          </template>
          <div v-else class="ft-no-results">No files match your search.</div>
        </div>
      </div>

      <!-- History Tab (placeholder) -->
      <div v-show="activeTab === 'history'" class="tab-content-history">
        <EmptyState
          icon="📜"
          title="History"
          message="Commit history view coming soon. Track changes to this commit or file over time."
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.details-panel-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Commit Metadata ── */
.commit-metadata {
  padding: 10px 14px 6px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.metadata-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metadata-author-area {
  margin-bottom: 6px;
}

.author-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
  flex-shrink: 0;
}

.meta-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.3px;
}

.author-name {
  font-weight: 600;
  font-size: 12px;
  color: #333;
}

.author-email {
  font-weight: normal;
  color: #888;
  font-size: 11px;
}

.meta-value {
  font-size: 10px;
  color: #666;
}

.sha-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  cursor: pointer;
}

.sha-label {
  color: #888;
  font-size: 10px;
}

.sha-value {
  font-size: 11px;
  color: #007acc;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sha-value:hover {
  text-decoration: underline;
}

.sha-copy-hint {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.commit-msg-title {
  font-weight: 600;
  font-size: 12px;
  color: #333;
  margin-bottom: 2px;
  line-height: 1.4;
}

.commit-msg-body {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.4;
}

/* ── Tabs ── */
.details-tabs {
  display: flex;
  border-bottom: 1px solid #dcdcdc;
  background-color: #f8f9fa;
  padding-left: 10px;
  flex-shrink: 0;
}

.details-tab {
  padding: 5px 14px;
  font-size: 11px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.details-tab.active {
  color: #007acc;
  border-bottom: 2px solid #007acc;
  background-color: #fff;
  font-weight: bold;
}

.details-tab:hover {
  color: #007acc;
}

/* ── Content scrollable area ── */
.details-content-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Changes Tab ── */
.tab-content-changes {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.changes-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  background-color: #fafafa;
}

.changes-filter {
  font-size: 10px;
  color: #888;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.15s;
}

.changes-filter:hover {
  color: #007acc;
  background-color: #f0f6fc;
}

.changes-filter.active {
  color: #007acc;
  font-weight: bold;
  background-color: #e8f0fe;
}

.changes-summary {
  margin-left: auto;
  font-size: 10px;
  color: #888;
}

.changes-summary .additions { color: #28a745; font-weight: bold; }
.changes-summary .deletions { color: #cb2431; font-weight: bold; }

.changes-file-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.changes-file-item {
  margin-bottom: 1px;
}

.changes-file-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s;
}

.changes-file-header:hover {
  background-color: #f6f8fa;
}

.changes-file-header .file-status-badge {
  width: 18px;
  height: 16px;
  font-size: 8px;
  flex-shrink: 0;
}

.changes-file-header .file-path {
  flex: 1;
  font-size: 11px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
}

.changes-file-header .file-diff-stats {
  display: flex;
  gap: 4px;
  font-size: 10px;
  flex-shrink: 0;
}

.file-diff-add { color: #28a745; }
.file-diff-del { color: #cb2431; }

.file-expand-icon {
  font-size: 7px;
  color: #999;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.file-expand-icon.expanded {
  transform: rotate(90deg);
}

.file-diff-content {
  display: none;
  margin: 1px 0 4px 24px;
  border: 1px solid #e1e4e8;
  border-radius: 3px;
  background-color: #f8f9fa;
  overflow-x: auto;
}

.file-diff-content.visible {
  display: block;
}

/* Summary footer */
.file-change-summary {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  font-size: 10px;
  color: #666;
  border-top: 1px solid #eee;
  flex-shrink: 0;
  background-color: #fafafa;
}

.file-change-summary .additions { color: #28a745; font-weight: bold; }
.file-change-summary .deletions { color: #cb2431; font-weight: bold; }

/* ── File Tree Tab ── */
.tab-content-filetree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.filetree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
  flex-shrink: 0;
}

.ft-label {
  font-weight: bold;
  font-size: 11px;
  color: #333;
  flex-shrink: 0;
}

.ft-search {
  flex: 1;
  max-width: 180px;
  padding: 3px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
}

.ft-search:focus {
  border-color: #007acc;
}

.ft-count {
  font-size: 10px;
  color: #888;
  flex-shrink: 0;
}

.filetree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.ft-folder {
  user-select: none;
}

.ft-folder-label {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  cursor: pointer;
  color: #555;
  font-size: 11px;
  border-radius: 3px;
  transition: background-color 0.15s;
}

.ft-folder-label:hover {
  background-color: #f0f4f8;
}

.ft-toggle {
  font-size: 8px;
  color: #999;
  width: 10px;
  text-align: center;
  flex-shrink: 0;
}

.ft-folder-icon, .ft-file-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.ft-file {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 20px;
  font-size: 11px;
  color: #333;
  cursor: default;
  border-radius: 2px;
}

.ft-file:hover {
  background-color: #f6f8fa;
}

.ft-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
  font-size: 11px;
}

.ft-no-results {
  padding: 20px;
  text-align: center;
  color: #aaa;
  font-style: italic;
  font-size: 11px;
}

/* ── History Tab ── */
.tab-content-history {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
