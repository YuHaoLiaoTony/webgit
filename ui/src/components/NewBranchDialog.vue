<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'created'])

const api = useApi()
const statusStore = useStatusStore()

// ─── Data ──────────────────────────────────────────────────────────────
const currentBranch = ref('')
const branchName = ref('')
const checkoutAfterCreate = ref(true)
const creating = ref(false)
const loading = ref(false)

// ─── Computed: disable state for Create button ─────────────────────────
const canCreate = computed(() => {
  return branchName.value.trim().length > 0 && !creating.value
})

// ─── Fetch current branch ──────────────────────────────────────────────
async function fetchCurrentBranch() {
  loading.value = true
  try {
    // Try status store first (already fetched)
    if (statusStore.current) {
      currentBranch.value = statusStore.current
    } else {
      // Fallback: fetch from API
      const data = await api.get('/branches')
      currentBranch.value = data.current || ''
    }
  } catch (e) {
    console.error('Failed to fetch current branch:', e)
    currentBranch.value = 'unknown'
  } finally {
    loading.value = false
  }
}

// ─── When dialog opens, fetch data and reset form ──────────────────────
watch(() => props.show, (val) => {
  if (val) {
    branchName.value = ''
    checkoutAfterCreate.value = true
    creating.value = false
    fetchCurrentBranch()
  }
})

// ─── Escape key to close ──────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// ─── Create branch action ──────────────────────────────────────────────
async function handleCreate() {
  if (!canCreate.value) return

  creating.value = true
  try {
    await api.post('/branches', {
      name: branchName.value.trim(),
      checkout: checkoutAfterCreate.value,
    })

    showToast('success', `Branch "${branchName.value.trim()}" created`)
    emit('created')
    emit('close')
  } catch (e) {
    showToast('error', `Failed to create branch: ${e.message}`, 6000)
  } finally {
    creating.value = false
  }
}

// ─── Cancel ────────────────────────────────────────────────────────────
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
      <div class="new-branch-dialog">
        <!-- Header -->
        <div class="new-branch-dialog-header">
          <div class="new-branch-header-left">
            <span class="new-branch-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
            </span>
            <div class="new-branch-header-text">
              <div class="new-branch-title">Create Branch</div>
              <div class="new-branch-subtitle">Use '/' as a path separator to create folders</div>
            </div>
          </div>
          <button class="new-branch-close-btn" @click="handleCancel">✕</button>
        </div>

        <!-- Body -->
        <div class="new-branch-dialog-body">
          <div v-if="loading" class="new-branch-loading">
            Loading branch information…
          </div>
          <template v-else>
            <!-- Base branch (read-only) -->
            <div class="new-branch-field">
              <label class="new-branch-label">Create branch at:</label>
              <div class="new-branch-readonly-field">
                <svg class="new-branch-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15"></line>
                  <circle cx="18" cy="6" r="3"></circle>
                  <circle cx="6" cy="18" r="3"></circle>
                  <path d="M18 9a9 9 0 0 1-9 9"></path>
                </svg>
                <span class="new-branch-branch-name">{{ currentBranch }}</span>
              </div>
            </div>

            <!-- Branch name input -->
            <div class="new-branch-field">
              <label class="new-branch-label">Branch name:</label>
              <div class="new-branch-input-wrapper">
                <svg class="new-branch-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15"></line>
                  <circle cx="18" cy="6" r="3"></circle>
                  <circle cx="6" cy="18" r="3"></circle>
                  <path d="M18 9a9 9 0 0 1-9 9"></path>
                </svg>
                <input
                  v-model="branchName"
                  class="new-branch-input"
                  type="text"
                  placeholder="Enter branch name"
                  :disabled="creating"
                  @keydown.enter="handleCreate"
                />
              </div>
            </div>

            <!-- Options -->
            <div class="new-branch-options">
              <div class="new-branch-field">
                <label class="new-branch-checkbox-label">
                  <input
                    type="checkbox"
                    v-model="checkoutAfterCreate"
                    class="new-branch-checkbox"
                    :disabled="creating"
                  />
                  <span>Check out after create</span>
                </label>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="new-branch-dialog-footer">
          <button class="new-branch-btn new-branch-btn-secondary" @click="handleCancel">
            Cancel
          </button>
          <button
            class="new-branch-btn new-branch-btn-primary"
            :disabled="!canCreate"
            @click="handleCreate"
          >
            {{ creating ? 'Creating…' : 'Create' }}
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

.new-branch-loading {
  color: #999;
  font-style: italic;
  font-size: 12px;
  padding: 20px 0;
  text-align: center;
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

/* ── Read-only branch display ───────────────────────────────────────── */
.new-branch-readonly-field {
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

.new-branch-branch-name {
  font-weight: 600;
  color: #333;
  font-size: 13px;
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

/* ── Checkbox ────────────────────────────────────────────────────────── */
.new-branch-options {
  padding-top: 4px;
  border-top: 1px solid #eee;
}

.new-branch-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  padding: 4px 0;
}

.new-branch-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #007acc;
  cursor: pointer;
  flex-shrink: 0;
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
</style>
