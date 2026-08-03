<script setup>
defineProps({
  item: { type: Object, required: true },
  // item: { type: 'dir' | 'file', path: string, name?: string, fileName?: string, depth: number, status?: string, additions?: number, deletions?: number }
  depth: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
  dirSelected: { type: Boolean, default: false },
  statusLabelMap: { type: Object, default: () => ({}) },
  statusCssMap: { type: Object, default: () => ({}) },
  isDirOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['click', 'dblclick', 'toggle-dir', 'contextmenu'])
</script>

<template>
  <!-- Directory node -->
  <div
    v-if="item.type === 'dir'"
    class="changes-tree-item"
    :class="{ 'dir-selected': dirSelected }"
    :style="{ paddingLeft: (4 + (item.depth || 0) * 16) + 'px' }"
    @click="emit('toggle-dir', item.path)"
    @contextmenu.prevent.stop="emit('contextmenu', $event, { type: 'dir', path: item.path })"
  >
    <span class="tree-toggle" :class="{ expanded: isDirOpen }">▶</span>
    <span class="tree-icon tree-icon-folder">📁</span>
    <span>{{ item.name }}</span>
  </div>

  <!-- File node -->
  <div
    v-else
    class="changes-tree-item changes-file-item"
    :class="{ selected }"
    :style="{ paddingLeft: (4 + (item.depth || 0) * 16) + 'px' }"
    @click="emit('click', item)"
    @dblclick="emit('dblclick', item)"
    @contextmenu.prevent.stop="emit('contextmenu', $event, { type: 'file', path: item.path })"
  >
    <span class="tree-toggle" style="visibility:hidden">▶</span>
    <span :class="['cv-file-status', statusCssMap[item.status]]">
      {{ statusLabelMap[item.status] }}
    </span>
    <span class="tree-icon tree-icon-file">📄</span>
    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.fileName }}</span>
    <span v-if="item.additions || item.deletions" class="tree-file-stats">
      <span v-if="item.additions" class="add">+{{ item.additions }}</span>
      <span v-if="item.deletions" class="del">-{{ item.deletions }}</span>
    </span>
  </div>
</template>

<style scoped>
/* ── Selected directory highlight ──────────────────────────────────── */
.changes-tree-item.dir-selected {
  background-color: #e3f2fd;
  outline: 1px solid #90caf9;
}
</style>
