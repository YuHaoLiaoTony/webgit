<script setup>
/**
 * Preferences 偏好設定對話框。
 * 頂部頁籤切換：General（主題）/ AI（AI commit 設定）/ Git（user.name 等 config）。
 * AI 與 Git 皆走現有 /api/config 端點（依目前啟用的 repo）。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useUiStore } from '../stores/ui.js'
import { useReposStore } from '../stores/repos.js'
import { showToast } from '../composables/useToast.js'
import FolderPickerDialog from './FolderPickerDialog.vue'
import PreferencesTabGit from './preferences/PreferencesTabGit.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const api = useApi()
const uiStore = useUiStore()
const reposStore = useReposStore()

// ─── Tabs ─────────────────────────────────────────────────────────────
const tabs = [
  { id: 'general', label: 'General', icon: '⚙' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'git', label: 'Git', icon: '🔧' },
]
const activeTab = ref('general')

// ─── General ──────────────────────────────────────────────────────────
const themeOptions = [
  { id: 'light', label: '☀ Light' },
  { id: 'dark', label: '🌙 Dark' },
]

// ─── Source Code Folder (General) ────────────────────────────────────
// 多筆絕對路徑；第一筆 = Open Repo（📂 Browse）的預設資料夾。
// 存於伺服器端 ~/.webgit/settings.json。
const srcFolders = ref([])
const srcLoading = ref(false)
const srcSaving = ref(false)
const srcPicker = ref(false)        // FolderPickerDialog 顯示與否
const srcPickerIndex = ref(null)    // 正在編輯的筆數 index
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
    // 回寫伺服器正規化後的結果（絕對路徑、去重）
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

// ─── AI tab ───────────────────────────────────────────────────────────
// profile: { id, name, baseUrl, apiKeyMasked, hasKey, prompt, note }
// 前端狀態：apiKey（新輸入值，空 = 未修改）、editingKey（是否顯示輸入框）
const profiles = ref([])
const activeId = ref('')
const aiLoading = ref(false)
const aiSaving = ref(false)

// 左側列表中選中的項目（右側顯示其設定內容）
const selectedIndex = ref(null)
const selectedProfile = computed(() =>
  selectedIndex.value === null || selectedIndex.value >= profiles.value.length
    ? null
    : profiles.value[selectedIndex.value]
)

async function loadAi() {
  aiLoading.value = true
  try {
    const data = await api.get('/ai/profiles')
    profiles.value = (data.profiles || []).map(p => ({
      ...p,
      apiKey: '',          // 新輸入值（空 = 未修改，儲存時送遮蔽值）
      editingKey: false,   // 是否展開 API Key 輸入框
    }))
    activeId.value = data.active || ''
    // 預設選中 active 的那組，否則選第一組
    const activeIdx = profiles.value.findIndex(p => p.id === activeId.value)
    selectedIndex.value = activeIdx >= 0 ? activeIdx : (profiles.value.length ? 0 : null)
  } catch (e) {
    showToast('error', `Failed to load AI settings: ${e.message}`, 5000)
  } finally {
    aiLoading.value = false
  }
}

async function saveAi() {
  aiSaving.value = true
  try {
    const payload = {
      active: activeId.value,
      profiles: profiles.value.map(p => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        // 有輸入新 key 就送新值，否則送遮蔽值讓 server 保留舊 key
        apiKey: p.apiKey.trim() || p.apiKeyMasked || '',
        prompt: p.prompt,
        note: p.note,
      })),
    }
    const result = await api.post('/ai/profiles', payload)
    // 回寫遮蔽值並重置編輯狀態
    profiles.value = (result.profiles || []).map(p => ({
      ...p,
      apiKey: '',
      editingKey: false,
    }))
    activeId.value = result.active || ''
    const activeIdx = profiles.value.findIndex(p => p.id === activeId.value)
    selectedIndex.value = activeIdx >= 0 ? activeIdx : (profiles.value.length ? 0 : null)
    showToast('success', 'AI profiles saved')
  } catch (e) {
    showToast('error', `Failed to save AI settings: ${e.message}`, 5000)
  } finally {
    aiSaving.value = false
  }
}

function addProfile() {
  profiles.value.push({
    id: '',
    name: '',
    baseUrl: 'https://',
    apiKey: '',
    apiKeyMasked: '',
    hasKey: false,
    prompt: '',
    note: '',
    editingKey: true,
  })
  // 新組自動被選中編輯
  selectedIndex.value = profiles.value.length - 1
  // 沒有 active 時，第一組自動成為 active
  if (!activeId.value) activeId.value = profiles.value[0].id
}

function selectProfile(index) {
  selectedIndex.value = index
}

function removeProfile() {
  const idx = selectedIndex.value
  if (idx === null || idx >= profiles.value.length) return
  const removed = profiles.value[idx]
  profiles.value.splice(idx, 1)
  if (activeId.value === removed.id) {
    activeId.value = profiles.value[0]?.id || ''
  }
  // 修正選取：優先選同一位置，否則選最後一組
  selectedIndex.value = profiles.value.length
    ? Math.min(idx, profiles.value.length - 1)
    : null
}

// 開啟對話框時依頁籤載入資料
watch(() => props.show, (val) => {
  if (!val) return
  if (activeTab.value === 'general') loadSourceFolders()
  if (activeTab.value === 'ai') loadAi()
})

function switchTab(id) {
  activeTab.value = id
  if (id === 'general') loadSourceFolders()
  if (id === 'ai') loadAi()
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  if (!props.show) return
  if (activeTab.value === 'general') loadSourceFolders()
  if (activeTab.value === 'ai') loadAi()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="pref-overlay" @click.self="handleClose">
      <div class="pref-dialog">
        <!-- Header -->
        <div class="pref-header">
          <div class="pref-title">⚙ Preferences</div>
          <button class="pref-close-btn" @click="handleClose">×</button>
        </div>

        <!-- Top tabs -->
        <div class="pref-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="pref-tab"
            :class="{ 'pref-tab-active': activeTab === tab.id }"
            @click="switchTab(tab.id)"
          >
            <span class="pref-tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Body -->
        <div class="pref-body">
          <!-- ── General ─────────────────────────────────────────── -->
          <div v-if="activeTab === 'general'" class="pref-section">
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

          <!-- ── AI ──────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'ai'" class="pref-section ai-layout">
            <!-- 左側：AI 列表 ＋ － -->
            <div class="ai-left">
              <div class="ai-list">
                <div
                  v-for="(profile, index) in profiles"
                  :key="profile.id || index"
                  class="ai-list-item"
                  :class="{
                    'ai-list-item-selected': index === selectedIndex,
                    'ai-list-item-active': profile.id === activeId,
                  }"
                  @click="selectProfile(index)"
                >
                  <span v-if="profile.id === activeId" class="ai-list-dot" title="啟用中">●</span>
                  <span class="ai-list-name">{{ profile.name || `Profile ${index + 1}` }}</span>
                </div>

                <div v-if="!aiLoading && profiles.length === 0" class="ai-empty">
                  尚未設定任何 AI profile<br />點下方 ＋ 新增第一組
                </div>
                <div v-if="aiLoading" class="ai-loading">Loading…</div>
              </div>

              <!-- 左側底部：＋ 新增 / － 刪除 -->
              <div class="ai-list-actions">
                <button class="ai-add-btn" title="新增 AI 設定" :disabled="aiLoading || aiSaving" @click="addProfile">＋</button>
                <button class="ai-remove-btn" title="刪除選取的 AI 設定" :disabled="aiLoading || aiSaving || selectedIndex === null" @click="removeProfile()">－</button>
              </div>
            </div>

            <!-- 右側：AI 設定內容 -->
            <div class="ai-right">
              <template v-if="selectedProfile">
                <div class="ai-right-head">
                  <div class="ai-right-title">{{ selectedProfile.name || `Profile ${selectedIndex + 1}` }}</div>
                  <label class="ai-active-toggle" title="點選後這組成為啟用中的 AI">
                    <input
                      type="radio"
                      :checked="selectedProfile.id === activeId"
                      @change="activeId = selectedProfile.id"
                    />
                    設為啟用
                  </label>
                </div>

                <div class="pref-field">
                  <label class="pref-label">名稱</label>
                  <input v-model="selectedProfile.name" type="text" class="pref-input" placeholder="例如 OpenCode" />
                </div>

                <div class="pref-field">
                  <label class="pref-label">Base URL</label>
                  <input v-model="selectedProfile.baseUrl" type="text" class="pref-input" placeholder="https://api.example.com/v1" />
                </div>

                <div class="pref-field">
                  <label class="pref-label">API Key</label>
                  <template v-if="selectedProfile.editingKey">
                    <input
                      v-model="selectedProfile.apiKey"
                      type="password"
                      class="pref-input"
                      placeholder="輸入新的 API Key"
                    />
                    <button class="pref-link-btn" @click="selectedProfile.editingKey = false; selectedProfile.apiKey = ''">取消</button>
                  </template>
                  <template v-else>
                    <div class="pref-key-row">
                      <code class="pref-code">{{ selectedProfile.apiKeyMasked || '未設定' }}</code>
                      <button class="pref-link-btn" @click="selectedProfile.editingKey = true">變更</button>
                    </div>
                  </template>
                </div>

                <div class="pref-field">
                  <label class="pref-label">AI Prompt（這組專用，留空 = 預設）</label>
                  <textarea
                    v-model="selectedProfile.prompt"
                    class="pref-textarea"
                    rows="4"
                    placeholder="例如：請用繁體中文、遵循 Conventional Commits 格式產生 commit message…"
                  ></textarea>
                </div>

                <div class="pref-field">
                  <label class="pref-label">備註（選填）</label>
                  <input v-model="selectedProfile.note" type="text" class="pref-input" placeholder="例如：備援用 / 只跑 4o-mini" />
                </div>
              </template>
              <div v-else class="ai-right-empty">
                <div class="ai-right-empty-icon">🤖</div>
                <div>請在左側選擇或新增一組 AI 設定</div>
              </div>

              <div class="pref-section-actions">
                <button class="pref-btn pref-btn-primary" :disabled="aiLoading || aiSaving || profiles.length === 0" @click="saveAi">
                  {{ aiSaving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </div>
          </div>

          <!-- ── Git ─────────────────────────────────────────────── -->
          <div v-else-if="activeTab === 'git'" class="pref-section">
            <PreferencesTabGit />
          </div>
        </div>

        <!-- Footer -->
        <div class="pref-footer">
          <button class="pref-btn pref-btn-secondary" @click="handleClose">Close</button>
        </div>
      </div>

      <!-- 資料夾選擇器（Source Code Folder 用） -->
      <FolderPickerDialog
        :show="srcPicker"
        :initial-path="srcPickerInitial"
        @close="srcPicker = false"
        @select="onSrcPickerSelect"
      />
    </div>
  </Teleport>
</template>

<style scoped>
@import '../styles/preferences-common.css';

.pref-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.pref-dialog {
  background: var(--pref-bg);
  color: var(--pref-text);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  width: 600px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.pref-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
}

.pref-title {
  font-size: 15px;
  font-weight: 700;
}

.pref-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--pref-text-dim);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.pref-close-btn:hover {
  color: var(--pref-text);
}

/* ── Top tabs ───────────────────────────────────────────────────────── */
.pref-tabs {
  display: flex;
  gap: 2px;
  padding: 0 18px;
  border-bottom: 1px solid var(--pref-border);
}

.pref-tab {
  background: none;
  border: none;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--pref-text-dim);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}

.pref-tab:hover {
  color: var(--pref-text);
}

.pref-tab-active {
  color: var(--pref-accent);
  border-bottom-color: var(--pref-accent);
  background: var(--pref-tab-active-bg);
}

.pref-tab-icon {
  font-size: 13px;
}

/* ── Body ───────────────────────────────────────────────────────────── */
.pref-body {
  padding: 16px 18px;
  overflow-y: auto;
  max-height: 55vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Source Code Folder rows (General) ────────────────────────────── */
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

/* ── AI two-column layout ─────────────────────────────────────────── */
.ai-layout {
  flex-direction: row;
  align-items: stretch;
  gap: 12px;
}

/* 左側：AI 列表 */
.ai-left {
  width: 168px;
  flex-shrink: 0;
  border: 1px solid var(--pref-border);
  border-radius: 6px;
  background: var(--pref-bg-sub);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 130px;
  max-height: 320px;
}

.ai-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--pref-text);
  border: 1px solid transparent;
  user-select: none;
}

.ai-list-item:hover {
  background: var(--pref-hover);
}

.ai-list-item-selected {
  background: var(--pref-hover);
  border-color: var(--pref-accent);
}

.ai-list-item-active .ai-list-name {
  font-weight: 700;
}

.ai-list-dot {
  color: var(--pref-accent);
  font-size: 9px;
  flex-shrink: 0;
}

.ai-list-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-empty {
  padding: 18px 10px;
  font-size: 11px;
  color: var(--pref-text-dim);
  text-align: center;
  line-height: 1.6;
}

.ai-loading {
  padding: 18px 10px;
  font-size: 11px;
  color: var(--pref-text-dim);
  text-align: center;
  font-style: italic;
}

/* 左側底部：＋ － */
.ai-list-actions {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--pref-border);
}

.ai-add-btn,
.ai-remove-btn {
  flex: 1;
  padding: 6px 0;
  border-radius: 4px;
  border: 1px solid var(--pref-border);
  background: var(--pref-bg);
  color: var(--pref-text);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  line-height: 1;
}

.ai-add-btn:hover:not(:disabled) {
  background: var(--pref-hover);
  color: var(--pref-accent);
  border-color: var(--pref-accent);
}

.ai-remove-btn:hover:not(:disabled) {
  background: #fde8e8;
  color: #cb2431;
  border-color: #cb2431;
}

:global(html[data-theme='dark']) .ai-remove-btn:hover:not(:disabled) {
  background: #3a1d1d;
  color: #ff8080;
  border-color: #ff8080;
}

.ai-add-btn:disabled,
.ai-remove-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 右側：設定內容 */
.ai-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-right-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ai-right-title {
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-active-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--pref-text-dim);
  cursor: pointer;
  flex-shrink: 0;
}

.ai-active-toggle:hover {
  color: var(--pref-text);
}

.ai-active-toggle input {
  width: 13px;
  height: 13px;
  accent-color: var(--pref-accent);
  cursor: pointer;
}

.ai-right-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--pref-text-dim);
  font-size: 12px;
  text-align: center;
  padding: 28px 12px;
  border: 1px dashed var(--pref-border);
  border-radius: 6px;
}

.ai-right-empty-icon {
  font-size: 28px;
}

</style>
