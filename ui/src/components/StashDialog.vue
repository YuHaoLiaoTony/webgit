<script setup>
import { ref, computed, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useStatusStore } from '../stores/status.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'stashed'])

const api = useApi()
const statusStore = useStatusStore()

// ─── Form model ────────────────────────────────────────────────────────
const stashMessage = ref('')
const includeUntracked = ref(false)
const stashing = ref(false)

// ─── Computed: disable state for Save Stash button ────────────────────
const canStash = computed(() => {
  return !stashing.value
})

// ─── Computed: check if there are any changes to stash ────────────────
const hasChanges = computed(() => {
  return statusStore.totalChanges > 0
})

// ─── When dialog opens, reset form ─────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    stashMessage.value = ''
    includeUntracked.value = false
    stashing.value = false
    // Fetch latest status to check for changes
    if (statusStore.isClean === undefined) {
      statusStore.fetchStatus()
    }
  }
})

// ─── Escape key to close ──────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// ─── Stash action ──────────────────────────────────────────────────────
async function handleStash() {
  if (!canStash.value) return

  stashing.value = true
  try {
    await api.post('/stash', {
      message: stashMessage.value.trim() || undefined,
      includeUntracked: includeUntracked.value,
    })

    showToast('success', 'Changes stashed successfully')
    emit('stashed')
    emit('close')
  } catch (e) {
    showToast('error', `Stash failed: ${e.message}`, 6000)
  } finally {
    stashing.value = false
  }
}

// ─── Cancel ────────────────────────────────────────────────────────────
function handleCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="stash-overlay" @click.self="handleCancel" @keydown="onKeydown">
      <div class="stash-dialog">
        <!-- Header -->
        <div class="stash-dialog-header">
          <div class="stash-header-left">
            <span class="stash-icon">📦</span>
            <div class="stash-header-text">
              <div class="stash-title">Save stash</div>
              <div class="stash-subtitle">Save your local changes to a new stash</div>
            </div>
          </div>
          <button class="stash-close-btn" @click="handleCancel">×</button>
        </div>

        <!-- Body -->
        <div class="stash-dialog-body">
          <!-- No changes warning -->
          <div v-if="!hasChanges && !statusStore.loading" class="stash-no-changes">
            <span class="stash-no-changes-icon">ℹ️</span>
            No local changes to stash
          </div>

          <!-- Message input -->
          <div class="stash-field">
            <label class="stash-label">Message</label>
            <input
              v-model="stashMessage"
              class="stash-input"
              type="text"
              placeholder="Stash message (optional)"
              :disabled="stashing"
            />
            <div class="stash-field-hint">A description for this stash entry (optional)</div>
          </div>

          <!-- Options -->
          <div class="stash-options">
            <div class="stash-field">
              <label class="stash-checkbox-label">
                <input type="checkbox" v-model="includeUntracked" class="stash-checkbox" :disabled="stashing" />
                <span>Stage new files</span>
              </label>
              <div class="stash-field-hint">By default stash ignores new files until you stage them</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="stash-dialog-footer">
          <button class="stash-btn stash-btn-secondary" @click="handleCancel">Cancel</button>
          <button
            class="stash-btn stash-btn-primary"
            :disabled="!canStash || (!hasChanges && !statusStore.loading)"
            @click="handleStash"
          >
            {{ stashing ? 'Saving…' : 'Save Stash' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.stash-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.stash-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 440px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────── */
.stash-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.stash-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stash-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f9a825, #f57f17);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stash-header-text {
  display: flex;
  flex-direction: column;
}

.stash-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.stash-subtitle {
  font-size: 11px;
  color: #888;
  line-height: 1.3;
  margin-top: 1px;
}

.stash-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.stash-close-btn:hover {
  color: #333;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.stash-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── No changes warning ──────────────────────────────────────────────── */
.stash-no-changes {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background-color: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  font-size: 12px;
  color: #795548;
}

.stash-no-changes-icon {
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Fields ──────────────────────────────────────────────────────────── */
.stash-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stash-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.stash-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #333;
  outline: none;
  box-sizing: border-box;
}

.stash-input:focus {
  border-color: #f9a825;
  box-shadow: 0 0 0 2px rgba(249, 168, 37, 0.15);
}

.stash-field-hint {
  font-size: 10px;
  color: #999;
  margin-top: 1px;
}

/* ── Checkboxes ──────────────────────────────────────────────────────── */
.stash-options {
  padding-top: 8px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stash-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.stash-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #f9a825;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.stash-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.stash-btn {
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.stash-btn-secondary {
  background: #fff;
  color: #444;
}

.stash-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.stash-btn-primary {
  background: #f9a825;
  color: #fff;
  border-color: #f57f17;
}

.stash-btn-primary:hover:not(:disabled) {
  background: #f57f17;
}

.stash-btn-primary:disabled {
  background: #f9d48a;
  border-color: #f0c060;
  cursor: not-allowed;
}
</style>
