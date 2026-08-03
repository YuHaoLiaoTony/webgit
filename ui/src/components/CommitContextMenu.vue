<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  commit: { type: Object, default: null },
  isHead: { type: Boolean, default: false },
  branchName: { type: String, default: '' },
})

const emit = defineEmits(['close', 'checkout', 'create-tag', 'reset'])

// ─── Reset dialog internal state ──────────────────────────────
const showResetDialog = ref(false)
const resetCommit = ref(null)

const resetModes = [
  { id: 'soft',  label: 'Soft',  desc: '僅移動 HEAD，保留所有變更在 staged',     icon: '🔹' },
  { id: 'mixed', label: 'Mixed', desc: '移動 HEAD，保留變更但 unstaged（預設）', icon: '🔸' },
  { id: 'hard',  label: 'Hard',  desc: '⚠ 移動 HEAD，丟棄所有變更',            icon: '🔴' },
]

// ─── Context menu handlers ────────────────────────────────────
function openResetDialog() {
  resetCommit.value = props.commit
  showResetDialog.value = true
  emit('close')
}

function closeResetDialog() {
  showResetDialog.value = false
  resetCommit.value = null
}

function doReset(mode) {
  emit('reset', resetCommit.value, mode)
  closeResetDialog()
}

// ─── Document click to close context menu ─────────────────────
function onDocumentClick(e) {
  if (!props.visible) return
  const menu = document.querySelector('.commit-context-menu')
  if (menu && !menu.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <!-- Context Menu -->
  <teleport to="body">
    <div
      v-if="visible"
      class="commit-context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <div class="context-menu-header">
        {{ branchName }}
      </div>
      <div class="context-menu-separator"></div>

      <!-- Checkout (for non-HEAD commits) -->
      <div
        v-if="!isHead"
        class="context-menu-item"
        @click="emit('checkout', commit)"
      >
        <span class="context-menu-icon">🔀</span>
        <span class="context-menu-title">
          Checkout <strong>{{ commit?.hash }}</strong>
        </span>
      </div>

      <!-- Create Tag (any commit) -->
      <div
        class="context-menu-item"
        @click="emit('create-tag', commit)"
      >
        <span class="context-menu-icon">🏷️</span>
        <span class="context-menu-title">
          Create Tag <strong>{{ commit?.hash }}</strong>
        </span>
      </div>

      <!-- Reset (not allowed on current HEAD) -->
      <div
        v-if="!isHead"
        class="context-menu-item"
        @click="openResetDialog"
      >
        <span class="context-menu-icon">↩</span>
        <span class="context-menu-title">
          Reset <strong>{{ branchName }}</strong> to Here
        </span>
      </div>
    </div>
  </teleport>

  <!-- Reset Type Dialog -->
  <teleport to="body">
    <div v-if="showResetDialog" class="reset-overlay" @click.self="closeResetDialog">
      <div class="reset-dialog">
        <div class="reset-dialog-header">
          Reset {{ branchName }} to
          <span class="reset-dialog-hash">{{ resetCommit?.hash }}</span>
        </div>
        <div class="reset-dialog-subject">{{ resetCommit?.subject }}</div>
        <div class="reset-dialog-body">
          <div
            v-for="rm in resetModes"
            :key="rm.id"
            class="reset-option"
            :class="{ danger: rm.id === 'hard' }"
            @click="doReset(rm.id)"
          >
            <span class="reset-option-icon">{{ rm.icon }}</span>
            <div class="reset-option-label">
              <span class="reset-option-title">{{ rm.label }}</span>
              <span class="reset-option-desc">{{ rm.desc }}</span>
            </div>
          </div>
        </div>
        <div class="reset-dialog-footer">
          <button class="reset-dialog-cancel" @click="closeResetDialog">Cancel</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style>
/* ─── Context Menu ─────────────────────────────────────────────── */
.commit-context-menu {
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  padding: 6px 0;
  min-width: 200px;
  font-size: 12px;
}

.context-menu-header {
  padding: 5px 14px 3px;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-menu-item {
  padding: 7px 14px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: background-color 0.1s;
}

.context-menu-item:hover {
  background-color: #f0f6fc;
}

.context-menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.context-menu-title {
  font-size: 12px;
  line-height: 1.3;
}

.context-menu-separator {
  height: 1px;
  background: #e8e8e8;
  margin: 4px 0;
}

/* ─── Reset Type Dialog ────────────────────────────────────────── */
.reset-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-dialog {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  min-width: 360px;
  max-width: 440px;
  overflow: hidden;
}

.reset-dialog-header {
  padding: 16px 20px 4px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.reset-dialog-hash {
  font-family: 'SF Mono', Consolas, monospace;
  color: #007acc;
}

.reset-dialog-subject {
  padding: 0 20px 12px;
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #eee;
}

.reset-dialog-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reset-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.reset-option:hover {
  background-color: #f0f6fc;
}

.reset-option.danger:hover {
  background-color: #fff0f0;
}

.reset-option-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.reset-option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reset-option-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.reset-option.danger .reset-option-title {
  color: #cb2431;
}

.reset-option-desc {
  font-size: 11px;
  color: #888;
  line-height: 1.3;
}

.reset-dialog-footer {
  padding: 10px 20px 16px;
  display: flex;
  justify-content: center;
}

.reset-dialog-cancel {
  padding: 6px 24px;
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-dialog-cancel:hover {
  background: #e8e8e8;
  border-color: #aaa;
}
</style>
