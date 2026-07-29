<script setup>
import { ref } from 'vue'
import { useReposStore } from '../stores/repos.js'

const reposStore = useReposStore()

// Dropdown state
const showDropdown = ref(false)

// Dialog state
const showOpenDialog = ref(false)
const showCloneDialog = ref(false)
const openPath = ref('')
const cloneUrl = ref('')
const cloneDir = ref('')
const dialogError = ref('')
const dialogLoading = ref(false)

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
}

function openOpenDialog() {
  showDropdown.value = false
  openPath.value = ''
  dialogError.value = ''
  showOpenDialog.value = true
}

function openCloneDialog() {
  showDropdown.value = false
  cloneUrl.value = ''
  cloneDir.value = ''
  dialogError.value = ''
  showCloneDialog.value = true
}

async function handleOpenRepo() {
  if (!openPath.value.trim()) return
  dialogLoading.value = true
  dialogError.value = ''
  try {
    await reposStore.openRepo(openPath.value.trim())
    showOpenDialog.value = false
  } catch (e) {
    dialogError.value = e.message
  } finally {
    dialogLoading.value = false
  }
}

async function handleCloneRepo() {
  if (!cloneUrl.value.trim() || !cloneDir.value.trim()) return
  dialogLoading.value = true
  dialogError.value = ''
  try {
    await reposStore.cloneRepo(cloneUrl.value.trim(), cloneDir.value.trim())
    showCloneDialog.value = false
  } catch (e) {
    dialogError.value = e.message
  } finally {
    dialogLoading.value = false
  }
}

async function handleRemoveRepo(id, event) {
  event.stopPropagation()
  try {
    await reposStore.removeRepo(id)
  } catch (e) {
    // Error is logged by the store
  }
}
</script>

<template>
  <div class="tabs-bar">
    <div
      v-for="repo in reposStore.repos"
      :key="repo.id"
      class="tab"
      :class="{ active: repo.id === reposStore.activeRepoId }"
      @click="reposStore.setActiveRepo(repo.id)"
    >
      <span>{{ repo.name }}{{ repo.isDirty ? '*' : '' }}</span>
      <span
        class="tab-close"
        @click="handleRemoveRepo(repo.id, $event)"
        title="Close repository"
      >✕</span>
    </div>

    <!-- Empty state when no repos -->
    <div v-if="reposStore.repos.length === 0" class="tab-inactive" style="color: #999; font-style: italic;">
      No repositories open
    </div>

    <!-- "+" Button with dropdown -->
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

  <!-- Open Repository Dialog -->
  <Teleport to="body">
    <div v-if="showOpenDialog" class="repo-overlay" @click.self="showOpenDialog = false">
      <div class="repo-dialog">
        <div class="repo-dialog-header">
          <span>Open Repository</span>
          <span class="repo-dialog-close" @click="showOpenDialog = false">×</span>
        </div>
        <div class="repo-dialog-body">
          <label class="repo-dialog-label">Repository Path</label>
          <input
            v-model="openPath"
            class="repo-dialog-input"
            type="text"
            placeholder="/path/to/repository"
            @keydown.enter="handleOpenRepo"
          />
          <div v-if="dialogError" class="repo-dialog-error">{{ dialogError }}</div>
        </div>
        <div class="repo-dialog-footer">
          <button class="changes-view-btn" @click="showOpenDialog = false">Cancel</button>
          <button
            class="changes-view-btn primary"
            :disabled="dialogLoading || !openPath.trim()"
            @click="handleOpenRepo"
          >
            {{ dialogLoading ? 'Opening…' : 'Open' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Clone Repository Dialog -->
  <Teleport to="body">
    <div v-if="showCloneDialog" class="repo-overlay" @click.self="showCloneDialog = false">
      <div class="repo-dialog">
        <div class="repo-dialog-header">
          <span>Clone Repository</span>
          <span class="repo-dialog-close" @click="showCloneDialog = false">×</span>
        </div>
        <div class="repo-dialog-body">
          <label class="repo-dialog-label">Remote URL</label>
          <input
            v-model="cloneUrl"
            class="repo-dialog-input"
            type="text"
            placeholder="https://github.com/user/repo.git"
            @keydown.enter="handleCloneRepo"
          />
          <label class="repo-dialog-label" style="margin-top: 12px;">Destination Directory</label>
          <input
            v-model="cloneDir"
            class="repo-dialog-input"
            type="text"
            placeholder="/path/to/destination"
            @keydown.enter="handleCloneRepo"
          />
          <div v-if="dialogError" class="repo-dialog-error">{{ dialogError }}</div>
        </div>
        <div class="repo-dialog-footer">
          <button class="changes-view-btn" @click="showCloneDialog = false">Cancel</button>
          <button
            class="changes-view-btn primary"
            :disabled="dialogLoading || !cloneUrl.trim() || !cloneDir.trim()"
            @click="handleCloneRepo"
          >
            {{ dialogLoading ? 'Cloning…' : 'Clone' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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

/* ── Dialog overlay ────────────────────────────────────────────────── */
.repo-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.repo-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 460px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.repo-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-weight: bold;
  font-size: 13px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
}

.repo-dialog-close {
  font-size: 18px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.repo-dialog-close:hover {
  color: #333;
}

.repo-dialog-body {
  padding: 14px 16px;
  overflow-y: auto;
}

.repo-dialog-label {
  display: block;
  font-size: 11px;
  font-weight: bold;
  color: #666;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.repo-dialog-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.4;
  outline: none;
  box-sizing: border-box;
}

.repo-dialog-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.repo-dialog-error {
  margin-top: 8px;
  padding: 6px 10px;
  background-color: #fff0f0;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #cb2431;
  font-size: 11px;
}

.repo-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}
</style>
