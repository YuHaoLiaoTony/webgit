<script setup>
import { ref } from 'vue'
import { useReposStore } from '../stores/repos.js'
import RepoDialogs from './RepoDialogs.vue'

const reposStore = useReposStore()
const repoDialogs = ref(null)

// Dropdown state
const showDropdown = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
}

function openOpenDialog() {
  showDropdown.value = false
  repoDialogs.value?.openOpenDialog()
}

function openCloneDialog() {
  showDropdown.value = false
  repoDialogs.value?.openCloneDialog()
}

async function handleRemoveRepo(id, event) {
  event.stopPropagation()
  try {
    await reposStore.closeRepo(id)
  } catch (e) {
    // Error is logged by the store
  }
}
</script>

<template>
  <div class="tabs-bar">
    <!-- Empty state when no repos -->
    <div v-if="reposStore.repos.length === 0" class="tab-inactive" style="color: #999; font-style: italic;">
      No repositories open
    </div>

    <div
      v-for="repo in reposStore.repos"
      :key="repo.id"
      class="tab"
      :class="{ active: repo.id === reposStore.activeRepoId }"
      @click="reposStore.setActiveRepo(repo.id)"
    >
      <span>{{ reposStore.displayName(repo) }}{{ repo.isDirty ? '*' : '' }}</span>
      <span
        class="tab-close"
        @click="handleRemoveRepo(repo.id, $event)"
        title="Close repository"
      >✕</span>
    </div>

    <!-- "+" 固定釘在所有頁籤的右側（類似 VS Code / Fork），不隨當前頁籤移動 -->
    <div class="tabs-add-wrapper">
      <div class="tabs-add-btn" @click="toggleDropdown">+</div>
      <div v-if="showDropdown" class="tabs-dropdown">
        <div class="tabs-dropdown-item" @click="openOpenDialog">
          📂 Open Repository…
        </div>
        <div class="tabs-dropdown-item" @click="openCloneDialog">
          📥 Clone Repository…
        </div>
      </div>
    </div>
  </div>

  <!-- Shared Open / Clone dialogs -->
  <RepoDialogs ref="repoDialogs" />
</template>

<style scoped>
/* ── Tab close button ──────────────────────────────────────────────── */
.tab-close {
  font-size: 10px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 2px;
  margin-left: 4px;
}

.tab-close:hover {
  color: #333;
  background-color: rgba(0, 0, 0, 0.1);
}

/* ── Add button wrapper (for dropdown positioning) ─────────────────── */
/* margin-left: auto — 「+」固定釘在所有頁籤的右側 */
.tabs-add-wrapper {
  position: relative;
  margin-left: auto;
  padding-right: 10px;
}

.tabs-add-btn {
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 2px 8px;
  border-radius: 3px;
  line-height: 1;
  user-select: none;
  /* 相較左側頁籤微調高 4px，讓垂直置中一致 */
  margin-bottom: 4px;
}

.tabs-add-btn:hover {
  background-color: rgba(0, 0, 0, 0.08);
  color: #333;
}

/* ── Dropdown menu ─────────────────────────────────────────────────── */
.tabs-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  margin-top: 4px;
}

.tabs-dropdown-item {
  padding: 8px 14px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.1s;
}

.tabs-dropdown-item:hover {
  background-color: #f0f6fc;
}

.tabs-dropdown-item:first-child {
  border-radius: 4px 4px 0 0;
}

.tabs-dropdown-item:last-child {
  border-radius: 0 0 4px 4px;
}
</style>
