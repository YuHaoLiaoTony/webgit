<script setup>
import { ref, computed } from 'vue'
import ChangesTab from './ChangesTab.vue'
import EmptyState from './EmptyState.vue'
import CommitMetadata from './CommitMetadata.vue'
import FileTreeTab from './FileTreeTab.vue'
import CommitTab from './CommitTab.vue'
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
      <CommitTab
        v-show="activeTab === 'commit'"
        :commitDetail="commitDetail"
        :authorInfo="authorInfo"
        :commitRefs="commitRefs"
        :parentCommits="parentCommits"
        @navigate-to-commit="selectParent"
      />

      <!-- Changes Tab -->
      <ChangesTab
        v-show="activeTab === 'changes'"
        :files="commitDetail?.files || []"
        :stats="stats"
        :statusLabels="statusLabel"
      />

      <!-- File Tree Tab -->
      <FileTreeTab
        v-show="activeTab === 'filetree'"
        :files="commitDetail?.files || []"
      />

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

/* ── History Tab ── */
.tab-content-history {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
