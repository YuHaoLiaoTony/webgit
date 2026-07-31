<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialPath: { type: String, default: '' },
})

const emit = defineEmits(['close', 'select'])

// ── State ─────────────────────────────────────────────────────────────
const currentPath = ref('')
const parentPath = ref(null)
const homePath = ref('')
const drives = ref(null)
const dirs = ref([])
const loading = ref(false)
const error = ref('')
const showHidden = ref(false)
const filter = ref('')
const listEl = ref(null)
const pathInputEl = ref(null)

// ── Derived ───────────────────────────────────────────────────────────
const visibleDirs = computed(() => {
  let list = dirs.value
  if (!showHidden.value) {
    list = list.filter(d => !d.name.startsWith('.'))
  }
  const q = filter.value.trim().toLowerCase()
  if (q) {
    list = list.filter(d => d.name.toLowerCase().includes(q))
  }
  return list
})

// Breadcrumb segments (handles both POSIX '/' and Windows '\')
const crumbSegments = computed(() => {
  const p = currentPath.value
  if (!p) return []
  const sep = p.includes('\\') ? '\\' : '/'
  const parts = p.split(sep).filter(Boolean)
  let acc = p.startsWith(sep) ? sep : (p.match(/^[A-Za-z]:/)?.[0] || '')
  return parts.map(part => {
    const needsSep = acc !== '' && !acc.endsWith(sep)
    acc = acc + (needsSep ? sep : '') + part
    return { name: part, path: acc }
  })
})

// ── Navigation ────────────────────────────────────────────────────────
async function load(path) {
  loading.value = true
  error.value = ''
  filter.value = ''
  try {
    const url = path ? `/api/browse?path=${encodeURIComponent(path)}` : '/api/browse'
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `API error: ${res.status}`)
    }
    const data = await res.json()
    currentPath.value = data.currentPath
    parentPath.value = data.parentPath
    homePath.value = data.homePath
    drives.value = data.drives
    dirs.value = data.dirs
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function goUp() {
  if (parentPath.value) load(parentPath.value)
}

function goHome() {
  load(homePath.value || '')
}

function enterDir(dir) {
  load(dir.path)
}

function goToSegment(segment) {
  load(segment.path)
}

function selectCurrent() {
  if (currentPath.value) emit('select', currentPath.value)
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'Backspace') {
    e.preventDefault()
    goUp()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (e.target === pathInputEl.value) {
      const typed = pathInputEl.value.value.trim()
      if (typed) load(typed)
    } else {
      selectCurrent()
    }
  } else if (e.key === 'Home') {
    e.preventDefault()
    goHome()
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
watch(() => props.show, async (val) => {
  if (val) {
    await load(props.initialPath || '')
    await nextTick()
    listEl.value?.focus()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="picker-overlay" @click.self="emit('close')">
      <div
        class="picker-dialog"
        role="dialog"
        aria-label="Select Folder"
        tabindex="-1"
        @keydown="handleKeydown"
      >
        <!-- Header -->
        <div class="picker-header">
          <span>📂 Select Folder</span>
          <span class="picker-close" @click="emit('close')">×</span>
        </div>

        <!-- Toolbar: up / home / hidden toggle / filter -->
        <div class="picker-toolbar">
          <button
            class="picker-tool-btn"
            title="Go up (Backspace)"
            :disabled="!parentPath && !drives"
            @click="goUp"
          >⬆</button>
          <button
            class="picker-tool-btn"
            title="Home"
            :disabled="!homePath"
            @click="goHome"
          >🏠</button>
          <button
            class="picker-tool-btn"
            :class="{ active: showHidden }"
            title="Show hidden folders"
            @click="showHidden = !showHidden"
          >⚙</button>
          <input
            v-model="filter"
            class="picker-filter"
            type="text"
            placeholder="Filter folders…"
          />
          <span v-if="loading" class="picker-loading">Loading…</span>
        </div>

        <!-- Breadcrumb -->
        <div class="picker-crumbs">
          <span
            v-for="(seg, i) in crumbSegments"
            :key="seg.path"
            class="picker-crumb"
            @click="goToSegment(seg)"
          >
            <span v-if="i > 0" class="picker-crumb-sep">›</span>{{ seg.name }}
          </span>
        </div>

        <!-- Error -->
        <div v-if="error" class="picker-error">{{ error }}</div>

        <!-- Directory list -->
        <div
          ref="listEl"
          class="picker-list"
          tabindex="0"
          @keydown.enter.prevent="selectCurrent"
          @keydown.backspace.prevent="goUp"
          @keydown.escape="emit('close')"
        >
          <div
            v-for="dir in visibleDirs"
            :key="dir.path"
            class="picker-item"
            :class="{ 'is-repo': dir.isRepo }"
            @dblclick="enterDir(dir)"
            @click="enterDir(dir)"
          >
            <span class="picker-item-icon">📁</span>
            <span class="picker-item-name">{{ dir.name }}</span>
            <span v-if="dir.isRepo" class="picker-item-badge">git</span>
          </div>
          <div v-if="!loading && visibleDirs.length === 0" class="picker-empty">
            No subfolders here
          </div>
        </div>

        <!-- Footer: editable path + actions -->
        <div class="picker-footer">
          <input
            ref="pathInputEl"
            v-model="currentPath"
            class="picker-path-input"
            type="text"
            spellcheck="false"
            placeholder="/path/to/folder"
            @keydown.enter="handleKeydown"
          />
          <button class="picker-btn" @click="emit('close')">Cancel</button>
          <button
            class="picker-btn primary"
            :disabled="!currentPath"
            @click="selectCurrent"
          >Select</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.picker-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 560px;
  max-width: 92vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  outline: none;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-weight: bold;
  font-size: 13px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
}

.picker-close {
  font-size: 18px;
  color: #999;
  cursor: pointer;
  line-height: 1;
}

.picker-close:hover {
  color: #333;
}

.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.picker-tool-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-tool-btn:hover:not(:disabled) {
  background: #f0f6fc;
  border-color: #b3d4f7;
}

.picker-tool-btn.active {
  background: #e8f1fb;
  border-color: #007acc;
}

.picker-tool-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.picker-filter {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}

.picker-filter:focus {
  border-color: #007acc;
}

.picker-loading {
  font-size: 11px;
  color: #888;
}

.picker-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  color: #555;
  min-height: 30px;
}

.picker-crumb {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-crumb:hover {
  background: #f0f6fc;
  color: #007acc;
}

.picker-crumb-sep {
  color: #bbb;
  margin-right: 4px;
}

.picker-error {
  margin: 8px 12px 0;
  padding: 6px 10px;
  background-color: #fff0f0;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #cb2431;
  font-size: 11px;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  min-height: 160px;
  outline: none;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.picker-item:hover {
  background: #f0f6fc;
}

.picker-item-icon {
  font-size: 14px;
}

.picker-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-item-badge {
  font-size: 10px;
  font-weight: bold;
  color: #0a7d33;
  background: #e6f4ea;
  border: 1px solid #b7dfc0;
  border-radius: 3px;
  padding: 1px 6px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.picker-empty {
  padding: 24px;
  text-align: center;
  color: #aaa;
  font-size: 12px;
  font-style: italic;
}

.picker-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.picker-path-input {
  flex: 1;
  padding: 7px 9px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
}

.picker-path-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.picker-btn {
  padding: 7px 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  color: #333;
}

.picker-btn:hover:not(:disabled) {
  background: #f0f6fc;
}

.picker-btn.primary {
  background: #007acc;
  border-color: #007acc;
  color: #fff;
  font-weight: bold;
}

.picker-btn.primary:hover:not(:disabled) {
  background: #0069b3;
}

.picker-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
