<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChangesView from './components/ChangesView.vue'
import { useUiStore } from './stores/ui.js'

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

// --- Details Tab ---
const activeDetailsTab = ref('changes')

function setDetailsTab(tab) {
  activeDetailsTab.value = tab
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
    <div class="toolbar-btn">
      <span class="toolbar-icon">⬇</span>
      <span class="toolbar-label">Pull</span>
    </div>
    <div class="toolbar-btn">
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
  <div class="tabs-bar">
    <div class="tab">
      <span>Fork*</span>
      <span style="font-size: 10px; color: #888;">⚙</span>
    </div>
    <div class="tab active">
      <span>TypeScript*</span>
    </div>
    <div class="tab-inactive">react*</div>
    <div class="tab-inactive">WpfOfficeTheme</div>
    <div style="margin-left: auto; padding-right: 10px; font-weight: bold; cursor: pointer; color: #666;">+</div>
  </div>

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
        <div v-else style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa; font-size: 14px; font-style: italic; user-select: none;">
          Content Area — Commit Graph (coming soon)
        </div>
      </div>

      <!-- Horizontal Splitter Bar for Details Panel -->
      <div
        class="resizer-h"
        ref="resizerHRef"
        id="resizerH"
        @mousedown="onResizerHMouseDown"
      ></div>

      <!-- Lower: Details Panel -->
      <div class="details-panel" ref="detailsPanelRef" id="detailsPanel">
        <div class="details-tabs">
          <div
            class="details-tab"
            :class="{ active: activeDetailsTab === 'changes' }"
            @click="setDetailsTab('changes')"
          >Changes</div>
          <div
            class="details-tab"
            :class="{ active: activeDetailsTab === 'filetree' }"
            @click="setDetailsTab('filetree')"
          >File Tree</div>
          <div
            class="details-tab"
            :class="{ active: activeDetailsTab === 'history' }"
            @click="setDetailsTab('history')"
          >History</div>
        </div>

        <!-- Changes Tab -->
        <div class="details-content" v-show="activeDetailsTab === 'changes'">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa; font-size: 13px; font-style: italic; user-select: none;">
            Changes Details — Placeholder
          </div>
        </div>

        <!-- File Tree Tab -->
        <div class="details-content" v-show="activeDetailsTab === 'filetree'">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa; font-size: 13px; font-style: italic; user-select: none;">
            File Tree — Placeholder
          </div>
        </div>

        <!-- History Tab -->
        <div class="details-content" v-show="activeDetailsTab === 'history'">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa; font-size: 13px; font-style: italic; user-select: none;">
            Commit History — Placeholder
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
