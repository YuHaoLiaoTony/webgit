<script setup>
import { ref, computed, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'created'])

const api = useApi()

// ─── Data ──────────────────────────────────────────────────────────────
const name = ref('')
const url = ref('')
const creating = ref(false)
const existingRemotes = ref([])      // 重複名稱預檢用
const errorMessage = ref('')         // 伺服器/API 錯誤
const fieldErrors = ref({ name: '', url: '' })

// ─── 與後端 git.js 相同的驗證規則（雙層驗證）────────────────────────
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const URL_RE = /^(https?|git|ssh|file):\/\//i

function validateName(value) {
  const v = (value || '').trim()
  if (!v) return '名稱不可為空'
  if (v.length > 255) return '名稱過長（最多 255 字元）'
  if (!NAME_RE.test(v)) return '名稱含非法字元'
  if (existingRemotes.value.includes(v)) return `remote ${v} 已存在`
  return ''
}

function validateUrl(value) {
  const v = (value || '').trim()
  if (!v) return 'URL 不可為空'
  if (v.length > 2048) return 'URL 過長'
  const valid =
    URL_RE.test(v) ||
    /^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+:.+/.test(v) || // scp-like: user@host:path
    /^\//.test(v)                                     // 本機絕對路徑
  if (!valid) return 'URL 格式無效'
  return ''
}

// ─── Computed: 是否可建立（前端預檢通過 + 非載入中）────────────────
const canCreate = computed(() => {
  return validateName(name.value) === '' && validateUrl(url.value) === '' && !creating.value
})

// ─── 開啟時重置表單並載入既有 remotes（供重複名稱預檢）────────────
watch(() => props.show, async (val) => {
  if (val) {
    name.value = ''
    url.value = ''
    creating.value = false
    errorMessage.value = ''
    fieldErrors.value = { name: '', url: '' }
    try {
      const data = await api.get('/remotes')
      existingRemotes.value = (data || []).map(r => r.name)
    } catch (_) {
      existingRemotes.value = []
    }
  }
})

// ─── Escape 關閉 ──────────────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// ─── 建立 remote ──────────────────────────────────────────────────────
async function handleCreate() {
  if (creating.value) return

  // 前端預檢：顯示欄位錯誤並阻止送出
  const nameError = validateName(name.value)
  const urlError = validateUrl(url.value)
  fieldErrors.value = { name: nameError, url: urlError }
  errorMessage.value = ''
  if (nameError || urlError) return

  creating.value = true
  try {
    await api.post('/remotes', { name: name.value.trim(), url: url.value.trim() })
    showToast('success', `Remote "${name.value.trim()}" added`)
    emit('created')
    emit('close')
  } catch (e) {
    // 新增失敗（網路 / 伺服器錯誤 / 後端兜底拒絕）→ 顯示錯誤、維持列表不變
    errorMessage.value = e.message
  } finally {
    creating.value = false
  }
}

// ─── 取消 ─────────────────────────────────────────────────────────────
function handleCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="new-branch-overlay"
      @click.self="handleCancel"
      @keydown="onKeydown"
    >
      <div class="new-branch-dialog add-remote-dialog">
        <!-- Header -->
        <div class="new-branch-dialog-header">
          <div class="new-branch-header-left">
            <span class="new-branch-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="4" r="2"></circle>
                <circle cx="4" cy="18" r="2"></circle>
                <circle cx="16" cy="18" r="2"></circle>
                <path d="M8 6v8"></path>
                <path d="M8 14a4 4 0 0 0 8 0"></path>
                <path d="M8 14a4 4 0 0 1-4 0"></path>
              </svg>
            </span>
            <div class="new-branch-header-text">
              <div class="new-branch-title">Add Remote</div>
              <div class="new-branch-subtitle">Add a new remote for this repository</div>
            </div>
          </div>
          <button class="new-branch-close-btn" @click="handleCancel">✕</button>
        </div>

        <!-- Body -->
        <div class="new-branch-dialog-body">
          <!-- Remote name -->
          <div class="new-branch-field">
            <label class="new-branch-label">Remote name:</label>
            <div class="new-branch-input-wrapper">
              <svg class="new-branch-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="8" cy="4" r="2"></circle>
                <circle cx="4" cy="18" r="2"></circle>
                <circle cx="16" cy="18" r="2"></circle>
                <path d="M8 6v8"></path>
                <path d="M8 14a4 4 0 0 0 8 0"></path>
                <path d="M8 14a4 4 0 0 1-4 0"></path>
              </svg>
              <input
                v-model="name"
                class="new-branch-input add-remote-name-input"
                type="text"
                placeholder="e.g. upstream"
                :disabled="creating"
                @keydown.enter="handleCreate"
              />
            </div>
            <div v-if="fieldErrors.name" class="add-remote-field-error" role="alert">
              {{ fieldErrors.name }}
            </div>
          </div>

          <!-- Remote URL -->
          <div class="new-branch-field">
            <label class="new-branch-label">Remote URL:</label>
            <div class="new-branch-input-wrapper">
              <svg class="new-branch-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <input
                v-model="url"
                class="new-branch-input add-remote-url-input"
                type="text"
                placeholder="https://github.com/user/repo.git"
                :disabled="creating"
                @keydown.enter="handleCreate"
              />
            </div>
            <div v-if="fieldErrors.url" class="add-remote-field-error" role="alert">
              {{ fieldErrors.url }}
            </div>
          </div>

          <!-- General error (server / network) -->
          <div v-if="errorMessage" class="add-remote-error" role="alert">
            {{ errorMessage }}
          </div>
        </div>

        <!-- Footer -->
        <div class="new-branch-dialog-footer">
          <button class="new-branch-btn new-branch-btn-secondary add-remote-cancel-btn" @click="handleCancel">
            Cancel
          </button>
          <button
            class="new-branch-btn new-branch-btn-primary add-remote-create-btn"
            :disabled="creating"
            @click="handleCreate"
          >
            {{ creating ? 'Adding…' : 'Add Remote' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────── */
.new-branch-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ── Dialog Card ─────────────────────────────────────────────────────── */
.new-branch-dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.new-branch-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.new-branch-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.new-branch-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007acc, #005fa3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.new-branch-header-text {
  display: flex;
  flex-direction: column;
}

.new-branch-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.new-branch-subtitle {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
  margin-top: 2px;
}

.new-branch-close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #aaa;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;
  flex-shrink: 0;
  margin-top: 2px;
}

.new-branch-close-btn:hover {
  color: #333;
  background-color: #f0f0f0;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.new-branch-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Fields ──────────────────────────────────────────────────────────── */
.new-branch-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.new-branch-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ── Input ───────────────────────────────────────────────────────────── */
.new-branch-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.new-branch-input-wrapper:focus-within {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.new-branch-field-icon {
  flex-shrink: 0;
}

.new-branch-input {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-radius: 0;
  font-size: 13px;
  font-family: inherit;
  background: transparent;
  color: #333;
  outline: none;
}

.new-branch-input::placeholder {
  color: #bbb;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.new-branch-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.new-branch-btn {
  padding: 7px 20px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.new-branch-btn-secondary {
  background: #fff;
  color: #444;
}

.new-branch-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.new-branch-btn-primary {
  background: #007acc;
  color: #fff;
  border-color: #005fa3;
}

.new-branch-btn-primary:hover:not(:disabled) {
  background: #005fa3;
}

.new-branch-btn-primary:disabled {
  background: #94c5e8;
  border-color: #7fb3d9;
  cursor: not-allowed;
}

/* ── AddRemoteDialog 專屬補充 ────────────────────────────────────── */

/* Field 錯誤訊息 */
.add-remote-field-error {
  font-size: 11px;
  color: #d93025;
  padding: 2px 2px 0;
}

/* 一般錯誤（伺服器 / 網路） */
.add-remote-error {
  margin-top: 2px;
  padding: 8px 10px;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  background: #fdf0f0;
  color: #c62828;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}
</style>
