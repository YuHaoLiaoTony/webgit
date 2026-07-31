<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useStatusStore } from '../stores/status.js'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import DiffViewer from './DiffViewer.vue'

const statusStore = useStatusStore()

// ─── Badge count ──────────────────────────────────────────────────────
const totalChanged = computed(() => statusStore.totalChanges)
const unstageCount = computed(() => statusStore.unstagedFiles.length)
const stageCount = computed(() => statusStore.stagedFiles.length)

// ─── Status label / style maps ─────────────────────────────────────────
const statusLabelMap = { added: 'C', modified: 'U', deleted: 'D', renamed: 'M', staged: 'A' }
const statusCssMap = { added: 'cv-status-added', modified: 'cv-status-modified', deleted: 'cv-status-deleted', renamed: 'cv-status-renamed', staged: 'cv-status-added' }
const statusActionLabel = { added: 'Created', modified: 'Updated', deleted: 'Deleted', renamed: 'Moved', staged: 'Added' }

// ─── Tree building ─────────────────────────────────────────────────────
function buildFlatTree(files) {
  // Collect all directory paths
  const dirSet = new Set()
  for (const f of files) {
    const parts = f.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      dirSet.add(parts.slice(0, i).join('/'))
    }
  }

  // Build a flat list from the root
  const items = []
  const addedDirs = new Set()

  function addDir(dirPath, depth) {
    if (addedDirs.has(dirPath)) return
    addedDirs.add(dirPath)
    items.push({ type: 'dir', path: dirPath, depth, name: dirPath.split('/').pop() + '/' })
    addChildren(dirPath, depth + 1)
  }

  function addChildren(parentPath, depth) {
    // Collect direct child dirs
    const childDirs = new Set()
    const childFiles = []
    for (const f of files) {
      const parts = f.path.split('/')
      const dir = parts.slice(0, -1).join('/')
      const fileName = parts[parts.length - 1]
      if (dir === parentPath || (!parentPath && parts.length === 1)) {
        // Direct child file
        childFiles.push(f)
      } else if (dir.startsWith(parentPath ? parentPath + '/' : '')) {
        // Check if this is a direct child dir
        const rel = dir.slice(parentPath ? parentPath.length + 1 : 0)
        const topDir = rel.split('/')[0]
        const fullDirPath = parentPath ? parentPath + '/' + topDir : topDir
        if (dirSet.has(fullDirPath)) {
          childDirs.add(fullDirPath)
        }
      }
    }
    // Also scan original files for direct dirs
    for (const f of files) {
      const parts = f.path.split('/')
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/')
        if (parentPath === '' || dirPath.startsWith(parentPath + '/')) {
          // Check if it's a direct child
          const rel = parentPath ? dirPath.slice(parentPath.length + 1) : dirPath
          if (rel.indexOf('/') === -1 && rel.length > 0) {
            childDirs.add(dirPath)
          }
        }
      }
    }

    // Remove parent itself
    childDirs.delete(parentPath)

    // Sort and add dirs (recursively via addDir)
    const sortedDirs = [...childDirs].sort()
    for (const d of sortedDirs) {
      addDir(d, depth)
    }

    // Sort and add files
    const sortedFiles = [...childFiles].sort((a, b) => a.fileName?.localeCompare(b.fileName) || a.path.localeCompare(b.path))
    for (const f of sortedFiles) {
      const fileName = f.path.split('/').pop()
      items.push({ type: 'file', ...f, fileName, depth })
    }
  }

  addChildren('', 0)
  return items
}

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

const unstagedFlatItems = computed(() => buildFlatTree(unstagedFiles.value))
const stagedFlatItems = computed(() => buildFlatTree(stagedFiles.value))

const selectedFile = ref(null)
const selectedDir = ref(null)
const checkedFiles = reactive(new Set())
const collapsedDirs = reactive({ unstaged: new Set(), staged: new Set() })

// ─── Commit dialog ────────────────────────────────────────────────────
const showCommitDialog = ref(false)
const commitMessage = ref('')
const committing = ref(false)
const commitError = ref(null)
const commitInputRef = ref(null)

// ─── Inline commit (below diff) ───────────────────────────────────────
const commitTitle = ref('')
const commitBody = ref('')
const inlineCommitting = ref(false)
const inlineCommitError = ref(null)

// ─── AI commit message generation ────────────────────────────────────
const aiGenerating = ref(false)
const aiPromptSaving = ref(false)
const customPrompt = ref('')
const showCustomPrompt = ref(false)

// Load the prompt saved in git config (webgit.aiprompt)
async function loadSavedPrompt() {
  const { get } = useApi()
  try {
    const config = await get('/config')
    if (config.aiPrompt) {
      customPrompt.value = config.aiPrompt
    }
  } catch (_) {
    // Config may be unavailable — ignore and keep the prompt empty
  }
}

// Save the current prompt to git config (empty → clear saved prompt)
async function savePrompt() {
  const { post } = useApi()
  const toast = useToast()
  aiPromptSaving.value = true
  try {
    await post('/config', { key: 'webgit.aiprompt', value: customPrompt.value.trim() })
    toast.showToast(customPrompt.value.trim() ? '提示詞已保存到 git config' : '提示詞已清除', 'success')
  } catch (e) {
    toast.showToast(`保存失敗：${e.message}`, 'error')
  } finally {
    aiPromptSaving.value = false
  }
}

async function generateAIMessage() {
  const { post } = useApi()
  const toast = useToast()

  if (stagedFiles.value.length === 0) {
    toast.showToast('No files staged', 'warning')
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
    toast.showToast('Commit message generated', 'success')
  } catch (e) {
    inlineCommitError.value = e.message
    toast.showToast('AI generation failed', 'error')
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

function openDiscardConfirm() {
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

function toggleDir(dirPath, group) {
  const set = collapsedDirs[group]
  if (set.has(dirPath)) {
    set.delete(dirPath)
  } else {
    set.add(dirPath)
  }
  selectedDir.value = dirPath
  selectedFile.value = null
}

function isDirOpen(dirPath, group) {
  return !collapsedDirs[group].has(dirPath)
}

function isDirCollapsed(dirPath, group) {
  return collapsedDirs[group].has(dirPath)
}

function shouldShowItem(item, group) {
  if (item.type === 'file' || item.type === 'dir') {
    const set = collapsedDirs[group]
    const parts = item.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/')
      if (set.has(parentPath)) return false
    }
    return true
  }
  return true
}

const visibleUnstagedItems = computed(() => unstagedFlatItems.value.filter(item => shouldShowItem(item, 'unstaged')))
const visibleStagedItems = computed(() => stagedFlatItems.value.filter(item => shouldShowItem(item, 'staged')))

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

// ─── Helper: collect all file paths under a dir ────────────────────────
function getFilesUnderDir(files, dirPath) {
  return files
    .filter(f => f.path === dirPath || f.path.startsWith(dirPath + '/'))
    .map(f => f.path)
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

// ─── Vertical resizer (staged panel) via staged header drag ────────────
const stagedRef = ref(null)
const stagedHeaderRef = ref(null)
let isDraggingCV = false
let cvStartY = 0
let cvStagedHeight = 0

function onCVResizerMouseDown(e) {
  isDraggingCV = true
  cvStartY = e.clientY
  if (stagedRef.value) cvStagedHeight = stagedRef.value.offsetHeight
  if (stagedHeaderRef.value) stagedHeaderRef.value.classList.add('dragging')
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

// ─── Commit panel drag resizer ────────────────────────────────────────
const commitPanelRef = ref(null)
const commitHeaderRef = ref(null)
let isDraggingCommit = false
let commitDragStartY = 0
let commitStartHeight = 0

function onCommitResizerMouseDown(e) {
  isDraggingCommit = true
  commitDragStartY = e.clientY
  if (commitPanelRef.value) commitStartHeight = commitPanelRef.value.offsetHeight
  if (commitHeaderRef.value) commitHeaderRef.value.classList.add('dragging')
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

// ─── Horizontal resizer (files / diff) ────────────────────────────────
const filesPanelRef = ref(null)
const hResizerRef = ref(null)
let isDraggingH = false
let hStartX = 0
let hStartWidth = 0

function onHResizerMouseDown(e) {
  isDraggingH = true
  hStartX = e.clientX
  if (filesPanelRef.value) hStartWidth = filesPanelRef.value.offsetWidth
  if (hResizerRef.value) hResizerRef.value.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onGlobalMouseMove(e) {
  if (isDraggingCV && stagedRef.value) {
    // deltaY = cvStartY - e.clientY: drag UP → positive → staged grows
    const deltaY = cvStartY - e.clientY
    const newHeight = cvStagedHeight + deltaY
    if (newHeight >= 60) {
      stagedRef.value.style.flex = 'none'
      stagedRef.value.style.height = newHeight + 'px'
    }
  }
  if (isDraggingH && filesPanelRef.value) {
    const deltaX = e.clientX - hStartX
    const newWidth = hStartWidth + deltaX
    if (newWidth >= 200 && newWidth <= 600) {
      filesPanelRef.value.style.width = newWidth + 'px'
    }
  }
  if (isDraggingCommit && commitPanelRef.value) {
    // deltaY = commitDragStartY - e.clientY: drag UP → positive → commit panel grows
    const deltaY = commitDragStartY - e.clientY
    const newHeight = commitStartHeight + deltaY
    if (newHeight >= 80) {
      commitPanelRef.value.style.flex = 'none'
      commitPanelRef.value.style.height = newHeight + 'px'
    }
  }
}

function onGlobalMouseUp() {
  if (isDraggingCV) {
    isDraggingCV = false
    if (stagedHeaderRef.value) stagedHeaderRef.value.classList.remove('dragging')
  }
  if (isDraggingH) {
    isDraggingH = false
    if (hResizerRef.value) hResizerRef.value.classList.remove('dragging')
  }
  if (isDraggingCommit) {
    isDraggingCommit = false
    if (commitHeaderRef.value) commitHeaderRef.value.classList.remove('dragging')
  }
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
  document.addEventListener('keydown', onKeydown)

  // Fetch status from the real API
  statusStore.fetchStatus()

  // Load the prompt saved in git config
  loadSavedPrompt()

  // Set staged panel to ~50% of files panel height by default
  nextTick(() => {
    if (filesPanelRef.value && stagedRef.value) {
      const panelHeight = filesPanelRef.value.offsetHeight
      const halfHeight = Math.max(Math.floor(panelHeight * 0.5), 60)
      stagedRef.value.style.flex = 'none'
      stagedRef.value.style.height = halfHeight + 'px'
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
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
        <div
          class="cv-group"
          id="group-unstaged"
          ref="unstagedRef"
          style="flex: 1; display: flex; flex-direction: column; min-height: 60px; overflow: hidden;"
        >
          <div class="cv-group-header">
            <span>Unstaged Changes</span>
            <span class="cv-group-count">{{ unstagedFiles.length }}</span>
            <span
              class="changes-view-btn"
              style="margin-left: auto; padding: 1px 8px; font-size: 10px;"
              @click.stop="stageSelected"
            >Stage</span>
          </div>
          <div class="cv-group-body" style="flex: 1; overflow-y: auto;">
            <template v-for="item in visibleUnstagedItems" :key="item.path">
              <!-- Directory node -->
              <div v-if="item.type === 'dir'"
                class="changes-tree-item"
                :class="{ 'dir-selected': selectedDir === item.path }"
                :style="{ paddingLeft: (4 + item.depth * 16) + 'px' }"
                @click="toggleDir(item.path, 'unstaged')"
              >
                <span
                  class="tree-toggle"
                  :class="{ expanded: isDirOpen(item.path, 'unstaged') }"
                >▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>{{ item.name }}</span>
              </div>
              <!-- File node -->
              <div v-else
                :class="[
                  'changes-tree-item',
                  'changes-file-item',
                  { selected: selectedFile?.path === item.path }
                ]"
                :style="{ paddingLeft: (4 + (item.depth || 0) * 16) + 'px' }"
                @click="selectFile(item)"
                @dblclick="onFileDblClick(item, 'unstaged')"
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
            <div v-if="visibleUnstagedItems.length === 0" style="padding: 12px; color: #aaa; font-style: italic; font-size: 11px;">
              No unstaged changes
            </div>
          </div>
        </div>

        <!-- === Staged Changes === -->
        <div
          class="cv-group"
          id="group-staged"
          ref="stagedRef"
          style="flex: none; min-height: 60px; display: flex; flex-direction: column; overflow: hidden;"
        >
          <div
            class="cv-group-header"
            ref="stagedHeaderRef"
            @mousedown="onCVResizerMouseDown"
          >
            <span>Staged Changes</span>
            <span class="cv-group-count">{{ stagedFiles.length }}</span>
            <span
              class="changes-view-btn"
              style="margin-left: auto; padding: 1px 8px; font-size: 10px;"
              @click.stop="unstageSelected"
            >Unstage</span>
          </div>
          <div class="cv-group-body" style="flex: 1; overflow-y: auto;">
            <template v-for="item in visibleStagedItems" :key="item.path">
              <!-- Directory node -->
              <div v-if="item.type === 'dir'"
                class="changes-tree-item"
                :class="{ 'dir-selected': selectedDir === item.path }"
                :style="{ paddingLeft: (4 + item.depth * 16) + 'px' }"
                @click="toggleDir(item.path, 'staged')"
              >
                <span
                  class="tree-toggle"
                  :class="{ expanded: isDirOpen(item.path, 'staged') }"
                >▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>{{ item.name }}</span>
              </div>
              <!-- File node -->
              <div v-else
                :class="[
                  'changes-tree-item',
                  'changes-file-item',
                  { selected: selectedFile?.path === item.path }
                ]"
                :style="{ paddingLeft: (4 + (item.depth || 0) * 16) + 'px' }"
                @click="selectFile(item)"
                @dblclick="onFileDblClick(item, 'staged')"
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
            <div v-if="visibleStagedItems.length === 0" style="padding: 12px; color: #aaa; font-style: italic; font-size: 11px;">
              No staged changes
            </div>
          </div>
        </div>
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
                :title="showCustomPrompt ? 'Hide custom prompt' : 'Add custom prompt'"
              >📝</button>
              <button
                class="cv-ai-prompt-btn"
                :disabled="aiPromptSaving"
                @click="savePrompt"
                title="保存提示詞到 git config（清空後保存＝清除已保存的提示詞）"
              >💾</button>
            </div>
            <div v-if="showCustomPrompt" class="cv-custom-prompt-wrap">
              <textarea
                v-model="customPrompt"
                class="cv-custom-prompt-input"
                placeholder="自訂提示詞（選填）：例如「請用繁體中文」、「重點放效能改善」…"
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

    <!-- Discard Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showDiscardConfirm" class="commit-overlay" @click.self="closeDiscardConfirm">
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
            <button class="changes-view-btn" @click="closeDiscardConfirm">Cancel</button>
            <button
              class="changes-view-btn danger"
              :disabled="discarding"
              @click="handleDiscard"
            >
              {{ discarding ? 'Discarding…' : 'Discard' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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

/* ── Danger button ────────────────────────────────────────────────── */
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

/* ── Selected directory highlight ──────────────────────────────────── */
.changes-tree-item.dir-selected {
  background-color: #e3f2fd;
  outline: 1px solid #90caf9;
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
