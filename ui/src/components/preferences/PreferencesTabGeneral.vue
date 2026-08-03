<script setup>
/**
 * Preferences General Tab — 主題切換與 Source Code Folder 設定。
 * 自給自足：自行使用 useApi() 與 useUiStore()，不依賴父層 props。
 */
import { ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi.js'
import { useUiStore } from '../../stores/ui.js'
import { showToast } from '../../composables/useToast.js'
import FolderPickerDialog from '../FolderPickerDialog.vue'

const api = useApi()
const uiStore = useUiStore()

// ─── Theme ────────────────────────────────────────────────────────────
const themeOptions = [
  { id: 'light', label: '☀ Light' },
  { id: 'dark', label: '🌙 Dark' },
]

// ─── Source Code Folder ───────────────────────────────────────────────
const srcFolders = ref([])
const srcLoading = ref(false)
const srcSaving = ref(false)
const srcPicker = ref(false)
const srcPickerIndex = ref(null)
const srcPickerInitial = ref('')

async function loadSourceFolders() {
  srcLoading.value = true
  try {
    const data = await api.get('/settings/source-code-folders')
    srcFolders.value = data.folders || []
  } catch (e) {
    showToast('error', `Failed to load source code folders: ${e.message}`, 5000)
  } finally {
    srcLoading.value = false
  }
}

async function saveSourceFolders() {
  srcSaving.value = true
  try {
    const data = await api.post('/settings/source-code-folders', { folders: srcFolders.value })
    srcFolders.value = data.folders || []
    showToast('success', 'Source code folders saved')
  } catch (e) {
    showToast('error', `Failed to save source code folders: ${e.message}`, 5000)
  } finally {
    srcSaving.value = false
  }
}

function addFolder() {
  srcFolders.value.push('')
}

function removeFolder(i) {
  srcFolders.value.splice(i, 1)
}

function moveFolder(i, dir) {
  const j = i + dir
  if (j < 0 || j >= srcFolders.value.length) return
  const [item] = srcFolders.value.splice(i, 1)
  srcFolders.value.splice(j, 0, item)
}

function openSrcPicker(i) {
  srcPickerIndex.value = i
  srcPickerInitial.value = srcFolders.value[i] || ''
  srcPicker.value = true
}

function onSrcPickerSelect(path) {
  if (srcPickerIndex.value !== null) {
    srcFolders.value[srcPickerIndex.value] = path
  }
  srcPicker.value = false
  srcPickerIndex.value = null
}

onMounted(() => {
  loadSourceFolders()
})
</script>

<template>
  <div class="pref-section">
    <div class="pref-section-title">Appearance</div>
    <div class="pref-field">
      <label class="pref-label">Theme</label>
      <div class="pref-segment">
        <button
          v-for="opt in themeOptions"
          :key="opt.id"
          class="pref-segment-btn"
          :class="{ 'pref-segment-active': uiStore.theme === opt.id }"
          @click="uiStore.setTheme(opt.id)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="pref-hint">切換立即生效，並儲存於瀏覽器。</div>
    </div>

    <!-- Source Code Folder -->
    <div class="pref-section-title pref-section-title-gap">Source Code Folder</div>
    <div class="pref-hint">可設定多筆資料夾；<b>第一筆</b>為 Open Repo（📂 Browse）開啟時的預設資料夾。</div>

    <div v-for="(folder, i) in srcFolders" :key="i" class="src-folder-row">
      <span v-if="i === 0" class="src-default-badge" title="Open Repo 的預設資料夾">預設</span>
      <input
        v-model="srcFolders[i]"
        type="text"
        class="pref-input src-folder-input"
        placeholder="/path/to/code"
        spellcheck="false"
      />
      <button class="src-btn" type="button" title="Browse…" @click="openSrcPicker(i)">📂</button>
      <button class="src-btn" type="button" title="上移（第一筆為預設）" :disabled="i === 0" @click="moveFolder(i, -1)">↑</button>
      <button class="src-btn" type="button" title="下移" :disabled="i === srcFolders.length - 1" @click="moveFolder(i, 1)">↓</button>
      <button class="src-btn src-btn-remove" type="button" title="刪除" @click="removeFolder(i)">✕</button>
    </div>

    <div v-if="srcFolders.length === 0 && !srcLoading" class="src-empty">
      尚未設定，Browse 將從家目錄開始。
    </div>
    <div v-if="srcLoading" class="pref-loading">Loading…</div>

    <div class="src-row-actions">
      <button class="pref-btn pref-btn-secondary" type="button" :disabled="srcLoading || srcSaving" @click="addFolder">＋ Add Folder</button>
      <span class="src-spacer"></span>
      <button class="pref-btn pref-btn-primary" type="button" :disabled="srcLoading || srcSaving" @click="saveSourceFolders">
        {{ srcSaving ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </div>

  <!-- 資料夾選擇器（Source Code Folder 用） -->
  <FolderPickerDialog
    :show="srcPicker"
    :initial-path="srcPickerInitial"
    @close="srcPicker = false"
    @select="onSrcPickerSelect"
  />
</template>

<style scoped>
@import '../../styles/preferences-common.css';

/* ── Source Code Folder rows ───────────────────────────────────────── */
.src-folder-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.src-folder-input {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.src-default-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--pref-badge-ok-fg);
  background: var(--pref-badge-ok-bg);
  border-radius: 3px;
  padding: 2px 6px;
  white-space: nowrap;
}

.src-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--pref-border);
  border-radius: 4px;
  background: var(--pref-input-bg);
  color: var(--pref-text);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  font-family: inherit;
}

.src-btn:hover:not(:disabled) {
  background: var(--pref-hover);
  border-color: var(--pref-accent);
}

.src-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.src-btn-remove:hover:not(:disabled) {
  background: #fde8e8;
  color: #cb2431;
  border-color: #cb2431;
}

:global(html[data-theme='dark']) .src-btn-remove:hover:not(:disabled) {
  background: #3a1d1d;
  color: #ff8080;
  border-color: #ff8080;
}

.src-empty {
  font-size: 11px;
  color: var(--pref-text-dim);
  font-style: italic;
}

.src-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.src-spacer {
  flex: 1;
}
</style>
