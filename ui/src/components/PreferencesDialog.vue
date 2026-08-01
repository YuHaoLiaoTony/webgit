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

// ─── Git tab ──────────────────────────────────────────────────────────
const gitConfig = ref({ userName: '', userEmail: '', defaultBranch: '' })
const gitLoading = ref(false)
const gitSaving = ref(false)

const activeRepoName = () => reposStore.displayName(reposStore.activeRepo) || '—'

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

async function loadGit() {
  gitLoading.value = true
  try {
    const config = await api.get('/config')
    gitConfig.value = {
      userName: config.userName || '',
      userEmail: config.userEmail || '',
      defaultBranch: config.defaultBranch || '',
    }
  } catch (e) {
    showToast('error', `Failed to load git config: ${e.message}`, 5000)
  } finally {
    gitLoading.value = false
  }
}

async function saveGit() {
  gitSaving.value = true
  try {
    const entries = [
      { key: 'user.name', value: gitConfig.value.userName.trim() },
      { key: 'user.email', value: gitConfig.value.userEmail.trim() },
      { key: 'init.defaultbranch', value: gitConfig.value.defaultBranch.trim() },
    ]
    for (const entry of entries) {
      await api.post('/config', entry)
    }
    showToast('success', 'Git config saved')
  } catch (e) {
    showToast('error', `Failed to save git config: ${e.message}`, 5000)
  } finally {
    gitSaving.value = false
  }
}

// 開啟對話框時依頁籤載入資料
watch(() => props.show, (val) => {
  if (!val) return
  if (activeTab.value === 'ai') loadAi()
  if (activeTab.value === 'git') loadGit()
})

function switchTab(id) {
  activeTab.value = id
  if (id === 'ai') loadAi()
  if (id === 'git') loadGit()
}

function handleClose() {
  emit('close')
}

onMounted(() => {
  if (props.show) loadAi()
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
            <div class="pref-section-title">Git Identity</div>

            <div class="pref-field">
              <label class="pref-label">User Name</label>
              <input v-model="gitConfig.userName" type="text" class="pref-input" placeholder="user.name" />
            </div>

            <div class="pref-field">
              <label class="pref-label">User Email</label>
              <input v-model="gitConfig.userEmail" type="text" class="pref-input" placeholder="user.email" />
            </div>

            <div class="pref-field">
              <label class="pref-label">Default Branch</label>
              <input v-model="gitConfig.defaultBranch" type="text" class="pref-input" placeholder="init.defaultbranch" />
            </div>

            <div v-if="gitLoading" class="pref-loading">Loading…</div>
            <div class="pref-hint">套用於目前 repo：<b>{{ activeRepoName() }}</b></div>
            <div class="pref-section-actions">
              <button class="pref-btn pref-btn-primary" :disabled="gitLoading || gitSaving" @click="saveGit">
                {{ gitSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pref-footer">
          <button class="pref-btn pref-btn-secondary" @click="handleClose">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Variables（亮色預設）──────────────────────────────────────────── */
.pref-dialog {
  --pref-bg: #ffffff;
  --pref-bg-sub: #fafafa;
  --pref-border: #e0e0e0;
  --pref-text: #333333;
  --pref-text-dim: #888888;
  --pref-input-bg: #ffffff;
  --pref-tab-bg: #f3f3f3;
  --pref-tab-active-bg: #ffffff;
  --pref-hover: #f0f6fc;
  --pref-accent: #007acc;
  --pref-badge-ok-bg: #dafbe1;
  --pref-badge-ok-fg: #1a7f37;
  --pref-badge-warn-bg: #fff8c5;
  --pref-badge-warn-fg: #9a6700;
}

/* ── 深色覆寫 ───────────────────────────────────────────────────────── */
:global(html[data-theme='dark']) .pref-dialog {
  --pref-bg: #2d2d2d;
  --pref-bg-sub: #252526;
  --pref-border: #3c3c3c;
  --pref-text: #d4d4d4;
  --pref-text-dim: #9a9a9a;
  --pref-input-bg: #1e1e1e;
  --pref-tab-bg: #252526;
  --pref-tab-active-bg: #2d2d2d;
  --pref-hover: #094771;
  --pref-accent: #3794ff;
  --pref-badge-ok-bg: #12321f;
  --pref-badge-ok-fg: #4ade80;
  --pref-badge-warn-bg: #3a3200;
  --pref-badge-warn-fg: #ffd75e;
}

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

.pref-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pref-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--pref-text-dim);
}

.pref-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pref-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--pref-text);
}

.pref-input {
  padding: 7px 10px;
  border: 1px solid var(--pref-border);
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  background: var(--pref-input-bg);
  color: var(--pref-text);
  outline: none;
}

.pref-input:focus {
  border-color: var(--pref-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pref-accent) 20%, transparent);
}

.pref-textarea {
  padding: 7px 10px;
  border: 1px solid var(--pref-border);
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  background: var(--pref-input-bg);
  color: var(--pref-text);
  outline: none;
  resize: vertical;
  line-height: 1.5;
  user-select: text;
}

.pref-textarea:focus {
  border-color: var(--pref-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--pref-accent) 20%, transparent);
}

.pref-hint {
  font-size: 10px;
  color: var(--pref-text-dim);
  line-height: 1.5;
}

.pref-code {
  font-family: monospace;
  font-size: 11px;
  background: var(--pref-tab-bg);
  padding: 1px 6px;
  border-radius: 3px;
  user-select: text;
}

.pref-loading {
  color: var(--pref-text-dim);
  font-style: italic;
  font-size: 11px;
  text-align: center;
  padding: 8px 0;
}

/* ── Status card (AI) ───────────────────────────────────────────────── */
.pref-status-card {
  border: 1px solid var(--pref-border);
  border-radius: 6px;
  background: var(--pref-bg-sub);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pref-status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pref-status-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--pref-text-dim);
  width: 70px;
  flex-shrink: 0;
}

.pref-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.pref-badge-ok {
  background: var(--pref-badge-ok-bg);
  color: var(--pref-badge-ok-fg);
}

.pref-badge-warn {
  background: var(--pref-badge-warn-bg);
  color: var(--pref-badge-warn-fg);
}

/* ── Theme segment (General) ────────────────────────────────────────── */
.pref-segment {
  display: inline-flex;
  border: 1px solid var(--pref-border);
  border-radius: 5px;
  overflow: hidden;
  align-self: flex-start;
}

.pref-segment-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-family: inherit;
  background: var(--pref-tab-bg);
  border: none;
  color: var(--pref-text-dim);
  cursor: pointer;
}

.pref-segment-btn:not(:first-child) {
  border-left: 1px solid var(--pref-border);
}

.pref-segment-btn:hover {
  color: var(--pref-text);
}

.pref-segment-active,
.pref-segment-active:hover {
  background: var(--pref-accent);
  color: #fff;
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

.pref-key-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pref-link-btn {
  background: none;
  border: none;
  color: var(--pref-accent);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  white-space: nowrap;
}

.pref-link-btn:hover {
  text-decoration: underline;
}

/* ── Section actions / footer ───────────────────────────────────────── */
.pref-section-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.pref-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid var(--pref-border);
  background: var(--pref-bg-sub);
}

.pref-btn {
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid var(--pref-border);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.pref-btn-primary {
  background: var(--pref-accent);
  color: #fff;
  border-color: transparent;
}

.pref-btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.pref-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pref-btn-secondary {
  background: var(--pref-bg);
  color: var(--pref-text);
}

.pref-btn-secondary:hover {
  background: var(--pref-hover);
}
</style>
