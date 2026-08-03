<script setup>
import { ref, computed, reactive } from 'vue'
import { showToast } from '../composables/useToast.js'
import DiffViewer from './DiffViewer.vue'
import EmptyState from './EmptyState.vue'
import CommitMetadata from './CommitMetadata.vue'
import { authorColors, authorNames, authorEmails, commitDetailMap, statusLabel } from '../data/commitDetailData.js'

const props = defineProps({
  selectedCommit: { type: Object, default: null },
})

const emit = defineEmits(['navigate-to-commit'])

// ─── Tabs ──────────────────────────────────────────────────────────────
const activeTab = ref('changes')

function setTab(tab) {
  activeTab.value = tab
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

// ─── Parent commit details ────────────────────────────────────────────
const parentCommits = computed(() => {
  if (!commitDetail.value || !props.selectedCommit?.parents) return []
  return props.selectedCommit.parents.map((ph, idx) => ({
    hash: ph,
    shortHash: ph.substring(0, 7),
    index: idx,
  }))
})

// ─── Refs display ──────────────────────────────────────────────────────
const commitRefs = computed(() => {
  if (!props.selectedCommit) return { local: [], remote: [], tags: [] }
  return props.selectedCommit._labels || { local: [], remote: [], tags: [] }
})

function selectParent(hash) {
  emit('navigate-to-commit', hash)
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

</script>

<template>
  <div class="details-panel-inner">
    <CommitMetadata :commitDetail="commitDetail" :authorInfo="authorInfo" />

    <!-- ── Tabs ── -->
    <div class="details-tabs" v-if="commitDetail">
      <div
        class="details-tab"
        :class="{ active: activeTab === 'commit' }"
        @click="setTab('commit')"
      >Commit</div>
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
      <!-- Commit Tab -->
      <div v-show="activeTab === 'commit'" class="tab-content-commit">
        <!-- AUTHOR -->
        <div class="commit-section">
          <div class="commit-section-header">
            <span class="section-icon">👤</span>
            <span class="section-title">AUTHOR</span>
          </div>
          <div class="commit-section-body">
            <div class="commit-author-row">
              <div
                class="commit-author-avatar"
                :style="{ backgroundColor: authorInfo?.color || '#888' }"
              >
                {{ authorInfo?.initials || '?' }}
              </div>
              <div class="commit-author-details">
                <div class="commit-author-name">{{ authorInfo?.name || 'Unknown' }}</div>
                <div class="commit-author-email">{{ authorInfo?.email || '' }}</div>
                <div class="commit-author-date">{{ commitDetail.date }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- REFS -->
        <div class="commit-section">
          <div class="commit-section-header">
            <span class="section-icon">🌿</span>
            <span class="section-title">REFS</span>
          </div>
          <div class="commit-section-body">
            <div v-if="commitRefs.local.length > 0 || commitRefs.remote.length > 0 || commitRefs.tags.length > 0" class="commit-refs-list">
              <span v-for="lb in commitRefs.local" :key="'l-' + lb" class="badge-branch-commit">✓ {{ lb }}</span>
              <span v-for="lb in commitRefs.remote" :key="'r-' + lb" class="badge-remote-commit">{{ lb }}</span>
              <span v-for="lb in commitRefs.tags" :key="'t-' + lb" class="badge-tag-commit">🏷 {{ lb }}</span>
            </div>
            <div v-else class="commit-refs-empty">No branch or tag references</div>
          </div>
        </div>

        <!-- SHA -->
        <div class="commit-section">
          <div class="commit-section-header">
            <span class="section-icon">🔑</span>
            <span class="section-title">SHA</span>
          </div>
          <div class="commit-section-body">
            <div class="commit-sha-row" @click="copySHA" title="Click to copy SHA">
              <code class="commit-sha-full">{{ commitDetail.sha }}</code>
              <span class="commit-sha-copy">📋</span>
            </div>
            <div class="commit-sha-short">{{ commitDetail.shortHash }}</div>
          </div>
        </div>

        <!-- PARENTS -->
        <div class="commit-section">
          <div class="commit-section-header">
            <span class="section-icon">🔗</span>
            <span class="section-title">PARENTS</span>
          </div>
          <div class="commit-section-body">
            <div v-if="parentCommits.length > 0" class="commit-parents-list">
              <div
                v-for="parent in parentCommits"
                :key="parent.hash"
                class="commit-parent-item"
                @click="selectParent(parent.hash)"
                title="Navigate to parent commit"
              >
                <span class="parent-index" v-if="parentCommits.length > 1">{{ parent.index + 1 }}.</span>
                <code class="parent-hash">{{ parent.hash }}</code>
                <span class="parent-short">{{ parent.shortHash }}</span>
                <span class="parent-nav-icon">↗</span>
              </div>
            </div>
            <div v-else class="commit-parents-empty">
              <span class="parent-root-icon">🌱</span> Root commit — no parents
            </div>
          </div>
        </div>
      </div>

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

/* ── Commit Tab ── */
.tab-content-commit {
  padding: 10px 14px;
}

.commit-section {
  margin-bottom: 14px;
}

.commit-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}

.section-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.section-title {
  font-size: 10px;
  font-weight: bold;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.commit-section-body {
  margin-left: 21px;
}

/* AUTHOR */
.commit-author-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.commit-author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.commit-author-details {
  flex: 1;
  min-width: 0;
}

.commit-author-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.commit-author-email {
  font-size: 11px;
  color: #888;
  word-break: break-all;
}

.commit-author-date {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

/* REFS */
.commit-refs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge-branch-commit {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background-color: #fff;
  border: 1px solid #4a90e2;
  color: #333;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.badge-remote-commit {
  display: inline-flex;
  align-items: center;
  background-color: #f0f6fc;
  border: 1px solid #4a90e2;
  color: #4a90e2;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.badge-tag-commit {
  display: inline-flex;
  align-items: center;
  background-color: #fff2cc;
  border: 1px solid #d6b656;
  color: #333;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.commit-refs-empty {
  font-size: 11px;
  color: #aaa;
  font-style: italic;
}

/* SHA */
.commit-sha-row {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.commit-sha-row:hover {
  background-color: #f0f6fc;
}

.commit-sha-full {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  color: #007acc;
  word-break: break-all;
  line-height: 1.4;
}

.commit-sha-copy {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.commit-sha-row:hover .commit-sha-copy {
  opacity: 1;
}

.commit-sha-short {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 10px;
  color: #aaa;
  padding-left: 6px;
}

/* PARENTS */
.commit-parents-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.commit-parent-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.commit-parent-item:hover {
  background-color: #f0f6fc;
}

.parent-index {
  font-size: 10px;
  color: #888;
  font-weight: 600;
  min-width: 14px;
  flex-shrink: 0;
}

.parent-hash {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  color: #007acc;
  flex: 1;
  word-break: break-all;
  line-height: 1.4;
}

.parent-short {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 10px;
  color: #aaa;
  flex-shrink: 0;
}

.parent-nav-icon {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.commit-parent-item:hover .parent-nav-icon {
  opacity: 1;
}

.commit-parents-empty {
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}

.parent-root-icon {
  font-size: 14px;
}

/* ── History Tab ── */
.tab-content-history {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
