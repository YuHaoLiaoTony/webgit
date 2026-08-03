<script setup>
import { reactive } from 'vue'
import DiffViewer from './DiffViewer.vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({ files: 0, additions: 0, deletions: 0 }) },
  statusLabels: { type: Object, default: () => ({ modified: 'M', added: 'A', deleted: 'D', renamed: 'R' }) },
})

const expandedFilePaths = reactive(new Set())

function toggleFileDiff(path) {
  if (expandedFilePaths.has(path)) {
    expandedFilePaths.delete(path)
  } else {
    expandedFilePaths.add(path)
  }
}

function isFileExpanded(path) {
  return expandedFilePaths.has(path)
}
</script>

<template>
  <div class="tab-content-changes">
    <!-- Filter toolbar -->
    <div class="changes-toolbar">
      <span class="changes-filter active">All</span>
      <span class="changes-filter">Modified</span>
      <span class="changes-filter">Added</span>
      <span class="changes-filter">Deleted</span>
      <span class="changes-summary">
        {{ stats.files }} files, <span class="additions">+{{ stats.additions }}</span>
        <span class="deletions">-{{ stats.deletions }}</span>
      </span>
    </div>

    <!-- File list -->
    <div class="changes-file-list">
      <div
        v-for="file in files"
        :key="file.path"
        class="changes-file-item"
      >
        <div
          class="changes-file-header"
          @click="toggleFileDiff(file.path)"
        >
          <span
            :class="['file-status-badge', `file-status-${file.status}`]"
          >{{ statusLabels[file.status] || '?' }}</span>
          <span class="file-path">{{ file.path }}</span>
          <span class="file-diff-stats">
            <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
            <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
          </span>
          <span
            class="file-expand-icon"
            :class="{ expanded: isFileExpanded(file.path) }"
          >▶</span>
        </div>
        <div
          class="file-diff-content"
          :class="{ visible: isFileExpanded(file.path) }"
        >
          <DiffViewer
            :filePath="file.path"
            :fileStatus="file.status"
            :additions="file.additions"
            :deletions="file.deletions"
          />
        </div>
      </div>
    </div>

    <!-- Summary footer -->
    <div class="file-change-summary">
      <span>{{ stats.files }} files changed</span>
      <span class="additions">+{{ stats.additions }} additions</span>
      <span class="deletions">-{{ stats.deletions }} deletions</span>
    </div>
  </div>
</template>

<style scoped>
.tab-content-changes {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.changes-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  background-color: #fafafa;
}

.changes-filter {
  font-size: 10px;
  color: #888;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: all 0.15s;
}

.changes-filter:hover {
  color: #007acc;
  background-color: #f0f6fc;
}

.changes-filter.active {
  color: #007acc;
  font-weight: bold;
  background-color: #e8f0fe;
}

.changes-summary {
  margin-left: auto;
  font-size: 10px;
  color: #888;
}

.changes-summary .additions { color: #28a745; font-weight: bold; }
.changes-summary .deletions { color: #cb2431; font-weight: bold; }

.changes-file-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.changes-file-item {
  margin-bottom: 1px;
}

.changes-file-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
  transition: background-color 0.15s;
}

.changes-file-header:hover {
  background-color: #f6f8fa;
}

.changes-file-header .file-status-badge {
  width: 18px;
  height: 16px;
  font-size: 8px;
  flex-shrink: 0;
}

.changes-file-header .file-path {
  flex: 1;
  font-size: 11px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
}

.changes-file-header .file-diff-stats {
  display: flex;
  gap: 4px;
  font-size: 10px;
  flex-shrink: 0;
}

.file-diff-add { color: #28a745; }
.file-diff-del { color: #cb2431; }

.file-expand-icon {
  font-size: 7px;
  color: #999;
  flex-shrink: 0;
  transition: transform 0.15s;
}

.file-expand-icon.expanded {
  transform: rotate(90deg);
}

.file-diff-content {
  display: none;
  margin: 1px 0 4px 24px;
  border: 1px solid #e1e4e8;
  border-radius: 3px;
  background-color: #f8f9fa;
  overflow-x: auto;
}

.file-diff-content.visible {
  display: block;
}

/* Summary footer */
.file-change-summary {
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  font-size: 10px;
  color: #666;
  border-top: 1px solid #eee;
  flex-shrink: 0;
  background-color: #fafafa;
}

.file-change-summary .additions { color: #28a745; font-weight: bold; }
.file-change-summary .deletions { color: #cb2431; font-weight: bold; }
</style>
