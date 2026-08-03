<script setup>
import { showToast } from '../composables/useToast.js'

const props = defineProps({
  commitDetail: { type: Object, default: null },
  authorInfo: { type: Object, default: null },
  commitRefs: { type: Object, default: () => ({ local: [], remote: [], tags: [] }) },
  parentCommits: { type: Array, default: () => [] },
})

const emit = defineEmits(['navigate-to-commit'])

function copySHA() {
  if (!props.commitDetail) return
  navigator.clipboard.writeText(props.commitDetail.sha).then(() => {
    showToast('success', 'SHA copied to clipboard')
  }).catch(() => {
    showToast('error', 'Failed to copy SHA')
  })
}

function selectParent(hash) {
  emit('navigate-to-commit', hash)
}
</script>

<template>
  <div class="tab-content-commit">
    <!-- AUTHOR -->
    <div class="commit-section">
      <div class="commit-section-header">
        <span class="section-icon">👤</span>
        <span class="section-title">AUTHOR</span>
      </div>
      <div class="commit-section-body">
        <div class="commit-author-row">
          <div
            class="commit-author-avatar"
            :style="{ backgroundColor: authorInfo?.color || '#888' }"
          >
            {{ authorInfo?.initials || '?' }}
          </div>
          <div class="commit-author-details">
            <div class="commit-author-name">{{ authorInfo?.name || 'Unknown' }}</div>
            <div class="commit-author-email">{{ authorInfo?.email || '' }}</div>
            <div class="commit-author-date">{{ commitDetail.date }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- REFS -->
    <div class="commit-section">
      <div class="commit-section-header">
        <span class="section-icon">🌿</span>
        <span class="section-title">REFS</span>
      </div>
      <div class="commit-section-body">
        <div v-if="commitRefs.local.length > 0 || commitRefs.remote.length > 0 || commitRefs.tags.length > 0" class="commit-refs-list">
          <span v-for="lb in commitRefs.local" :key="'l-' + lb" class="badge-branch-commit">✓ {{ lb }}</span>
          <span v-for="lb in commitRefs.remote" :key="'r-' + lb" class="badge-remote-commit">{{ lb }}</span>
          <span v-for="lb in commitRefs.tags" :key="'t-' + lb" class="badge-tag-commit">🏷 {{ lb }}</span>
        </div>
        <div v-else class="commit-refs-empty">No branch or tag references</div>
      </div>
    </div>

    <!-- SHA -->
    <div class="commit-section">
      <div class="commit-section-header">
        <span class="section-icon">🔑</span>
        <span class="section-title">SHA</span>
      </div>
      <div class="commit-section-body">
        <div class="commit-sha-row" @click="copySHA" title="Click to copy SHA">
          <code class="commit-sha-full">{{ commitDetail.sha }}</code>
          <span class="commit-sha-copy">📋</span>
        </div>
        <div class="commit-sha-short">{{ commitDetail.shortHash }}</div>
      </div>
    </div>

    <!-- PARENTS -->
    <div class="commit-section">
      <div class="commit-section-header">
        <span class="section-icon">🔗</span>
        <span class="section-title">PARENTS</span>
      </div>
      <div class="commit-section-body">
        <div v-if="parentCommits.length > 0" class="commit-parents-list">
          <div
            v-for="parent in parentCommits"
            :key="parent.hash"
            class="commit-parent-item"
            @click="selectParent(parent.hash)"
            title="Navigate to parent commit"
          >
            <span class="parent-index" v-if="parentCommits.length > 1">{{ parent.index + 1 }}.</span>
            <code class="parent-hash">{{ parent.hash }}</code>
            <span class="parent-short">{{ parent.shortHash }}</span>
            <span class="parent-nav-icon">↗</span>
          </div>
        </div>
        <div v-else class="commit-parents-empty">
          <span class="parent-root-icon">🌱</span> Root commit — no parents
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Commit Tab ── */
.tab-content-commit {
  padding: 10px 14px;
}

.commit-section {
  margin-bottom: 14px;
}

.commit-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
}

.section-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.section-title {
  font-size: 10px;
  font-weight: bold;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.commit-section-body {
  margin-left: 21px;
}

/* AUTHOR */
.commit-author-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.commit-author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.commit-author-details {
  flex: 1;
  min-width: 0;
}

.commit-author-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.commit-author-email {
  font-size: 11px;
  color: #888;
  word-break: break-all;
}

.commit-author-date {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

/* REFS */
.commit-refs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge-branch-commit {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background-color: #fff;
  border: 1px solid #4a90e2;
  color: #333;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
}

.badge-remote-commit {
  display: inline-flex;
  align-items: center;
  background-color: #f0f6fc;
  border: 1px solid #4a90e2;
  color: #4a90e2;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.badge-tag-commit {
  display: inline-flex;
  align-items: center;
  background-color: #fff2cc;
  border: 1px solid #d6b656;
  color: #333;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
}

.commit-refs-empty {
  font-size: 11px;
  color: #aaa;
  font-style: italic;
}

/* SHA */
.commit-sha-row {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.commit-sha-row:hover {
  background-color: #f0f6fc;
}

.commit-sha-full {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  color: #007acc;
  word-break: break-all;
  line-height: 1.4;
}

.commit-sha-copy {
  font-size: 11px;
  opacity: 0.4;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.commit-sha-row:hover .commit-sha-copy {
  opacity: 1;
}

.commit-sha-short {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 10px;
  color: #aaa;
  padding-left: 6px;
}

/* PARENTS */
.commit-parents-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.commit-parent-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.commit-parent-item:hover {
  background-color: #f0f6fc;
}

.parent-index {
  font-size: 10px;
  color: #888;
  font-weight: 600;
  min-width: 14px;
  flex-shrink: 0;
}

.parent-hash {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  color: #007acc;
  flex: 1;
  word-break: break-all;
  line-height: 1.4;
}

.parent-short {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 10px;
  color: #aaa;
  flex-shrink: 0;
}

.parent-nav-icon {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.commit-parent-item:hover .parent-nav-icon {
  opacity: 1;
}

.commit-parents-empty {
  font-size: 11px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
}

.parent-root-icon {
  font-size: 14px;
}
</style>
