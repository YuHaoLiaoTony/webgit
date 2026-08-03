<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStatusStore } from '../stores/status.js'
import { useStatusMaps } from '../composables/changes/useStatusMaps.js'
import { useFileTree } from '../composables/changes/useFileTree.js'
import { useFileSelection } from '../composables/changes/useFileSelection.js'
import { useCommitDialog } from '../composables/changes/useCommitDialog.js'
import { useDiscard } from '../composables/changes/useDiscard.js'
import { useDragResize } from '../composables/shared/useDragResize.js'
import DiffViewer from './DiffViewer.vue'
import ContextMenu from './shared/ContextMenu.vue'
import FileTreePanel from './changes/FileTreePanel.vue'
import DiscardConfirmDialog from './changes/DiscardConfirmDialog.vue'
import InlineCommitPanel from './changes/InlineCommitPanel.vue'
import CommitDialog from './changes/CommitDialog.vue'

const statusStore = useStatusStore()

// ─── Badge count ──────────────────────────────────────────────────────
const stageCount = computed(() => statusStore.stagedFiles.length)

// ─── Status label / style maps ─────────────────────────────────────────
const { statusLabelMap, statusCssMap } = useStatusMaps()

// ─── Derived file lists ────────────────────────────────────────────────
const unstagedFiles = computed(() =>
  statusStore.unstagedFiles.map(f => ({ ...f, additions: 0, deletions: 0 }))
)
const stagedFiles = computed(() =>
  statusStore.stagedFiles.map(f => ({ ...f, additions: 0, deletions: 0 }))
)

// ─── Shared selection refs ─────────────────────────────────────────────
const selectedFile = ref(null)
const selectedDir = ref(null)

// ─── File tree (composable) ────────────────────────────────────────────
const {
  visibleUnstagedItems,
  visibleStagedItems,
  toggleDir,
  isDirOpen,
  getFilesUnderDir,
} = useFileTree(unstagedFiles, stagedFiles, selectedFile, selectedDir)

// ─── Commit dialog (composable) ───────────────────────────────────────
const {
  showCommitDialog,
  commitMessage,
  committing,
  commitError,
  openCommitDialog,
  closeCommitDialog,
  handleCommit,
  onKeydown: onCommitDialogKeydown,
} = useCommitDialog()

// ─── File selection (composable) ───────────────────────────────────────
const {
  checkedFiles,
  selectFile,
  onFileDblClick,
  stageSelected,
  unstageSelected,
  stageAll,
  commitChanges,
} = useFileSelection(selectedFile, selectedDir, getFilesUnderDir, openCommitDialog)

// ─── Discard (composable) ──────────────────────────────────────────────
const {
  showDiscardConfirm,
  discarding,
  getDiscardLabel,
  handleDiscardSelected,
  closeDiscardConfirm,
  handleDiscard,
} = useDiscard(checkedFiles, getFilesUnderDir)

// ─── Context menu ──────────────────────────────────────────────────────
const unstagedCtxMenu = ref({ visible: false, x: 0, y: 0, target: { type: 'header', path: '' } })

function showUnstagedCtxMenu(event, target = { type: 'header', path: '' }) {
  event.preventDefault()
  if (target.type === 'dir') {
    selectedDir.value = target.path
    selectedFile.value = null
  }
  unstagedCtxMenu.value = { visible: true, x: event.clientX, y: event.clientY, target }
}

function closeUnstagedCtxMenu() {
  unstagedCtxMenu.value.visible = false
}

const discardLabel = computed(() => getDiscardLabel(unstagedCtxMenu.value.target))

const contextMenuItems = computed(() => [
  {
    label: discardLabel.value,
    icon: '🗑️',
    shortcut: 'Delete',
    action: () => {
      handleDiscardSelected(unstagedCtxMenu.value.target)
      closeUnstagedCtxMenu()
    },
  },
])

// ─── Wrapped handlers ──────────────────────────────────────────────────
async function onDiscard() {
  selectedFile.value = null
  await handleDiscard()
}

// ─── Drag resize (horizontal resizer) ──────────────────────────────────
const filesPanelRef = ref(null)
const stagedPanelRef = ref(null)
const hResizerRef = ref(null)

const { onMouseDown: onHResizerMouseDown } = useDragResize({
  direction: 'horizontal',
  targetRef: filesPanelRef,
  handleRef: hResizerRef,
  minSize: 200,
  maxSize: 600,
})

// ─── Lifecycle ─────────────────────────────────────────────────────────
onMounted(() => {
  statusStore.fetchStatus()

  // Set staged panel to ~50% of files panel height by default
  nextTick(() => {
    if (filesPanelRef.value && stagedPanelRef.value?.panelRef) {
      const panelHeight = filesPanelRef.value.offsetHeight
      const halfHeight = Math.max(Math.floor(panelHeight * 0.5), 60)
      stagedPanelRef.value.panelRef.style.flex = 'none'
      stagedPanelRef.value.panelRef.style.height = halfHeight + 'px'
    }
  })
})
</script>

<template>
  <div class="changes-view">
    <div class="changes-view-body">
      <!-- Left: File Tree Panel -->
      <div class="changes-view-files" ref="filesPanelRef" style="display: flex; flex-direction: column;">
        <FileTreePanel
          title="Unstaged Changes"
          :files="unstagedFiles"
          :visibleItems="visibleUnstagedItems"
          group="unstaged"
          :selectedFile="selectedFile"
          :selectedDir="selectedDir"
          :statusLabelMap="statusLabelMap"
          :statusCssMap="statusCssMap"
          :isDirOpen="isDirOpen"
          :toggleDir="toggleDir"
          :showContextMenu="true"
          actionLabel="Stage"
          emptyText="No unstaged changes"
          @select-file="selectFile"
          @dblclick-file="onFileDblClick"
          @contextmenu="showUnstagedCtxMenu"
          @stage-selected="stageSelected"
        />

        <FileTreePanel
          ref="stagedPanelRef"
          title="Staged Changes"
          :files="stagedFiles"
          :visibleItems="visibleStagedItems"
          group="staged"
          :selectedFile="selectedFile"
          :selectedDir="selectedDir"
          :statusLabelMap="statusLabelMap"
          :statusCssMap="statusCssMap"
          :isDirOpen="isDirOpen"
          :toggleDir="toggleDir"
          :resizable="true"
          actionLabel="Unstage"
          emptyText="No staged changes"
          @select-file="selectFile"
          @dblclick-file="onFileDblClick"
          @unstage-selected="unstageSelected"
        />
      </div>

      <!-- Horizontal Resizer -->
      <div
        class="changes-resizer-h"
        ref="hResizerRef"
        @mousedown="onHResizerMouseDown"
      ></div>

      <!-- Right: Diff + Commit -->
      <div class="changes-view-right">
        <div class="changes-view-diff">
          <DiffViewer
            v-if="selectedFile"
            :filePath="selectedFile.path"
            :fileStatus="selectedFile.status"
            :additions="selectedFile.additions"
            :deletions="selectedFile.deletions"
          />
          <div v-else class="changes-view-diff-placeholder">
            ← Select a file to view its diff
          </div>
        </div>

        <InlineCommitPanel />
      </div>
    </div>

    <!-- Commit Dialog Modal -->
    <CommitDialog
      :visible="showCommitDialog"
      :stagedFiles="stagedFiles"
      :statusLabelMap="statusLabelMap"
      :statusCssMap="statusCssMap"
      :stageCount="stageCount"
      :commitMessage="commitMessage"
      :committing="committing"
      :commitError="commitError"
      @update:commitMessage="commitMessage = $event"
      @close="closeCommitDialog"
      @commit="handleCommit"
      @keydown="onCommitDialogKeydown"
    />

    <!-- Unstaged Header Context Menu -->
    <ContextMenu
      :visible="unstagedCtxMenu.visible"
      :x="unstagedCtxMenu.x"
      :y="unstagedCtxMenu.y"
      :items="contextMenuItems"
      @close="closeUnstagedCtxMenu"
    />

    <!-- Discard Confirmation Dialog -->
    <DiscardConfirmDialog
      :visible="showDiscardConfirm"
      :checkedFiles="checkedFiles"
      :discardLabel="discardLabel"
      :discarding="discarding"
      @confirm="onDiscard"
      @close="closeDiscardConfirm"
    />
  </div>
</template>

<style scoped>
/* ── Changes View Layout ──────────────────────────────────────────── */

.changes-view-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 100%;
}

.changes-view-files {
  min-width: 200px;
  max-width: 600px;
}

.changes-resizer-h {
  width: 6px;
  cursor: col-resize;
  background-color: #e8e8e8;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.changes-resizer-h:hover {
  background-color: #007acc;
}

.changes-view-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.changes-view-diff {
  flex: 1;
  overflow: auto;
  border: 1px solid #e1e4e8;
  border-radius: 4px 4px 0 0;
  background: #fff;
  min-height: 0;
}

.changes-view-diff-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #aaa;
  font-style: italic;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
