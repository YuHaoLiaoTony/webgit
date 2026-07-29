<script setup>
import { ref, onMounted } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { useStatusStore } from '../stores/status.js'
import { useApi } from '../composables/useApi.js'
import { showToast } from '../composables/useToast.js'

const uiStore = useUiStore()
const statusStore = useStatusStore()

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

onMounted(() => {
  fetchBranches()
  statusStore.fetchStatus()
})
</script>

<template>
  <div class="sidebar-header">
    <span>TypeScript</span>
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
  </div>

  <!-- Submodules -->
  <div class="sidebar-group-title" @click="toggleGroup('submodules')">
    <span>{{ collapsedGroups.submodules ? '▸' : '▾' }} Submodules</span>
  </div>
</template>
