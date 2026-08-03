<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStatusStore } from '../stores/status.js'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useStatusMaps } from '../composables/changes/useStatusMaps.js'
import { useFileTree } from '../composables/changes/useFileTree.js'
import { useDragResize } from '../composables/shared/useDragResize.js'
import DiffViewer from './DiffViewer.vue'
import ContextMenu from './shared/ContextMenu.vue'
import FileTreePanel from './changes/FileTreePanel.vue'
import DiscardConfirmDialog from './changes/DiscardConfirmDialog.vue'

const statusStore = useStatusStore()

// ─── Badge count ──────────────────────────────────────────────────────
const totalChanged = computed(() => statusStore.totalChanges)
const unstageCount = computed(() => statusStore.unstagedFiles.length)
const stageCount = computed(() => statusStore.stagedFiles.length)

// ─── Status label / style maps ─────────────────────────────────────────
const { statusLabelMap, statusCssMap, statusActionLabel } = useStatusMaps()

// ─── State ─────────────────────────────────────────────────────────────
// Real data from the status store, not mock data
const unstagedFiles = computed(() => {
  const files = statusStore.unstagedFiles
  return files.map(f => ({ ...f, additions: 0, deletions: 0 }))
})
const stagedFiles = computed(() => {
  const files = statusStore.stagedFiles
  return files.map(f => ({ ...f, additions: 0, deletions: 0 }))
})

// Combine all files for the total badge
const allChangedFiles = computed(() => [
  ...unstagedFiles.value,
  ...stagedFiles.value,
])

const selectedFile = ref(null)
const checkedFiles = reactive(new Set())

// ─── File tree (composable) ────────────────────────────────────────────
const {
  selectedDir,
  unstagedFlatItems,
  stagedFlatItems,
  visibleUnstagedItems,
  visibleStagedItems,
  toggleDir,
  isDirOpen,
  isDirCollapsed,
  shouldShowItem,
  getFilesUnderDir,
} = useFileTree(unstagedFiles, stagedFiles, selectedFile)

// ─── Commit dialog ────────────────────────────────────────────────────
const showCommitDialog = ref(false)
const commitMessage = ref('')
const committing = ref(false)
const commitError = ref(null)
const commitInputRef = ref(null)

// ─── Context menu (Unstaged header) ────────────────────────────────
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

// ─── Context menu items (computed for ContextMenu component) ──────────
const contextMenuItems = computed(() => [
  {
    label: discardLabel.value,
    icon: '🗑️',
    shortcut: 'Delete',
    action: handleDiscardSelected,
  },
])

// ─── Inline commit (below diff) ───────────────────────────────────────
const commitTitle = ref('')
const commitBody = ref('')
const inlineCommitting = ref(false)
const inlineCommitError = ref(null)

// ─── AI commit message generation ────────────────────────────────────
const aiGenerating = ref(false)
const customPrompt = ref('')
const showCustomPrompt = ref(false)

// 載入啟用中 AI profile 的 prompt 預填（可臨時覆寫，不會儲存）
async function loadSavedPrompt() {
  const { get } = useApi()
  try {
    const data = await get('/ai/profiles')
    const active = (data.profiles || []).find(p => p.id === data.active)
    if (active?.prompt) {
      customPrompt.value = active.prompt
    }
  } catch (_) {
    // Config may be unavailable — ignore and keep the prompt empty
  }
}

async function generateAIMessage() {
  const { post } = useApi()
  const toast = useToast()

  if (stagedFiles.value.length === 0) {
    toast.showToast('warning', 'No files staged')
    return
  }

  inlineCommitError.value = null
  aiGenerating.value = true
  try {
    const result = await post('/ai-commit-generate', {
      stagedFiles: statusStore.stagedFiles,
      customPrompt: customPrompt.value.trim() || undefined,
    })
    commitTitle.value = result.title
    commitBody.value = result.body
    toast.showToast('success', 'Commit message generated')
  } catch (e) {
    inlineCommitError.value = e.message
    toast.showToast('error', 'AI generation failed')
  } finally {
    aiGenerating.value = false
  }
}

const isCommitDisabled = computed(() => inlineCommitting.value || !commitTitle.value.trim())

async function handleInlineCommit() {
  if (!commitTitle.value.trim()) return
  inlineCommitting.value = true
  inlineCommitError.value = null
  try {
    await statusStore.commit({ title: commitTitle.value.trim(), body: commitBody.value.trim() })
    commitTitle.value = ''
    commitBody.value = ''
  } catch (e) {
    inlineCommitError.value = e.message
  } finally {
    inlineCommitting.value = false
  }
}

async function handleCommit() {
  if (!commitMessage.value.trim()) {
    commitError.value = 'Commit message is required'
    return
  }
  committing.value = true
  commitError.value = null
  try {
    await statusStore.commit({ title: commitMessage.value.trim() })
    commitMessage.value = ''
    showCommitDialog.value = false
  } catch (e) {
    commitError.value = e.message
  } finally {
    committing.value = false
  }
}

function openCommitDialog() {
  if (statusStore.stagedFiles.length === 0) {
    // Could show a toast or other feedback
    return
  }
  showCommitDialog.value = true
  commitMessage.value = ''
  commitError.value = null
  nextTick(() => {
    commitInputRef.value?.focus()
  })
}

function closeCommitDialog() {
  showCommitDialog.value = false
  commitMessage.value = ''
  commitError.value = null
}

// ─── Discard ──────────────────────────────────────────────────────────
const showDiscardConfirm = ref(false)
const discarding = ref(false)

const discardLabel = computed(() => {
  const { target } = unstagedCtxMenu.value
  if (target.type === 'file') return `Discard ${target.path.split('/').pop()}`
  if (target.type === 'dir') return `Discard ${target.path.split('/').pop()}/`
  return 'Discard All Changes'
})

function openDiscardConfirm() {
  closeUnstagedCtxMenu()
  showDiscardConfirm.value = true
}

function handleDiscardSelected() {
  const { target } = unstagedCtxMenu.value
  if (target.type === 'header') {
    openDiscardConfirm()
    return
  }
  closeUnstagedCtxMenu()
  if (target.type === 'file') {
    checkedFiles.clear()
    checkedFiles.add(target.path)
  } else if (target.type === 'dir') {
    const filesUnder = getFilesUnderDir(unstagedFiles.value, target.path)
    checkedFiles.clear()
    for (const p of filesUnder) checkedFiles.add(p)
  }
  showDiscardConfirm.value = true
}

function closeDiscardConfirm() {
  showDiscardConfirm.value = false
}

async function handleDiscard() {
  discarding.value = true
  try {
    const files = [...checkedFiles]
    await statusStore.discardFiles(files.length > 0 ? files : undefined)
    checkedFiles.clear()
    selectedFile.value = null
    showDiscardConfirm.value = false
  } catch (e) {
    // error handled by store
  } finally {
    discarding.value = false
  }
}

// ─── Keyboard shortcut: Ctrl+Enter to commit ─────────────────────────
function onKeydown(e) {
  if (showCommitDialog.value && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleCommit()
  }
  if (e.key === 'Escape') {
    closeCommitDialog()
    closeDiscardConfirm()
  }
}

// Ctrl+Enter also triggers inline commit
function onDiffKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleInlineCommit()
  }
}



// ─── File selection ────────────────────────────────────────────────────
function selectFile(file) {
  selectedFile.value = file
  selectedDir.value = null
}

// ─── Double-click: stage/unstage single file ──────────────────────────
function onFileDblClick(file, group) {
  if (group === 'unstaged') {
    statusStore.stageFiles([file.path])
  } else if (group === 'staged') {
    statusStore.unstageFiles([file.path])
  }
}

// ─── Checkbox toggle ───────────────────────────────────────────────────
function toggleCheck(file) {
  const key = file.path
  if (checkedFiles.has(key)) {
    checkedFiles.delete(key)
  } else {
    checkedFiles.add(key)
  }
}

function isChecked(file) {
  return checkedFiles.has(file.path)
}

// ─── Actions ───────────────────────────────────────────────────────────
function stageSelected() {
  // Priority: checked files > selected file > selected directory > all unstaged
  const checked = [...checkedFiles].filter(p =>
    unstagedFiles.value.some(f => f.path === p)
  )
  if (checked.length > 0) {
    statusStore.stageFiles(checked)
  } else if (selectedFile.value && unstagedFiles.value.some(f => f.path === selectedFile.value.path)) {
    statusStore.stageFiles([selectedFile.value.path])
  } else if (selectedDir.value) {
    const paths = getFilesUnderDir(unstagedFiles.value, selectedDir.value)
    if (paths.length > 0) statusStore.stageFiles(paths)
  } else {
    const paths = unstagedFiles.value.map(f => f.path)
    if (paths.length > 0) statusStore.stageFiles(paths)
  }
}

function unstageSelected() {
  // Priority: checked files > selected file > selected directory > all staged
  const checked = [...checkedFiles].filter(p =>
    stagedFiles.value.some(f => f.path === p)
  )
  if (checked.length > 0) {
    statusStore.unstageFiles(checked)
  } else if (selectedFile.value && stagedFiles.value.some(f => f.path === selectedFile.value.path)) {
    statusStore.unstageFiles([selectedFile.value.path])
  } else if (selectedDir.value) {
    const paths = getFilesUnderDir(stagedFiles.value, selectedDir.value)
    if (paths.length > 0) statusStore.unstageFiles(paths)
  } else {
    const paths = stagedFiles.value.map(f => f.path)
    if (paths.length > 0) statusStore.unstageFiles(paths)
  }
}

function stageAll() {
  const paths = unstagedFiles.value.map(f => f.path)
  statusStore.stageFiles(paths)
}

function commitChanges() {
  openCommitDialog()
}

// ─── Drag resize (composables) ─────────────────────────────────────────
const stagedPanelRef = ref(null)
const commitPanelRef = ref(null)
const commitHeaderRef = ref(null)
const filesPanelRef = ref(null)
const hResizerRef = ref(null)

const { onMouseDown: onCommitResizerMouseDown } = useDragResize({
  direction: 'vertical',
  targetRef: commitPanelRef,
  handleRef: commitHeaderRef,
  minSize: 80,
})

const { onMouseDown: onHResizerMouseDown } = useDragResize({
  direction: 'horizontal',
  targetRef: filesPanelRef,
  handleRef: hResizerRef,
  minSize: 200,
  maxSize: 600,
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)

  // Fetch status from the real API
  statusStore.fetchStatus()

  // Load the prompt saved in git config
  loadSavedPrompt()

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

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="changes-view">
    <!-- Body: side-by-side -->
    <div class="changes-view-body">
      <!-- Left: File Tree Panel -->
      <div class="changes-view-files" ref="filesPanelRef" style="display: flex; flex-direction: column;">

        <!-- === Unstaged Changes === -->
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

        <!-- === Staged Changes === -->
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

        <!-- Inline Commit Panel (below diff) -->
        <div class="cv-inline-commit" ref="commitPanelRef" @keydown="onDiffKeydown">
          <div class="cv-inline-commit-header" ref="commitHeaderRef" @mousedown="onCommitResizerMouseDown">Commit</div>
          <div class="cv-inline-commit-body">
            <div class="cv-inline-commit-title-row">
              <input
                v-model="commitTitle"
                class="cv-inline-commit-title"
                type="text"
                placeholder="Commit title…"
              />
              <button
                class="cv-ai-btn"
                :disabled="aiGenerating"
                @click="generateAIMessage"
                :title="aiGenerating ? 'Generating…' : 'Generate commit message with AI'"
              >{{ aiGenerating ? '⏳' : '✨' }}</button>
              <button
                class="cv-ai-prompt-btn"
                @click="showCustomPrompt = !showCustomPrompt"
                :title="showCustomPrompt ? 'Hide custom prompt' : '臨時提示詞（預填啟用中 AI profile 的 prompt）'"
              >📝</button>
            </div>
            <div v-if="showCustomPrompt" class="cv-custom-prompt-wrap">
              <textarea
                v-model="customPrompt"
                class="cv-custom-prompt-input"
                placeholder="臨時提示詞（選填，覆寫啟用中 profile 的 prompt）：例如「請用繁體中文」…"
                rows="2"
              ></textarea>
            </div>
            <textarea
              v-model="commitBody"
              class="cv-inline-commit-body-input"
              placeholder="Optional description…"
            ></textarea>
            <div v-if="inlineCommitError" class="cv-inline-commit-error">{{ inlineCommitError }}</div>
          </div>
          <div class="cv-inline-commit-footer">
            <button
              class="cv-inline-commit-btn"
              :disabled="isCommitDisabled"
              @click="handleInlineCommit"
            >
              {{ inlineCommitting ? 'Committing…' : 'Commit' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Commit Dialog Modal -->
    <Teleport to="body">
      <div v-if="showCommitDialog" class="commit-overlay" @click.self="closeCommitDialog">
        <div class="commit-dialog">
          <div class="commit-dialog-header">
            <span>Commit Changes</span>
            <span class="commit-dialog-close" @click="closeCommitDialog">×</span>
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
              v-model="commitMessage"
              class="commit-message-input"
              placeholder="Commit message…"
              rows="3"
              @keydown.ctrl.enter="handleCommit"
              @keydown.meta.enter="handleCommit"
              ref="commitInputRef"
            ></textarea>
            <div v-if="commitError" class="commit-error">{{ commitError }}</div>
          </div>
          <div class="commit-dialog-footer">
            <button class="changes-view-btn" @click="closeCommitDialog">Cancel</button>
            <button
              class="changes-view-btn primary"
              :disabled="committing || !commitMessage.trim()"
              @click="handleCommit"
            >
              {{ committing ? 'Committing…' : 'Commit' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
      @confirm="handleDiscard"
      @close="closeDiscardConfirm"
    />
  </div>
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

/* ── Inline Commit Panel (below diff) ──────────────────────────────── */
.cv-inline-commit {
  border: 1px solid #e1e4e8;
  border-top: none;
  border-radius: 0 0 4px 4px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.cv-inline-commit-header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: bold;
  color: #333;
  background-color: #f0f2f4;
  border-bottom: 1px solid #e1e4e8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  cursor: row-resize;
  user-select: none;
}

.cv-inline-commit-header:hover,
.cv-inline-commit-header.dragging {
  background-color: #e8eaec;
}

.cv-inline-commit-body {
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.cv-inline-commit-title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.cv-inline-commit-title {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  outline: none;
  box-sizing: border-box;
}

.cv-inline-commit-title:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.cv-ai-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.15s;
}

.cv-ai-btn:hover:not(:disabled) {
  background-color: #e8eaec;
}

.cv-ai-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.cv-inline-commit-body-input {
  flex: 1;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.4;
  resize: none;
  min-height: 48px;
  outline: none;
  box-sizing: border-box;
}

.cv-inline-commit-body-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.cv-inline-commit-footer {
  display: flex;
  justify-content: flex-end;
  padding: 6px 10px 8px;
}

.cv-inline-commit-btn {
  padding: 5px 16px;
  background-color: #28a745;
  color: #fff;
  border: 1px solid #1e7e34;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.15s;
}

.cv-inline-commit-btn:hover:not(:disabled) {
  background-color: #218838;
}

.cv-inline-commit-btn:disabled {
  background-color: #94d3a2;
  border-color: #7fc08f;
  cursor: not-allowed;
}

.cv-inline-commit-error {
  padding: 4px 8px;
  background-color: #fff0f0;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #cb2431;
  font-size: 11px;
}

.cv-ai-prompt-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.cv-ai-prompt-btn:hover {
  background-color: #e8eaec;
}

.cv-ai-prompt-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cv-custom-prompt-wrap {
  padding: 4px 0;
}

.cv-custom-prompt-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px dashed #bbb;
  border-radius: 4px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.4;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.cv-custom-prompt-input:focus {
  border-color: #007acc;
  border-style: solid;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}


</style>
