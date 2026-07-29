<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useStatusStore } from '../stores/status.js'
import DiffViewer from './DiffViewer.vue'

const statusStore = useStatusStore()

// ─── Mock data ──────────────────────────────────────────────────────────
const mockUnstaged = [
  { path: 'README.md', status: 'modified', additions: 2, deletions: 2 },
  { path: 'src/compiler/scanner.ts', status: 'modified', additions: 3, deletions: 1 },
  { path: 'src/experimental/newFeature.ts', status: 'added', additions: 8, deletions: 0 },
  { path: 'src/legacy/deprecated.ts', status: 'deleted', additions: 0, deletions: 45 },
  { path: 'src/loc/lcl/deu/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'added', additions: 92, deletions: 0 },
  { path: 'src/loc/lcl/fra/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'modified', additions: 89, deletions: 12 },
  { path: 'src/loc/lcl/ita/diagnosticMessages/diagnosticMessages.generated.json.lcl', status: 'modified', additions: 65, deletions: 15 },
  { path: 'src/shared/helpers.ts', status: 'renamed', additions: 5, deletions: 0 },
]

const mockStaged = [
  { path: 'src/compiler/checker.ts', status: 'modified', additions: 12, deletions: 4 },
  { path: 'src/compiler/newModule.ts', status: 'added', additions: 89, deletions: 0 },
  { path: 'src/services/completions.ts', status: 'modified', additions: 5, deletions: 1 },
]

// Combine for badge count
const allMockFiles = computed(() => [...mockUnstaged, ...mockStaged])

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

    // Sort and add dirs
    const sortedDirs = [...childDirs].sort()
    for (const d of sortedDirs) {
      if (!addedDirs.has(d)) {
        addedDirs.add(d)
        items.push({ type: 'dir', path: d, depth, name: d.split('/').pop() + '/' })
      }
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
const unstagedFlatItems = computed(() => buildFlatTree(mockUnstaged))
const stagedFlatItems = computed(() => buildFlatTree(mockStaged))

const selectedFile = ref(null)
const checkedFiles = reactive(new Set())
const collapsedDirs = reactive(new Set())

function toggleDir(dirPath) {
  if (collapsedDirs.has(dirPath)) {
    collapsedDirs.delete(dirPath)
  } else {
    collapsedDirs.add(dirPath)
  }
}

function isDirOpen(dirPath) {
  return !collapsedDirs.has(dirPath)
}

function isDirCollapsed(dirPath) {
  // Check if any file/dir under this path exists but is collapsed
  return collapsedDirs.has(dirPath)
}

function shouldShowItem(item, items) {
  if (item.type === 'file' || item.type === 'dir') {
    // Walk up path segments to check if any parent is collapsed
    const parts = item.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      const parentPath = parts.slice(0, i).join('/')
      if (collapsedDirs.has(parentPath)) return false
    }
    return true
  }
  return true
}

const visibleUnstagedItems = computed(() => unstagedFlatItems.value.filter(item => shouldShowItem(item)))
const visibleStagedItems = computed(() => stagedFlatItems.value.filter(item => shouldShowItem(item)))

// ─── File selection ────────────────────────────────────────────────────
function selectFile(file) {
  selectedFile.value = file
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
  const files = [...checkedFiles].filter(p =>
    mockUnstaged.some(f => f.path === p)
  )
  if (files.length > 0) {
    statusStore.stageFiles(files)
  }
}

function unstageSelected() {
  const files = [...checkedFiles].filter(p =>
    mockStaged.some(f => f.path === p)
  )
  if (files.length > 0) {
    statusStore.unstageFiles(files)
  }
}

function stageAll() {
  const paths = mockUnstaged.map(f => f.path)
  statusStore.stageFiles(paths)
}

function commitChanges() {
  // Placeholder
}

// ─── Vertical resizer (unstaged / staged) ──────────────────────────────
const unstagedRef = ref(null)
const cvResizerRef = ref(null)
let isDraggingCV = false
let cvStartY = 0
let cvUnstagedHeight = 0

function onCVResizerMouseDown(e) {
  isDraggingCV = true
  cvStartY = e.clientY
  if (unstagedRef.value) cvUnstagedHeight = unstagedRef.value.offsetHeight
  if (cvResizerRef.value) cvResizerRef.value.classList.add('dragging')
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
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
  if (isDraggingCV && unstagedRef.value) {
    const deltaY = e.clientY - cvStartY
    const newHeight = cvUnstagedHeight + deltaY
    const container = unstagedRef.value.parentElement
    if (container) {
      const maxH = container.offsetHeight - 66
      if (newHeight >= 60 && newHeight <= maxH) {
        unstagedRef.value.style.flex = 'none'
        unstagedRef.value.style.height = newHeight + 'px'
      }
    }
  }
  if (isDraggingH && filesPanelRef.value) {
    const deltaX = e.clientX - hStartX
    const newWidth = hStartWidth + deltaX
    if (newWidth >= 200 && newWidth <= 600) {
      filesPanelRef.value.style.width = newWidth + 'px'
    }
  }
}

function onGlobalMouseUp() {
  if (isDraggingCV) {
    isDraggingCV = false
    if (cvResizerRef.value) cvResizerRef.value.classList.remove('dragging')
  }
  if (isDraggingH) {
    isDraggingH = false
    if (hResizerRef.value) hResizerRef.value.classList.remove('dragging')
  }
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
})
</script>

<template>
  <div class="changes-view">
    <!-- Toolbar -->
    <div class="changes-view-toolbar">
      <span class="changes-view-title">📝 Uncommitted Changes</span>
      <span class="changes-view-badge">{{ allMockFiles.length }} files changed</span>
      <div class="changes-view-actions">
        <button class="changes-view-btn" @click="stageSelected">Stage</button>
        <button class="changes-view-btn" @click="unstageSelected">Unstage</button>
        <button class="changes-view-btn" @click="stageAll">Stage All</button>
        <button class="changes-view-btn primary" @click="commitChanges">Commit…</button>
      </div>
    </div>

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
            <span class="cv-group-count">{{ mockUnstaged.length }}</span>
            <span
              class="changes-view-btn"
              style="margin-left: auto; padding: 1px 8px; font-size: 10px;"
              @click.stop="stageAll"
            >Stage</span>
          </div>
          <div class="cv-group-body" style="flex: 1; overflow-y: auto;">
            <template v-for="item in visibleUnstagedItems" :key="item.path">
              <!-- Directory node -->
              <div v-if="item.type === 'dir'"
                class="changes-tree-item"
                :style="{ paddingLeft: (4 + item.depth * 16) + 'px' }"
                @click="toggleDir(item.path)"
              >
                <span
                  class="tree-toggle"
                  :class="{ expanded: isDirOpen(item.path) }"
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
              >
                <span class="tree-toggle" style="visibility:hidden">▶</span>
                <span :class="['cv-file-status', statusCssMap[item.status]]">
                  {{ statusLabelMap[item.status] }}
                </span>
                <span class="tree-icon tree-icon-file">📄</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.fileName }}</span>
                <span v-if="item.additions > 0 || item.deletions > 0" class="tree-file-stats">
                  <span v-if="item.additions > 0" class="add">+{{ item.additions }}</span>
                  <span v-if="item.deletions > 0" class="del">-{{ item.deletions }}</span>
                </span>
              </div>
            </template>
            <div v-if="visibleUnstagedItems.length === 0" style="padding: 12px; color: #aaa; font-style: italic; font-size: 11px;">
              No unstaged changes
            </div>
          </div>
        </div>

        <!-- Vertical Resizer between Unstaged / Staged -->
        <div
          class="resizer-h"
          ref="cvResizerRef"
          style="cursor: row-resize; flex-shrink: 0;"
          @mousedown="onCVResizerMouseDown"
        ></div>

        <!-- === Staged Changes === -->
        <div
          class="cv-group"
          id="group-staged"
          style="flex: none; min-height: 60px; display: flex; flex-direction: column; overflow: hidden;"
        >
          <div class="cv-group-header">
            <span>Staged Changes</span>
            <span class="cv-group-count">{{ mockStaged.length }}</span>
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
                :style="{ paddingLeft: (4 + item.depth * 16) + 'px' }"
                @click="toggleDir(item.path)"
              >
                <span
                  class="tree-toggle"
                  :class="{ expanded: isDirOpen(item.path) }"
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
              >
                <span class="tree-toggle" style="visibility:hidden">▶</span>
                <span :class="['cv-file-status', statusCssMap[item.status]]">
                  {{ statusLabelMap[item.status] }}
                </span>
                <span class="tree-icon tree-icon-file">📄</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.fileName }}</span>
                <span v-if="item.additions > 0 || item.deletions > 0" class="tree-file-stats">
                  <span v-if="item.additions > 0" class="add">+{{ item.additions }}</span>
                  <span v-if="item.deletions > 0" class="del">-{{ item.deletions }}</span>
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

      <!-- Right: Diff Panel -->
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
    </div>
  </div>
</template>
