<script setup>
import { ref, computed, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  commit: { type: Object, default: null },  // target commit { hash, fullHash, subject }
})

const emit = defineEmits(['close', 'created'])

const api = useApi()

// ─── Data ──────────────────────────────────────────────────────────────
const tagName = ref('')
const tagMessage = ref('')
const creating = ref(false)

// ─── Computed: disable state for Create button ─────────────────────────
const canCreate = computed(() => {
  return tagName.value.trim().length > 0 && !creating.value
})

// ─── When dialog opens, reset form ─────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    tagName.value = ''
    tagMessage.value = ''
    creating.value = false
  }
})

// ─── Escape key to close ──────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape') {
    handleCancel()
  }
}

// ─── Create tag action ─────────────────────────────────────────────────
async function handleCreate() {
  if (!canCreate.value || !props.commit) return

  creating.value = true
  try {
    await api.post('/tags', {
      name: tagName.value.trim(),
      hash: props.commit.fullHash || props.commit.id,
      message: tagMessage.value.trim(),
    })

    showToast('success', `Tag "${tagName.value.trim()}" created`)
    emit('created')
    emit('close')
  } catch (e) {
    showToast('error', `Failed to create tag: ${e.message}`, 6000)
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
      class="new-tag-overlay"
      @click.self="handleCancel"
      @keydown="onKeydown"
    >
      <div class="new-tag-dialog">
        <!-- Header -->
        <div class="new-tag-dialog-header">
          <div class="new-tag-header-left">
            <span class="new-tag-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
            </span>
            <div class="new-tag-header-text">
              <div class="new-tag-title">Create Tag</div>
              <div class="new-tag-subtitle">Annotated tag on commit</div>
            </div>
          </div>
          <button class="new-tag-close-btn" @click="handleCancel">✕</button>
        </div>

        <!-- Body -->
        <div class="new-tag-dialog-body">
          <!-- Target commit (read-only) -->
          <div class="new-tag-field">
            <label class="new-tag-label">Tag commit</label>
            <div class="new-tag-readonly-field">
              <svg class="new-tag-field-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                <line x1="7" y1="7" x2="7.01" y2="7"></line>
              </svg>
              <div class="new-tag-commit-info">
                <span class="new-tag-commit-hash">{{ commit?.fullHash || commit?.id || '' }}</span>
                <span class="new-tag-commit-subject">{{ commit?.subject || '' }}</span>
              </div>
            </div>
          </div>

          <!-- Tag name input -->
          <div class="new-tag-field">
            <label class="new-tag-label">Tag name</label>
            <input
              v-model="tagName"
              class="new-tag-input"
              type="text"
              placeholder="e.g. v1.0.0"
              :disabled="creating"
              @keydown.enter="handleCreate"
            />
          </div>

          <!-- Message (annotated tag) -->
          <div class="new-tag-field">
            <label class="new-tag-label">
              Message
              <span class="new-tag-optional">optional</span>
            </label>
            <textarea
              v-model="tagMessage"
              class="new-tag-textarea"
              rows="4"
              placeholder="Tag message (e.g. Release notes)"
              :disabled="creating"
            ></textarea>
            <div class="new-tag-hint">
              Annotated tag stores the tagger name, date and message. Empty message falls back to the tag name.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="new-tag-dialog-footer">
          <button class="new-tag-btn new-tag-btn-secondary" @click="handleCancel">
            Cancel
          </button>
          <button
            class="new-tag-btn new-tag-btn-primary"
            :disabled="!canCreate"
            @click="handleCreate"
          >
            {{ creating ? 'Creating…' : 'Create Tag' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────── */
.new-tag-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ── Dialog Card ─────────────────────────────────────────────────────── */
.new-tag-dialog {
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
.new-tag-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e8e8e8;
}

.new-tag-header-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.new-tag-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d6a426, #b3861a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.new-tag-header-text {
  display: flex;
  flex-direction: column;
}

.new-tag-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
}

.new-tag-subtitle {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
  margin-top: 2px;
}

.new-tag-close-btn {
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

.new-tag-close-btn:hover {
  color: #333;
  background-color: #f0f0f0;
}

/* ── Body ────────────────────────────────────────────────────────────── */
.new-tag-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Fields ──────────────────────────────────────────────────────────── */
.new-tag-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.new-tag-label {
  font-size: 11px;
  font-weight: 600;
  color: #444;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.new-tag-optional {
  font-size: 10px;
  font-weight: 500;
  color: #aaa;
  text-transform: none;
  letter-spacing: 0;
}

/* ── Read-only commit display ───────────────────────────────────────── */
.new-tag-readonly-field {
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
}

.new-tag-commit-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.new-tag-commit-hash {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px;
  color: #007acc;
  font-weight: 600;
}

.new-tag-commit-subject {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Input ───────────────────────────────────────────────────────────── */
.new-tag-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #333;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.new-tag-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.new-tag-input::placeholder {
  color: #bbb;
}

/* ── Textarea ────────────────────────────────────────────────────────── */
.new-tag-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  color: #333;
  outline: none;
  resize: vertical;
  min-height: 72px;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.new-tag-textarea:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.new-tag-textarea::placeholder {
  color: #bbb;
}

.new-tag-hint {
  font-size: 11px;
  color: #999;
  line-height: 1.4;
}

/* ── Footer ──────────────────────────────────────────────────────────── */
.new-tag-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}

.new-tag-btn {
  padding: 7px 20px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
  border: 1px solid #ccc;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.new-tag-btn-secondary {
  background: #fff;
  color: #444;
}

.new-tag-btn-secondary:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.new-tag-btn-primary {
  background: #007acc;
  color: #fff;
  border-color: #005fa3;
}

.new-tag-btn-primary:hover:not(:disabled) {
  background: #005fa3;
}

.new-tag-btn-primary:disabled {
  background: #94c5e8;
  border-color: #7fb3d9;
  cursor: not-allowed;
}
</style>
