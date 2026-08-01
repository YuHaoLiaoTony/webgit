<script setup>
/**
 * Preferences 偏好設定對話框。
 * 頂部頁籤切換：General（主題）/ AI（AI commit 設定）/ Git（user.name 等 config）。
 * AI 與 Git 皆走現有 /api/config 端點（依目前啟用的 repo）。
 */
import { ref, onMounted, watch } from 'vue'
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
const aiStatus = ref({ configured: false, baseUrl: '' })
const aiPrompt = ref('')
const aiLoading = ref(false)
const aiSaving = ref(false)

// ─── Git tab ──────────────────────────────────────────────────────────
const gitConfig = ref({ userName: '', userEmail: '', defaultBranch: '' })
const gitLoading = ref(false)
const gitSaving = ref(false)

const activeRepoName = () => reposStore.displayName(reposStore.activeRepo) || '—'

async function loadAi() {
  aiLoading.value = true
  try {
    const [status, config] = await Promise.all([
      api.get('/ai/status'),
      api.get('/config'),
    ])
    aiStatus.value = status
    aiPrompt.value = config.aiPrompt || ''
  } catch (e) {
    showToast('error', `Failed to load AI settings: ${e.message}`, 5000)
  } finally {
    aiLoading.value = false
  }
}

async function saveAi() {
  aiSaving.value = true
  try {
    await api.post('/config', { key: 'webgit.aiprompt', value: aiPrompt.value.trim() })
    showToast('success', 'AI prompt saved')
  } catch (e) {
    showToast('error', `Failed to save AI prompt: ${e.message}`, 5000)
  } finally {
    aiSaving.value = false
  }
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
          <div v-else-if="activeTab === 'ai'" class="pref-section">
            <div class="pref-section-title">AI Commit Message</div>

            <!-- Status card -->
            <div class="pref-status-card">
              <div class="pref-status-row">
                <span class="pref-status-label">API Key</span>
                <span
                  class="pref-badge"
                  :class="aiStatus.configured ? 'pref-badge-ok' : 'pref-badge-warn'"
                >
                  {{ aiStatus.configured ? 'Configured' : 'Not configured' }}
                </span>
              </div>
              <div class="pref-status-row">
                <span class="pref-status-label">Base URL</span>
                <code class="pref-code">{{ aiStatus.baseUrl || '—' }}</code>
              </div>
              <div v-if="!aiStatus.configured" class="pref-hint">
                請在 server 的 .env 設定 <code>OPENCODE_API_KEY</code> 後重啟。
              </div>
            </div>

            <!-- Prompt -->
            <div class="pref-field">
              <label class="pref-label">Custom Prompt</label>
              <textarea
                v-model="aiPrompt"
                class="pref-textarea"
                rows="5"
                placeholder="例如：請用繁體中文、遵循 Conventional Commits 格式產生 commit message…"
              ></textarea>
              <div class="pref-hint">
                留空 = 使用預設提示詞。此設定儲存於目前 repo 的 git config（webgit.aiprompt）。
              </div>
            </div>

            <div v-if="aiLoading" class="pref-loading">Loading…</div>
            <div class="pref-section-actions">
              <button class="pref-btn pref-btn-primary" :disabled="aiLoading || aiSaving" @click="saveAi">
                {{ aiSaving ? 'Saving…' : 'Save' }}
              </button>
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
  width: 520px;
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
