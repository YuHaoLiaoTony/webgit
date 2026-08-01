<script setup>
import { ref, onMounted, watch } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { useStatusStore } from '../stores/status.js'
import { useReposStore } from '../stores/repos.js'
import { useApi } from '../composables/useApi.js'
import { showToast } from '../composables/useToast.js'

const uiStore = useUiStore()
const statusStore = useStatusStore()
const reposStore = useReposStore()

// Collapsible groups state
const collapsedGroups = ref({
  starred: false,
  branches: false,
  remotes: true,
  tags: true,
  stashes: true,
  submodules: true,
})

function toggleGroup(group) {
  collapsedGroups.value[group] = !collapsedGroups.value[group]
}

// Branch selection
const selectedBranch = ref('')

function selectBranch(name) {
  selectedBranch.value = name
}

async function switchToBranch(name) {
  try {
    const { post } = useApi()
    await post('/branches/checkout', { branch: name })
    // Refresh sidebar state
    selectedBranch.value = name
    await fetchBranches()
    await statusStore.fetchStatus()
    // Switch right side to All Commits and trigger reload
    uiStore.setView('commits')
    uiStore.triggerCommitRefresh()
  } catch (e) {
    showToast('error', e.message, 6000)
  }
}

// Real branches from API
const branchesData = ref({ local: [], remote: [], current: '' })
const loadingBranches = ref(true)

async function fetchBranches() {
  try {
    const { get } = useApi()
    const data = await get('/branches')
    branchesData.value = data
    selectedBranch.value = data.current
  } catch (e) {
    console.error('Failed to fetch branches:', e)
  } finally {
    loadingBranches.value = false
  }
}

// ─── Stashes ────────────────────────────────────────────────────────
const stashes = ref([])
const loadingStashes = ref(true)
const expandedStashRefs = ref(new Set())

function toggleStashExpand(ref) {
  if (expandedStashRefs.value.has(ref)) {
    expandedStashRefs.value.delete(ref)
  } else {
    expandedStashRefs.value.add(ref)
  }
}

async function fetchStashes() {
  try {
    const { get } = useApi()
    const data = await get('/stashes')
    stashes.value = data
  } catch (e) {
    console.error('Failed to fetch stashes:', e)
  } finally {
    loadingStashes.value = false
  }
}

async function applyStash(ref) {
  try {
    const { post } = useApi()
    await post('/stash/apply', { ref })
    showToast('success', `Applied ${ref}`)
    await fetchStashes()
    await statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `Failed to apply stash: ${e.message}`, 6000)
  }
}

async function dropStash(ref) {
  try {
    const { post } = useApi()
    await post('/stash/drop', { ref })
    showToast('success', `Dropped ${ref}`)
    await fetchStashes()
    await statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `Failed to drop stash: ${e.message}`, 6000)
  }
}

function getStashStatusIcon(status) {
  switch (status) {
    case 'added': return '➕'
    case 'deleted': return '➖'
    case 'renamed': return '✏️'
    default: return '📝'
  }
}

onMounted(() => {
  fetchBranches()
  fetchStashes()
  statusStore.fetchStatus()
})

// Re-fetch when active repo changes
watch(() => reposStore.activeRepoId, () => {
  if (reposStore.activeRepoId) {
    fetchBranches()
    fetchStashes()
    statusStore.fetchStatus()
  }
})
</script>

<template>
  <div class="sidebar-header">
    <span>{{ reposStore.displayName(reposStore.activeRepo) || 'Repository' }}</span>
    <span style="font-size: 10px; cursor: pointer;">⚙</span>
  </div>

  <!-- Mode switch: Changes / All Commits -->
  <div
    class="sidebar-item"
    :class="{ selected: uiStore.currentView === 'changes' }"
    @click="uiStore.setView('changes')"
  >
    <span>📝</span> Changes ({{ statusStore.totalChanges }})
  </div>
  <div
    class="sidebar-item"
    :class="{ selected: uiStore.currentView === 'commits' }"
    @click="uiStore.setView('commits')"
  >
    <span>≡</span> All Commits
  </div>

  <!-- Search box -->
  <div class="sidebar-search">
    <span>🔍</span>
    <input type="text" placeholder="Filter">
  </div>

  <!-- Starred -->
  <div class="sidebar-group-title" @click="toggleGroup('starred')">
    <span>{{ collapsedGroups.starred ? '▸' : '▾' }} Starred</span>
  </div>
  <template v-if="!collapsedGroups.starred">
    <div
      v-if="branchesData.current"
      class="sidebar-item"
      :class="{ selected: selectedBranch === branchesData.current }"
      @click="switchToBranch(branchesData.current)"
    >
      <span>✓ {{ branchesData.current }}</span>
      <span style="margin-left: auto; color: #ffca28;">☆</span>
    </div>
  </template>

  <!-- Branches -->
  <div class="sidebar-group-title" @click="toggleGroup('branches')">
    <span>{{ collapsedGroups.branches ? '▸' : '▾' }} Branches</span>
  </div>
  <template v-if="!collapsedGroups.branches">
    <div v-if="loadingBranches" class="sidebar-item" style="color: #999; font-style: italic;">
      <span>Loading...</span>
    </div>
    <div
      v-for="branch in branchesData.local"
      :key="branch"
      class="sidebar-item"
      :class="{ selected: selectedBranch === branch }"
      @click="switchToBranch(branch)"
    >
      <span>{{ branch === branchesData.current ? '✓' : '🌿' }} {{ branch }}</span>
    </div>
    <div v-if="!loadingBranches && branchesData.local.length === 0" class="sidebar-item" style="color: #999;">
      <span>No branches</span>
    </div>
  </template>

  <!-- Remotes -->
  <div class="sidebar-group-title" @click="toggleGroup('remotes')">
    <span>{{ collapsedGroups.remotes ? '▸' : '▾' }} Remotes</span>
  </div>
  <template v-if="!collapsedGroups.remotes">
    <div
      v-for="remote in branchesData.remote"
      :key="remote"
      class="sidebar-item"
      @click="switchToBranch(remote)"
    >
      <span>📡 {{ remote }}</span>
    </div>
    <div v-if="branchesData.remote.length === 0" class="sidebar-item" style="color: #999;">
      <span>No remotes</span>
    </div>
  </template>

  <!-- Tags -->
  <div class="sidebar-group-title" @click="toggleGroup('tags')">
    <span>{{ collapsedGroups.tags ? '▸' : '▾' }} Tags</span>
  </div>

  <!-- Stashes -->
  <div class="sidebar-group-title" @click="toggleGroup('stashes')">
    <span>{{ collapsedGroups.stashes ? '▸' : '▾' }} Stashes</span>
    <span v-if="stashes.length > 0" class="sidebar-group-count">{{ stashes.length }}</span>
  </div>
  <template v-if="!collapsedGroups.stashes">
    <div v-if="loadingStashes" class="sidebar-item" style="color: #999; font-style: italic;">
      <span>Loading...</span>
    </div>
    <div v-else-if="stashes.length === 0" class="sidebar-item" style="color: #999;">
      <span>No stashes</span>
    </div>
    <template v-else v-for="stash in stashes" :key="stash.ref">
      <div
        class="sidebar-item sidebar-stash-parent"
        :class="{ 'stash-expanded': expandedStashRefs.has(stash.ref) }"
        @click="toggleStashExpand(stash.ref)"
      >
        <span class="sidebar-stash-toggle">{{ expandedStashRefs.has(stash.ref) ? '▾' : '▸' }}</span>
        <span class="sidebar-stash-icon">📦</span>
        <span class="sidebar-stash-label" :title="stash.message">
          <span class="sidebar-stash-ref">{{ stash.ref }}</span>
          <span v-if="stash.branch" class="sidebar-stash-branch">({{ stash.branch }})</span>
          <span class="sidebar-stash-msg">{{ stash.message }}</span>
        </span>
        <span class="sidebar-stash-actions">
          <span class="stash-action-btn stash-apply-btn" title="Apply stash" @click.stop="applyStash(stash.ref)">✓</span>
          <span class="stash-action-btn stash-drop-btn" title="Drop stash" @click.stop="dropStash(stash.ref)">✕</span>
        </span>
      </div>
      <template v-if="expandedStashRefs.has(stash.ref)">
        <div v-if="stash.files.length === 0" class="sidebar-stash-file">
          <span style="color: #999;">(no files)</span>
        </div>
        <div
          v-for="file in stash.files"
          :key="file.path"
          class="sidebar-item sidebar-stash-file"
        >
          <span class="sidebar-stash-file-icon">{{ getStashStatusIcon(file.status) }}</span>
          <span class="sidebar-stash-file-path">{{ file.path }}</span>
        </div>
      </template>
    </template>
  </template>

  <!-- Submodules -->
  <div class="sidebar-group-title" @click="toggleGroup('submodules')">
    <span>{{ collapsedGroups.submodules ? '▸' : '▾' }} Submodules</span>
  </div>
</template>
