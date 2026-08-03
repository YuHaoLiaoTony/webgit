<script setup>
import { ref } from 'vue'
import { useDragResize } from '../../composables/shared/useDragResize.js'
import FileTreeItem from './FileTreeItem.vue'

const props = defineProps({
  title: { type: String, required: true },
  files: { type: Array, default: () => [] },
  visibleItems: { type: Array, default: () => [] },
  group: { type: String, required: true }, // 'unstaged' | 'staged'
  selectedFile: { type: Object, default: null },
  selectedDir: { type: String, default: null },
  statusLabelMap: { type: Object, default: () => ({}) },
  statusCssMap: { type: Object, default: () => ({}) },
  isDirOpen: { type: Function, required: true },
  toggleDir: { type: Function, required: true },
  resizable: { type: Boolean, default: false },
  showContextMenu: { type: Boolean, default: false },
  emptyText: { type: String, default: 'No changes' },
  actionLabel: { type: String, default: '' },
})

const emit = defineEmits([
  'select-file',
  'dblclick-file',
  'contextmenu',
  'stage-selected',
  'unstage-selected',
])

const panelRef = ref(null)
const headerRef = ref(null)

// Always call useDragResize; the returned onMouseDown will be bound
// conditionally in the template only when resizable is true.
const { onMouseDown: onResizerMouseDown } = useDragResize({
  direction: 'vertical',
  targetRef: panelRef,
  handleRef: headerRef,
  minSize: 60,
})

defineExpose({ panelRef, headerRef })

function onHeaderContextMenu(e) {
  if (props.showContextMenu) {
    emit('contextmenu', e, { type: 'header', path: '' })
  }
}

function onActionClick(e) {
  e.stopPropagation()
  if (props.group === 'unstaged') {
    emit('stage-selected')
  } else {
    emit('unstage-selected')
  }
}

function onItemClick(item) {
  if (item.type === 'dir') {
    props.toggleDir(item.path, props.group)
  } else {
    emit('select-file', item)
  }
}

function onItemDblClick(item) {
  if (item.type === 'file') {
    emit('dblclick-file', item, props.group)
  }
}

function onItemContextMenu(event, target) {
  if (props.showContextMenu) {
    emit('contextmenu', event, target)
  }
}
</script>

<template>
  <div
    class="cv-group"
    :id="'group-' + group"
    ref="panelRef"
    :style="{
      flex: resizable ? 'none' : '1',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '60px',
      overflow: 'hidden',
    }"
  >
    <div
      class="cv-group-header"
      ref="headerRef"
      @contextmenu.prevent="onHeaderContextMenu"
      @mousedown="resizable ? onResizerMouseDown($event) : undefined"
    >
      <span>{{ title }}</span>
      <span class="cv-group-count">{{ files.length }}</span>
      <span
        class="changes-view-btn"
        style="margin-left: auto; padding: 1px 8px; font-size: 10px;"
        @click.stop="onActionClick"
      >{{ actionLabel }}</span>
    </div>
    <div class="cv-group-body" style="flex: 1; overflow-y: auto;">
      <template v-for="item in visibleItems" :key="item.path">
        <FileTreeItem
          :item="item"
          :depth="item.depth || 0"
          :selected="selectedFile?.path === item.path"
          :dirSelected="selectedDir === item.path"
          :statusLabelMap="statusLabelMap"
          :statusCssMap="statusCssMap"
          :isDirOpen="isDirOpen(item.path, group)"
          @click="onItemClick"
          @dblclick="onItemDblClick"
          @toggle-dir="(path) => toggleDir(path, group)"
          @contextmenu="onItemContextMenu"
        />
      </template>
      <div v-if="visibleItems.length === 0" style="padding: 12px; color: #aaa; font-style: italic; font-size: 11px;">
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>


