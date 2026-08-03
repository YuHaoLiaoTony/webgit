<script setup>
/**
 * Preferences AI Tab — AI commit 設定。
 * 自給自足：自行使用 useApi()，不依賴父層 props。
 * 左側 profile 列表 + 右側表單編輯，雙欄佈局。
 */
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../composables/useApi.js'
import { showToast } from '../../composables/useToast.js'

const api = useApi()

// ─── State ────────────────────────────────────────────────────────────
// profile: { id, name, baseUrl, apiKeyMasked, hasKey, prompt, note }
// 前端狀態：apiKey（新輸入值，空 = 未修改）、editingKey（是否顯示輸入框）
const profiles = ref([])
const activeId = ref('')
const aiLoading = ref(false)
const aiSaving = ref(false)

// 左側列表中選中的項目（右側顯示其設定內容）
const selectedIndex = ref(-1)
const selectedProfile = computed(() =>
  selectedIndex.value < 0 || selectedIndex.value >= profiles.value.length
    ? null
    : profiles.value[selectedIndex.value]
)

// ─── Methods ──────────────────────────────────────────────────────────
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
    selectedIndex.value = activeIdx >= 0 ? activeIdx : (profiles.value.length ? 0 : -1)
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
    selectedIndex.value = activeIdx >= 0 ? activeIdx : (profiles.value.length ? 0 : -1)
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
  if (idx < 0 || idx >= profiles.value.length) return
  const removed = profiles.value[idx]
  profiles.value.splice(idx, 1)
  if (activeId.value === removed.id) {
    activeId.value = profiles.value[0]?.id || ''
  }
  // 修正選取：優先選同一位置，否則選最後一組
  selectedIndex.value = profiles.value.length
    ? Math.min(idx, profiles.value.length - 1)
    : -1
}

// ─── Lifecycle ────────────────────────────────────────────────────────
onMounted(() => {
  loadAi()
})
</script>

<template>
  <div class="pref-section ai-layout">
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
        <button class="ai-remove-btn" title="刪除選取的 AI 設定" :disabled="aiLoading || aiSaving || selectedIndex === -1" @click="removeProfile">－</button>
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
</template>

<style scoped>
@import '../../styles/preferences-common.css';

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
