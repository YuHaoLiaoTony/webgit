<script setup>
import { ref } from 'vue'
import { useUiStore } from '../stores/ui.js'

const uiStore = useUiStore()

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
const selectedBranch = ref('master')

function selectBranch(name) {
  selectedBranch.value = name
}

// Branches data
const starredBranch = { name: 'master', icon: '✓', starred: true }
const branches = [
  { name: 'editor-support-for-links', icon: '🌿' },
  { name: 'improve-uncalled-func...', icon: '🌿' },
  { name: 'master', icon: '✓' },
  { name: 'release-4.1', icon: '🌿' },
]
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
    <span>📝</span> Changes (11)
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
      class="sidebar-item"
      :class="{ selected: selectedBranch === starredBranch.name }"
      @click="selectBranch(starredBranch.name)"
    >
      <span>{{ starredBranch.icon }} {{ starredBranch.name }}</span>
      <span style="margin-left: auto; color: #ffca28;">☆</span>
    </div>
  </template>

  <!-- Branches -->
  <div class="sidebar-group-title" @click="toggleGroup('branches')">
    <span>{{ collapsedGroups.branches ? '▸' : '▾' }} Branches</span>
  </div>
  <template v-if="!collapsedGroups.branches">
    <div
      v-for="branch in branches"
      :key="branch.name"
      class="sidebar-item"
      :class="{ selected: selectedBranch === branch.name }"
      @click="selectBranch(branch.name)"
    >
      <span>{{ branch.icon }} {{ branch.name }}</span>
    </div>
  </template>

  <!-- Remotes -->
  <div class="sidebar-group-title" @click="toggleGroup('remotes')">
    <span>{{ collapsedGroups.remotes ? '▸' : '▾' }} Remotes</span>
  </div>

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
