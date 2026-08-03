<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  stagedFiles: { type: Array, default: () => [] },
  statusLabelMap: { type: Object, default: () => ({}) },
  statusCssMap: { type: Object, default: () => ({}) },
  stageCount: { type: Number, default: 0 },
  commitMessage: { type: String, default: '' },
  committing: { type: Boolean, default: false },
  commitError: { type: [String, Object], default: null },
})

const emit = defineEmits([
  'update:commitMessage',
  'close',
  'commit',
  'keydown',
])

const inputRef = ref(null)

// Auto-focus the textarea when the dialog opens
watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => inputRef.value?.focus())
  }
})

function onCommit() {
  emit('commit')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="commit-overlay"
      @click.self="emit('close')"
      @keydown="emit('keydown', $event)"
    >
      <div class="commit-dialog">
        <div class="commit-dialog-header">
          <span>Commit Changes</span>
          <span class="commit-dialog-close" @click="emit('close')">×</span>
        </div>
        <div class="commit-dialog-body">
          <div class="commit-dialog-files">
            <div class="commit-files-title">{{ stageCount }} file(s) staged</div>
            <div v-for="f in stagedFiles" :key="f.path" class="commit-file-item">
              <span :class="['cv-file-status', statusCssMap[f.status]]">{{ statusLabelMap[f.status] }}</span>
              <span>{{ f.path }}</span>
            </div>
          </div>
          <textarea
            :value="commitMessage"
            class="commit-message-input"
            placeholder="Commit message…"
            rows="3"
            @input="emit('update:commitMessage', ($event.target).value)"
            @keydown.ctrl.enter="onCommit"
            @keydown.meta.enter="onCommit"
            ref="inputRef"
          ></textarea>
          <div v-if="commitError" class="commit-error">{{ commitError }}</div>
        </div>
        <div class="commit-dialog-footer">
          <button class="changes-view-btn" @click="emit('close')">Cancel</button>
          <button
            class="changes-view-btn primary"
            :disabled="committing || !commitMessage.trim()"
            @click="onCommit"
          >
            {{ committing ? 'Committing…' : 'Commit' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Commit Dialog ────────────────────────────────────────────────── */
.commit-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.commit-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.commit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-weight: bold;
  font-size: 13px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
}

.commit-dialog-close {
  font-size: 18px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.commit-dialog-close:hover {
  color: #333;
}

.commit-dialog-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
}

.commit-dialog-files {
  margin-bottom: 12px;
  max-height: 150px;
  overflow-y: auto;
}

.commit-files-title {
  font-size: 11px;
  font-weight: bold;
  color: #666;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.commit-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  font-size: 11px;
  font-family: "SF Mono", Consolas, monospace;
  color: #555;
}

.commit-message-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.4;
  resize: vertical;
  min-height: 64px;
  outline: none;
}

.commit-message-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.commit-error {
  margin-top: 8px;
  padding: 6px 10px;
  background-color: #fff0f0;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #cb2431;
  font-size: 11px;
}

.commit-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #e8e8e8;
  background-color: #fafafa;
}
</style>
