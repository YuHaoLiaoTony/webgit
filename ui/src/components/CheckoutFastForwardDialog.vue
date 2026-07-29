<script setup>
import { ref, computed, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useStatusStore } from '../stores/status.js'
import { useUiStore } from '../stores/ui.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  localBranch: { type: String, default: '' },
  remoteBranch: { type: String, default: '' },
})

const emit = defineEmits(['close', 'done'])

const api = useApi()
const statusStore = useStatusStore()
const uiStore = useUiStore()

// ─── Form model ────────────────────────────────────────────────────────
const localChanges = ref('dont-change')
const executing = ref(false)

// ─── Computed: disable state for action button ─────────────────────────
const canExecute = computed(() => {
  return props.localBranch && props.remoteBranch && !executing.value
})

// ─── When dialog opens, reset form ─────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    localChanges.value = 'dont-change'
    executing.value = false
  }
})

// ─── Escape key to close ──────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// ─── Execute action ─────────────────────────────────────────────────────
async function handleExecute() {
  if (!canExecute.value) return

  executing.value = true
  try {
    await api.post('/branches/checkout-ff', {
      localBranch: props.localBranch,
      remoteBranch: props.remoteBranch,
      localChanges: localChanges.value,
    })

    showToast('success', `✅ Checked out ${props.localBranch} and fast-forwarded to ${props.remoteBranch}`)
    uiStore.triggerCommitRefresh()
    statusStore.fetchStatus()
    emit('done')
    emit('close')
  } catch (e) {
    showToast('error', `❌ Operation failed: ${e.message}`, 6000)
  } finally {
    executing.value = false
  }
}

// ─── Cancel ────────────────────────────────────────────────────────────
function handleCancel() {
  emit('close')
}

// ─── Local changes options ────────────────────────────────────────────
const changeOptions = [
  { id: 'dont-change', label: "Don't change" },
  { id: 'stash',       label: 'Stash and reapply' },
  { id: 'discard',     label: 'Discard' },
]
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="ff-overlay"
      @click.self="handleCancel"
      @keydown="onKeydown"
    >
      <div class="ff-dialog">
        <!-- Header -->
        <div class="ff-dialog-header">
          <div class="ff-header-left">
            <span class="ff-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <div class="ff-header-text">
              <div class="ff-title">Checkout and Fast-Forward</div>
              <div class="ff-subtitle">Checkout local branch and fast-forward it to remote branch</div>
            </div>
          </div>
          <button class="ff-close-btn" @click="handleCancel">✕</button>
        </div>

        <!-- Body -->
        <div class="ff-dialog-body">
          <!-- Switch to -->
          <div class="ff-field">
            <label class="ff-label">Switch to:</label>
            <div class="ff-readonly-field">
              <svg class="ff-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
              <span class="ff-branch-name">{{ localBranch }}</span>
            </div>
          </div>

          <!-- Fast-Forward to -->
          <div class="ff-field">
            <label class="ff-label">Fast-Forward to:</label>
            <div class="ff-readonly-field">
              <svg class="ff-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
              <span class="ff-branch-name">{{ remoteBranch }}</span>
            </div>
          </div>

          <!-- Local changes handling -->
          <div class="ff-field">
            <label class="ff-label">Local changes:</label>
            <div class="ff-radio-group">
              <label
                v-for="opt in changeOptions"
                :key="opt.id"
                class="ff-radio-label"
                :class="{ active: localChanges === opt.id }"
              >
                <input
                  type="radio"
                  :value="opt.id"
                  v-model="localChanges"
                  class="ff-radio-input"
                  :disabled="executing"
                />
                <span class="ff-radio-text">{{ opt.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ff-dialog-footer">
          <button class="ff-btn ff-btn-secondary" @click="handleCancel">
            Cancel
          </button>
          <button
            class="ff-btn ff-btn-primary"
            :disabled="!canExecute"
            @click="handleExecute"
          >
            {{ executing ? 'Executing…' : 'Checkout and Fast-Forward' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────── */
.ff-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ── Dialog Card ─────────────────────────────────────────────────────── */
.ff-dialog {
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
.ff-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.ff-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.ff-icon {
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

.ff-header-text {
  display: flex;
  flex-direction: column;
}

.ff-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.ff-subtitle {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
  margin-top: 2px;
}

.ff-close-btn {
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

.ff-close-btn:hover {
  color: #333;
  background-color: #f0f0f0;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.ff-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Fields ──────────────────────────────────────────────────────────── */
.ff-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ff-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* ── Read-only branch display ───────────────────────────────────────── */
.ff-readonly-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f7f7f7;
  color: #555;
  font-size: 13px;
  cursor: default;
  user-select: all;
}

.ff-field-icon {
  flex-shrink: 0;
}

.ff-branch-name {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

/* ── Radio Group ──────────────────────────────────────────────────────── */
.ff-radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.ff-radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background-color 0.1s;
}

.ff-radio-label:hover {
  background-color: #f5f7f9;
}

.ff-radio-label.active {
  background-color: #eef4fa;
}

.ff-radio-input {
  width: 15px;
  height: 15px;
  accent-color: #007acc;
  cursor: pointer;
  flex-shrink: 0;
  margin: 0;
}

.ff-radio-text {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.ff-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.ff-btn {
  padding: 7px 20px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.ff-btn-secondary {
  background: #fff;
  color: #444;
}

.ff-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.ff-btn-primary {
  background: #007acc;
  color: #fff;
  border-color: #005fa3;
}

.ff-btn-primary:hover:not(:disabled) {
  background: #005fa3;
}

.ff-btn-primary:disabled {
  background: #94c5e8;
  border-color: #7fb3d9;
  cursor: not-allowed;
}
</style>
