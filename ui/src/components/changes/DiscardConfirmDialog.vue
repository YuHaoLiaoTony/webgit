<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  checkedFiles: { type: Set, default: () => new Set() },
  discardLabel: { type: String, default: 'Discard Changes' },
  discarding: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="commit-overlay" @click.self="emit('close')">
      <div class="commit-dialog discard-dialog">
        <div class="commit-dialog-header">
          <span>⚠️ Discard Changes</span>
        </div>
        <div class="commit-dialog-body">
          <p style="margin: 0 0 8px; font-size: 13px; color: #333;">
            Are you sure you want to discard changes?
          </p>
          <p style="margin: 0; font-size: 11px; color: #cb2431;">
            This action is irreversible. Discarded changes cannot be recovered.
          </p>
          <div v-if="checkedFiles.size > 0" style="margin-top: 8px; font-size: 11px; color: #666;">
            Selected files ({{ checkedFiles.size }}):
            <div v-for="p in checkedFiles" :key="p" style="padding-left: 8px;">• {{ p }}</div>
          </div>
          <div v-else style="margin-top: 8px; font-size: 11px; color: #888;">
            All unstaged changes will be discarded.
          </div>
        </div>
        <div class="commit-dialog-footer">
          <button class="changes-view-btn" @click="emit('close')">Cancel</button>
          <button
            class="changes-view-btn danger"
            :disabled="discarding"
            @click="emit('confirm')"
          >
            {{ discarding ? 'Discarding…' : 'Discard' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Dialog overlay and container — reused from ChangesView commit dialog styles.
   Duplicated here so DiscardConfirmDialog is self-contained. */
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

.discard-dialog {
  width: 400px;
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

.commit-dialog-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
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

/* Danger button */
.changes-view-btn.danger {
  background-color: #cb2431;
  color: #fff;
  border-color: #b01e2b;
}

.changes-view-btn.danger:hover {
  background-color: #b01e2b;
}

.changes-view-btn.danger:disabled {
  background-color: #e8a0a5;
  cursor: not-allowed;
}
</style>
