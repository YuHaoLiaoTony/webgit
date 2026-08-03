<script setup>
import { showToast } from '../composables/useToast.js'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  commitDetail: { type: Object, default: null },
  authorInfo: { type: Object, default: null },
})

function copySHA() {
  if (!props.commitDetail) return
  navigator.clipboard.writeText(props.commitDetail.sha).then(() => {
    showToast('success', 'SHA copied to clipboard')
  }).catch(() => {
    showToast('error', 'Failed to copy SHA')
  })
}
</script>

<template>
  <!-- ── Commit Metadata (shared across all tabs) ── -->
  <div v-if="commitDetail" class="commit-metadata">
    <!-- Author Card -->
    <div class="metadata-author-area">
      <div class="author-card">
        <div
          class="avatar"
          :style="{ backgroundColor: authorInfo?.color || '#888' }"
        >
          {{ authorInfo?.initials || '?' }}
        </div>
        <div>
          <div class="meta-label">Author</div>
          <div class="author-name">
            {{ authorInfo?.name }}
            <span class="author-email">&lt;{{ authorInfo?.email }}&gt;</span>
          </div>
          <div class="meta-value">{{ commitDetail.date }}</div>
        </div>
      </div>
    </div>

    <!-- SHA -->
    <div class="sha-info">
      <span class="sha-label">SHA</span>
      <code class="sha-value" @click="copySHA" title="Click to copy SHA">
        {{ commitDetail.sha }}
      </code>
      <span class="sha-copy-hint">📋</span>
    </div>

    <!-- Commit Message -->
    <div class="commit-msg-title">{{ commitDetail.title }}</div>
    <div v-if="commitDetail.body" class="commit-msg-body">{{ commitDetail.body }}</div>
  </div>

  <!-- Empty state when no commit selected -->
  <div v-else class="metadata-empty">
    <EmptyState
      icon="🔍"
      title="No commit selected"
      message="Select a commit from the graph above to view its details."
    />
  </div>
</template>

<style scoped>
/* ── Commit Metadata ── */
.commit-metadata {
  padding: 10px 14px 6px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.metadata-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metadata-author-area {
  margin-bottom: 6px;
}

.author-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
  flex-shrink: 0;
}

.meta-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  font-weight: bold;
  letter-spacing: 0.3px;
}

.author-name {
  font-weight: 600;
  font-size: 12px;
  color: #333;
}

.author-email {
  font-weight: normal;
  color: #888;
  font-size: 11px;
}

.meta-value {
  font-size: 10px;
  color: #666;
}

.sha-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  cursor: pointer;
}

.sha-label {
  color: #888;
  font-size: 10px;
}

.sha-value {
  font-size: 11px;
  color: #007acc;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sha-value:hover {
  text-decoration: underline;
}

.sha-copy-hint {
  font-size: 11px;
  opacity: 0.5;
  flex-shrink: 0;
}

.commit-msg-title {
  font-weight: 600;
  font-size: 12px;
  color: #333;
  margin-bottom: 2px;
  line-height: 1.4;
}

.commit-msg-body {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.4;
}
</style>
