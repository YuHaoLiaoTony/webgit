<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import TabsBar from './components/TabsBar.vue'
import ChangesView from './components/ChangesView.vue'
import CommitGraph from './components/CommitGraph.vue'
import DetailsPanel from './components/DetailsPanel.vue'
import ToastNotification from './components/ToastNotification.vue'
import PushDialog from './components/PushDialog.vue'
import PullDialog from './components/PullDialog.vue'
import { useUiStore } from './stores/ui.js'
import { useReposStore } from './stores/repos.js'
import { useStatusStore } from './stores/status.js'

const uiStore = useUiStore()
const reposStore = useReposStore()
const statusStore = useStatusStore()

// --- Resizer: Vertical (sidebar width) ---
const sidebarRef = ref(null)
const resizerVRef = ref(null)
let isDraggingV = false

function onResizerVMouseDown() {
  isDraggingV = true
  if (resizerVRef.value) resizerVRef.value.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// --- Resizer: Horizontal (details panel height) ---
const detailsPanelRef = ref(null)
const resizerHRef = ref(null)
let isDraggingH = false
let startY = 0
let startHeight = 0

function onResizerHMouseDown(e) {
  isDraggingH = true
  startY = e.clientY
  if (detailsPanelRef.value) startHeight = detailsPanelRef.value.offsetHeight
  if (resizerHRef.value) resizerHRef.value.classList.add('dragging')
  document.body.style.cursor = 'row-resize'
  document.body.style.userSelect = 'none'
}

// --- CommitGraph ref (to access selected commit) ---
const commitGraphRef = ref(null)

// Compute selected commit from CommitGraph
const selectedCommit = computed(() => {
  return commitGraphRef.value?.selectedCommit || null
})

// ─── Push Dialog ───────────────────────────────────────────────────────
const showPushDialog = ref(false)

function openPushDialog() {
  showPushDialog.value = true
}

function closePushDialog() {
  showPushDialog.value = false
}

function onPushed() {
  // Refresh status after push
  statusStore.fetchStatus()
}

// ─── Pull Dialog ───────────────────────────────────────────────────────
const showPullDialog = ref(false)

function openPullDialog() {
  showPullDialog.value = true
}

function closePullDialog() {
  showPullDialog.value = false
}

function onPulled() {
  // Refresh status after pull
  statusStore.fetchStatus()
}

// Navigate to a parent commit by hash
function handleNavigateToCommit(hash) {
  if (commitGraphRef.value?.selectCommitByHash) {
    commitGraphRef.value.selectCommitByHash(hash)
  }
}

// --- Global mouse handlers ---
function onMouseMove(e) {
  if (isDraggingV) {
    const newWidth = e.clientX
    if (newWidth >= 140 && newWidth <= 450 && sidebarRef.value) {
      sidebarRef.value.style.width = newWidth + 'px'
    }
  }

  if (isDraggingH) {
    const deltaY = startY - e.clientY
    const newHeight = startHeight + deltaY
    if (newHeight >= 80 && detailsPanelRef.value) {
      detailsPanelRef.value.style.height = newHeight + 'px'
    }
  }
}

function onMouseUp() {
  if (isDraggingV) {
    isDraggingV = false
    if (resizerVRef.value) resizerVRef.value.classList.remove('dragging')
  }
  if (isDraggingH) {
    isDraggingH = false
    if (resizerHRef.value) resizerHRef.value.classList.remove('dragging')
  }
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  reposStore.fetchRepos()
})

// Watch for active repo changes to refresh data
watch(() => reposStore.activeRepoId, () => {
  if (reposStore.activeRepoId) {
    statusStore.fetchStatus()
    uiStore.triggerCommitRefresh()
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <!-- Title Bar -->
  <div class="title-bar">
    <div class="menu-items">
      <span class="menu-item">File</span>
      <span class="menu-item">View</span>
      <span class="menu-item">Repository</span>
      <span class="menu-item">Window</span>
      <span class="menu-item">Help</span>
    </div>
    <div class="app-title">Fork</div>
    <div class="window-controls">
      <span>&#8210;</span>
      <span>&#9633;</span>
      <span>&#10005;</span>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-btn">
      <span class="toolbar-icon">⚡</span>
      <span class="toolbar-label">Quick Launch</span>
    </div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">⇣</span>
      <span class="toolbar-label">Fetch</span>
    </div>
    <div class="toolbar-btn" @click="openPullDialog">
      <span class="toolbar-icon">⬇</span>
      <span class="toolbar-label">Pull</span>
    </div>
    <div class="toolbar-btn" @click="openPushDialog">
      <span class="toolbar-icon">⬆</span>
      <span class="toolbar-label">Push</span>
    </div>
    <div class="toolbar-divider"></div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">📦</span>
      <span class="toolbar-label">Stash</span>
    </div>
    <div class="toolbar-divider"></div>
    <div style="flex: 1; text-align: center;">
      <div style="font-weight: bold; font-size: 13px;">TypeScript*</div>
      <div style="font-size: 10px; color: #666;">🌿 master</div>
    </div>
    <div class="toolbar-divider"></div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">+🌿</span>
      <span class="toolbar-label">New Branch</span>
    </div>
    <div class="toolbar-divider"></div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">↗</span>
      <span class="toolbar-label">Open in</span>
    </div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">&gt;_</span>
      <span class="toolbar-label">Console</span>
    </div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">🎨</span>
      <span class="toolbar-label">Appearance</span>
    </div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">💼</span>
      <span class="toolbar-label">Work</span>
    </div>
    <div class="toolbar-btn">
      <span class="toolbar-icon">💬</span>
      <span class="toolbar-label">Feedback</span>
    </div>
  </div>

  <!-- Repository Tabs Bar -->
  <TabsBar />

  <!-- Main Container -->
  <div class="main-container">
    <!-- Left Sidebar -->
    <div class="sidebar" ref="sidebarRef" id="sidebar">
      <Sidebar />
    </div>

    <!-- Vertical Splitter Bar for Sidebar -->
    <div
      class="resizer-v"
      ref="resizerVRef"
      id="resizerV"
      @mousedown="onResizerVMouseDown"
    ></div>

    <!-- Main Content Area -->
    <div class="content-area">
      <!-- Content Area: Conditional Views -->
      <div class="commit-list-container">
        <ChangesView v-if="uiStore.currentView === 'changes'" />
        <CommitGraph v-else-if="uiStore.currentView === 'commits'" ref="commitGraphRef" />
        <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa; font-size: 14px; font-style: italic; user-select: none;">
          Content Area — Coming Soon
        </div>
      </div>

      <!-- Horizontal Splitter Bar for Details Panel -->
      <div v-if="uiStore.currentView !== 'changes'"
        class="resizer-h"
        ref="resizerHRef"
        id="resizerH"
        @mousedown="onResizerHMouseDown"
      ></div>

      <!-- Lower: Details Panel -->
      <div v-if="uiStore.currentView !== 'changes'" class="details-panel" ref="detailsPanelRef" id="detailsPanel">
        <DetailsPanel
          :selectedCommit="selectedCommit"
          @navigate-to-commit="handleNavigateToCommit"
        />
      </div>
    </div>
  </div>

  <!-- Toast Notifications (teleported to body) -->
  <ToastNotification />

  <!-- Push Dialog -->
  <PushDialog
    :show="showPushDialog"
    @close="closePushDialog"
    @pushed="onPushed"
  />

  <!-- Pull Dialog -->
  <PullDialog
    :show="showPullDialog"
    @close="closePullDialog"
    @pulled="onPulled"
  />
</template>
