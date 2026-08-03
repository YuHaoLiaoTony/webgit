<script setup>
import { computed } from 'vue'

const props = defineProps({
  node: { type: Object, required: true },
  collapsedFolders: { type: Set, required: true },
  depth: { type: Number, default: 0 },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['toggle-folder'])

const isOpen = computed(() => !props.collapsedFolders.has(props.node._path))
</script>

<template>
  <div class="tree-node">
    <!-- Root node (no _path): render children + files without folder wrapper -->
    <template v-if="!node._path">
      <TreeNode
        v-for="child in node.children"
        :key="child._path"
        :node="child"
        :collapsedFolders="collapsedFolders"
        :depth="depth"
        :searchQuery="searchQuery"
        @toggle-folder="path => $emit('toggle-folder', path)"
      />
      <div
        v-for="file in node.files"
        :key="file.path"
        class="ft-file"
        :style="{ paddingLeft: depth * 16 + 'px' }"
      >
        <span class="ft-file-icon">📄</span>
        <span class="ft-file-name">{{ file.name }}</span>
        <span class="file-diff-stats">
          <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
          <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
        </span>
      </div>
    </template>

    <!-- Folder node: show header + arrow + recursive children -->
    <div v-else class="ft-folder">
      <div
        class="ft-folder-header"
        @click="$emit('toggle-folder', node._path)"
        :style="{ paddingLeft: depth * 16 + 'px' }"
      >
        <span class="ft-folder-arrow">{{ isOpen ? '▼' : '▶' }}</span>
        <span class="ft-folder-icon">📁</span>
        <span class="ft-folder-name">{{ node.name }}/</span>
      </div>
      <div v-if="isOpen" class="ft-folder-children">
        <TreeNode
          v-for="child in node.children"
          :key="child._path"
          :node="child"
          :collapsedFolders="collapsedFolders"
          :depth="depth + 1"
          :searchQuery="searchQuery"
          @toggle-folder="path => $emit('toggle-folder', path)"
        />
        <div
          v-for="file in node.files"
          :key="file.path"
          class="ft-file"
          :style="{ paddingLeft: (depth + 1) * 16 + 'px' }"
        >
          <span class="ft-file-icon">📄</span>
          <span class="ft-file-name">{{ file.name }}</span>
          <span class="file-diff-stats">
            <span v-if="file.additions > 0" class="file-diff-add">+{{ file.additions }}</span>
            <span v-if="file.deletions > 0" class="file-diff-del">-{{ file.deletions }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ft-folder {
  user-select: none;
}

.ft-folder-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  cursor: pointer;
  color: #555;
  font-size: 11px;
  border-radius: 3px;
  transition: background-color 0.15s;
}

.ft-folder-header:hover {
  background-color: #f0f4f8;
}

.ft-folder-arrow {
  font-size: 8px;
  color: #999;
  width: 10px;
  text-align: center;
  flex-shrink: 0;
}

.ft-folder-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.ft-folder-name {
  font-size: 11px;
  color: #555;
}

.ft-folder-children {
  /* children inherit indentation from parent TreeNode */
}

.ft-file {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 20px;
  font-size: 11px;
  color: #333;
  cursor: default;
  border-radius: 2px;
}

.ft-file:hover {
  background-color: #f6f8fa;
}

.ft-file-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.ft-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
  font-size: 11px;
}

.file-diff-stats {
  display: flex;
  gap: 4px;
  font-size: 10px;
  flex-shrink: 0;
}

.file-diff-add {
  color: #28a745;
}

.file-diff-del {
  color: #cb2431;
}
</style>
