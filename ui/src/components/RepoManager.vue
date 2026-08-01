<script setup>
/**
 * Repo Manager 獨立頁面。
 * 顯示 repos.json 全部 repo（含 closed），支援改名(label)、重新開啟、關閉、purge 刪除，
 * 也可直接 Open / Clone 新 repo。
 * 開啟/切換 repo 後會回到進入前的視圖（prevView）。
 */
import { ref, onMounted } from 'vue'
import { useReposStore } from '../stores/repos.js'
import { useUiStore } from '../stores/ui.js'
import RepoDialogs from './RepoDialogs.vue'

const reposStore = useReposStore()
const uiStore = useUiStore()
const repoDialogs = ref(null)

// 內嵌確認刪除的 row
const confirmPurgeId = ref(null)
// 內嵌改名編輯的 row
const editingId = ref(null)
const editValue = ref('')
const editError = ref('')
const busyId = ref(null)

const statusText = (repo) => (repo.status === 'open' ? 'Open' : 'Closed')

async function refresh() {
  await reposStore.fetchAllRepos()
}

async function handleOpenRepo(repo) {
  try {
    busyId.value = repo.id
    if (repo.status !== 'open') {
      await reposStore.openRepo(repo.path)
    }
    await reposStore.setActiveRepo(repo.id)
    // 切換成功 → 回到進入前的視圖
    uiStore.currentView = uiStore.prevView || 'commits'
  } catch (e) {
    // error 由 store 記錄
  } finally {
    busyId.value = null
  }
}

async function handleClose(repo) {
  try {
    busyId.value = repo.id
    await reposStore.closeRepo(repo.id)
    await refresh()
  } finally {
    busyId.value = null
  }
}

async function handlePurge(repo) {
  try {
    busyId.value = repo.id
    await reposStore.closeRepo(repo.id, true)
    confirmPurgeId.value = null
    await refresh()
  } catch (e) {
    // error 由 store 記錄
  } finally {
    busyId.value = null
  }
}

// ── 改名（inline 編輯，留空 = 清除 label）────────────────────────────
function startEdit(repo) {
  editingId.value = repo.id
  editValue.value = repo.label || ''
  editError.value = ''
}

function cancelEdit() {
  editingId.value = null
  editValue.value = ''
  editError.value = ''
}

async function saveEdit(repo) {
  try {
    editError.value = ''
    busyId.value = repo.id
    await reposStore.setLabel(repo.id, editValue.value.trim())
    editingId.value = null
    await refresh()
    await reposStore.fetchRepos()
  } catch (e) {
    editError.value = e.message
  } finally {
    busyId.value = null
  }
}

function onEditKeydown(repo, event) {
  if (event.key === 'Enter') {
    saveEdit(repo)
  } else if (event.key === 'Escape') {
    cancelEdit()
  }
}

function onDialogResult() {
  refresh()
  reposStore.fetchRepos()
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="repo-manager">
    <!-- Header -->
    <div class="rm-header">
      <div class="rm-title">Repo Manager</div>
      <div class="rm-actions">
        <button class="rm-btn" @click="repoDialogs?.openOpenDialog()">📂 Open Repository…</button>
        <button class="rm-btn" @click="repoDialogs?.openCloneDialog()">📥 Clone Repository…</button>
      </div>
    </div>

    <!-- Table -->
    <div class="rm-table">
      <div class="rm-row rm-row-head">
        <div class="rm-cell rm-cell-name">名稱</div>
        <div class="rm-cell rm-cell-path">路徑</div>
        <div class="rm-cell rm-cell-status">狀態</div>
        <div class="rm-cell rm-cell-actions">操作</div>
      </div>

      <div v-if="reposStore.allRepos.length === 0" class="rm-empty">
        尚無 repo — 點右上角 Open / Clone 開始
      </div>

      <div
        v-for="repo in reposStore.allRepos"
        :key="repo.id"
        class="rm-row"
        :class="{ 'rm-row-closed': repo.status !== 'open' }"
      >
        <!-- 名稱（可內嵌編輯） -->
        <div class="rm-cell rm-cell-name">
          <div v-if="editingId === repo.id" class="rm-edit-wrap">
            <input
              v-model="editValue"
              class="rm-edit-input"
              type="text"
              placeholder="label（留空 = 清除）"
              @keydown.enter="saveEdit(repo)"
              @keydown.esc="cancelEdit"
            />
            <button class="rm-icon-btn rm-icon-ok" title="儲存" @click="saveEdit(repo)">✓</button>
            <button class="rm-icon-btn" title="取消" @click="cancelEdit">✕</button>
            <div v-if="editError" class="rm-edit-error">{{ editError }}</div>
          </div>
          <template v-else>
            <span class="rm-name">{{ reposStore.displayName(repo) }}</span>
            <button class="rm-icon-btn" title="改名" @click="startEdit(repo)">✏️</button>
          </template>
        </div>

        <!-- 路徑 -->
        <div class="rm-cell rm-cell-path rm-path" :title="repo.path">{{ repo.path }}</div>

        <!-- 狀態 -->
        <div class="rm-cell rm-cell-status">
          <span class="rm-status" :class="repo.status === 'open' ? 'rm-status-open' : 'rm-status-closed'">
            {{ statusText(repo) }}
          </span>
        </div>

        <!-- 操作 -->
        <div class="rm-cell rm-cell-actions">
          <template v-if="confirmPurgeId === repo.id">
            <span class="rm-confirm-text">確定刪除？</span>
            <button class="rm-btn rm-btn-danger rm-btn-sm" :disabled="busyId === repo.id" @click="handlePurge(repo)">刪除</button>
            <button class="rm-btn rm-btn-sm" @click="confirmPurgeId = null">取消</button>
          </template>
          <template v-else>
            <button
              class="rm-btn rm-btn-primary rm-btn-sm"
              :disabled="busyId === repo.id"
              @click="handleOpenRepo(repo)"
            >
              {{ busyId === repo.id ? '…' : (repo.status === 'open' ? '開啟' : '重新開啟') }}
            </button>
            <button
              v-if="repo.status === 'open'"
              class="rm-btn rm-btn-sm"
              :disabled="busyId === repo.id"
              @click="handleClose(repo)"
            >關閉</button>
            <button
              class="rm-btn rm-btn-danger-ghost rm-btn-sm"
              :disabled="busyId === repo.id"
              @click="confirmPurgeId = repo.id"
            >刪除</button>
          </template>
        </div>
      </div>
    </div>

    <!-- 共用 Open/Clone 對話框 -->
    <RepoDialogs ref="repoDialogs" @opened="onDialogResult" @cloned="onDialogResult" />
  </div>
</template>

<style scoped>
.repo-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  overflow-y: auto;
  box-sizing: border-box;
}

.rm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.rm-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.rm-actions {
  display: flex;
  gap: 8px;
}

.rm-btn {
  padding: 5px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  font-family: inherit;
}

.rm-btn:hover:not(:disabled) {
  background: #f0f6fc;
  border-color: #b3d4f7;
}

.rm-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.rm-btn-sm {
  padding: 3px 9px;
  font-size: 11px;
}

.rm-btn-primary {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
}

.rm-btn-primary:hover:not(:disabled) {
  background: #0a86d9;
  border-color: #0a86d9;
}

.rm-btn-danger {
  background: #cb2431;
  border-color: #cb2431;
  color: #fff;
}

.rm-btn-danger:hover:not(:disabled) {
  background: #d33a47;
}

.rm-btn-danger-ghost {
  color: #cb2431;
  border-color: #e0b4b8;
  background: #fff;
}

.rm-btn-danger-ghost:hover:not(:disabled) {
  background: #fff0f0;
}

/* ── Table ─────────────────────────────────────────────────────────── */
.rm-table {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.rm-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  transition: background-color 0.1s;
}

.rm-row:last-child {
  border-bottom: none;
}

.rm-row:hover {
  background: #fafbfc;
}

.rm-row-head {
  background: #f6f8fa;
  font-size: 11px;
  font-weight: bold;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 1px solid #e0e0e0;
}

.rm-row-closed {
  opacity: 0.6;
}

.rm-cell {
  padding: 8px 12px;
  font-size: 12px;
  overflow: hidden;
}

.rm-cell-name { flex: 0 0 28%; min-width: 0; }
.rm-cell-path { flex: 1; min-width: 0; }
.rm-cell-status { flex: 0 0 80px; }
.rm-cell-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; }

.rm-name {
  font-weight: 500;
  color: #333;
  margin-right: 6px;
}

.rm-path {
  color: #777;
  font-family: monospace;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rm-status {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
}

.rm-status-open {
  background: #dafbe1;
  color: #1a7f37;
}

.rm-status-closed {
  background: #eaeef2;
  color: #57606a;
}

.rm-empty {
  padding: 32px;
  text-align: center;
  color: #999;
  font-size: 13px;
  font-style: italic;
}

/* ── Inline edit ───────────────────────────────────────────────────── */
.rm-edit-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.rm-edit-input {
  width: 180px;
  padding: 4px 8px;
  border: 1px solid #007acc;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.rm-edit-error {
  color: #cb2431;
  font-size: 10px;
}

.rm-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  color: #888;
  font-family: inherit;
}

.rm-icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #333;
}

.rm-icon-ok {
  color: #1a7f37;
}

.rm-confirm-text {
  color: #cb2431;
  font-size: 11px;
  font-weight: bold;
}
</style>
