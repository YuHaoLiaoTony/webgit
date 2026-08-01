<script setup>
/**
 * 共用 Open / Clone Repository 對話框。
 * TabsBar 與 RepoManager 都用它，透過 ref 呼叫 openOpenDialog() / openCloneDialog()。
 */
import { ref } from 'vue'
import { useReposStore } from '../stores/repos.js'
import FolderPickerDialog from './FolderPickerDialog.vue'

const reposStore = useReposStore()
const emit = defineEmits(['opened', 'cloned'])

// Dialog state
const showOpenDialog = ref(false)
const showCloneDialog = ref(false)
const openPath = ref('')
const cloneUrl = ref('')
const cloneDir = ref('')
const dialogError = ref('')
const dialogLoading = ref(false)

// Folder picker state (shared by Open + Clone dialogs)
const showPicker = ref(false)
const pickerTarget = ref('open') // 'open' | 'clone'
const pickerInitial = ref('')

function openPicker(target) {
  pickerTarget.value = target
  if (target === 'open' && !openPath.value.trim()) {
    // 尚未輸入路徑時：用 Source Code Folder 第一筆當 Browse 初始資料夾
    // （無設定或讀取失敗則維持原行為：從家目錄開始）
    fetch('/api/settings/source-code-folders')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        const first = (data.folders || [])[0]
        pickerInitial.value = first || ''
        showPicker.value = true
      })
      .catch(() => {
        pickerInitial.value = ''
        showPicker.value = true
      })
    return
  }
  pickerInitial.value = target === 'open' ? openPath.value : cloneDir.value
  showPicker.value = true
}

function onPickerSelect(path) {
  if (pickerTarget.value === 'open') {
    openPath.value = path
  } else {
    cloneDir.value = path
  }
  showPicker.value = false
}

function openOpenDialog() {
  openPath.value = ''
  dialogError.value = ''
  showOpenDialog.value = true
}

function openCloneDialog() {
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
    emit('opened')
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
    emit('cloned')
  } catch (e) {
    dialogError.value = e.message
  } finally {
    dialogLoading.value = false
  }
}

defineExpose({ openOpenDialog, openCloneDialog })
</script>

<template>
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
          <div class="repo-path-row">
            <input
              v-model="openPath"
              class="repo-dialog-input"
              type="text"
              placeholder="/path/to/repository"
              @keydown.enter="handleOpenRepo"
            />
            <button class="repo-browse-btn" type="button" @click="openPicker('open')">
              📂 Browse…
            </button>
          </div>
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
          <div class="repo-path-row">
            <input
              v-model="cloneDir"
              class="repo-dialog-input"
              type="text"
              placeholder="/path/to/destination"
              @keydown.enter="handleCloneRepo"
            />
            <button class="repo-browse-btn" type="button" @click="openPicker('clone')">
              📂 Browse…
            </button>
          </div>
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

  <!-- Folder Picker (shared by Open + Clone dialogs) -->
  <FolderPickerDialog
    :show="showPicker"
    :initial-path="pickerInitial"
    @close="showPicker = false"
    @select="onPickerSelect"
  />
</template>

<style scoped>
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

/* ── Path input + Browse button row ───────────────────────────────── */
.repo-path-row {
  display: flex;
  gap: 6px;
}

.repo-path-row .repo-dialog-input {
  flex: 1;
}

.repo-browse-btn {
  flex-shrink: 0;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
}

.repo-browse-btn:hover {
  background: #f0f6fc;
  border-color: #b3d4f7;
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
