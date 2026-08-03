<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUiStore } from '../stores/ui.js'
import { useStatusStore } from '../stores/status.js'
import { useReposStore } from '../stores/repos.js'
import { useApi } from '../composables/useApi.js'
import { useLongPress } from '../composables/useLongPress.js'
import AddRemoteDialog from './AddRemoteDialog.vue'
import { showToast } from '../composables/useToast.js'

const emit = defineEmits(['open-preferences'])

const uiStore = useUiStore()
const statusStore = useStatusStore()
const reposStore = useReposStore()

// Collapsible groups state
const collapsedGroups = ref({
  starred: false,
  branches: false,
  remotes: true,
  tags: true,
  stashes: true,
  submodules: true,
})

function toggleGroup(group) {
  collapsedGroups.value[group] = !collapsedGroups.value[group]
}

// Branch selection
const selectedBranch = ref('')

function selectBranch(name) {
  selectedBranch.value = name
}

async function switchToBranch(name) {
  try {
    const { post } = useApi()
    await post('/branches/checkout', { branch: name })
    // Refresh sidebar state
    selectedBranch.value = name
    await fetchBranches()
    await statusStore.fetchStatus()
    // Switch right side to All Commits and trigger reload
    uiStore.setView('commits')
    uiStore.triggerCommitRefresh()
  } catch (e) {
    showToast('error', e.message, 6000)
  }
}

// Real branches from API
const branchesData = ref({ local: [], remote: [], current: '' })
const loadingBranches = ref(true)

async function fetchBranches() {
  try {
    const { get } = useApi()
    const data = await get('/branches')
    branchesData.value = data
    selectedBranch.value = data.current
  } catch (e) {
    console.error('Failed to fetch branches:', e)
  } finally {
    loadingBranches.value = false
  }
}

// ─── Remotes ────────────────────────────────────────────────────────
// Spike 決策 (a)：Remotes 區塊顯示 /api/remotes 的設定 remote 名稱（📡），
// 點擊可展開顯示該 remote 的 remote-tracking branches（來自 /branches）。
const remotesData = ref([])
const loadingRemotes = ref(true)
const expandedRemote = ref('')

async function fetchRemotes() {
  try {
    const { get } = useApi()
    remotesData.value = await get('/remotes')
  } catch (e) {
    console.error('Failed to fetch remotes:', e)
  } finally {
    loadingRemotes.value = false
  }
}

function remoteBranches(name) {
  const prefix = `${name}/`
  return branchesData.remote.filter(rb => rb.startsWith(prefix))
}

function toggleRemoteExpand(name) {
  expandedRemote.value = expandedRemote.value === name ? '' : name
}

// ─── Remotes context menu（右鍵 / 長按）────────────────────────────
const remotesMenu = ref({ visible: false, x: 0, y: 0 })
let menuOpenedAt = 0

// 長按 ~500ms 觸發（位移超過閾值視為捲動，不觸發）
const lp = useLongPress(openRemotesMenu)

function openRemotesMenu(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault()
  const x = e.touches?.[0]?.clientX ?? e.clientX
  const y = e.touches?.[0]?.clientY ?? e.clientY
  remotesMenu.value = { visible: true, x: Math.min(x, window.innerWidth - 208), y }
  menuOpenedAt = Date.now()
}

function closeRemotesMenu() {
  remotesMenu.value.visible = false
}

function onDocumentClick(e) {
  if (!remotesMenu.value.visible) return
  const menu = document.querySelector('.remotes-context-menu')
  if (menu && !menu.contains(e.target)) {
    // 長按後瀏覽器合成的 click 會立刻冒泡到 document：300ms 內忽略，避免選單一開即關
    if (Date.now() - menuOpenedAt < 300) return
    closeRemotesMenu()
  }
}

// ─── Remotes 標題列 click（長按後的合成 click 需抑制）─────────────
function onRemotesTitleClick() {
  if (lp.consumeTriggered()) return
  toggleGroup('remotes')
}

function onRemoteItemClick(name) {
  if (lp.consumeTriggered()) return
  toggleRemoteExpand(name)
}

function onRemoteBranchClick(branch) {
  if (lp.consumeTriggered()) return
  switchToBranch(branch)
}

// ─── Add Remote Dialog ──────────────────────────────────────────────
const showAddRemoteDialog = ref(false)

function openAddRemoteDialog() {
  closeRemotesMenu()
  showAddRemoteDialog.value = true
}

function closeAddRemoteDialog() {
  showAddRemoteDialog.value = false
}

function onRemoteCreated() {
  // 新增成功 → 重新載入 remotes，列表立即更新
  fetchRemotes()
}

// ─── Stashes ────────────────────────────────────────────────────────
const stashes = ref([])
const loadingStashes = ref(true)
const expandedStashRefs = ref(new Set())

function toggleStashExpand(ref) {
  if (expandedStashRefs.value.has(ref)) {
    expandedStashRefs.value.delete(ref)
  } else {
    expandedStashRefs.value.add(ref)
  }
}

async function fetchStashes() {
  try {
    const { get } = useApi()
    const data = await get('/stashes')
    stashes.value = data
  } catch (e) {
    console.error('Failed to fetch stashes:', e)
  } finally {
    loadingStashes.value = false
  }
}

async function applyStash(ref) {
  try {
    const { post } = useApi()
    await post('/stash/apply', { ref })
    showToast('success', `Applied ${ref}`)
    await fetchStashes()
    await statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `Failed to apply stash: ${e.message}`, 6000)
  }
}

async function dropStash(ref) {
  try {
    const { post } = useApi()
    await post('/stash/drop', { ref })
    showToast('success', `Dropped ${ref}`)
    await fetchStashes()
    await statusStore.fetchStatus()
  } catch (e) {
    showToast('error', `Failed to drop stash: ${e.message}`, 6000)
  }
}

function getStashStatusIcon(status) {
  switch (status) {
    case 'added': return '➕'
    case 'deleted': return '➖'
    case 'renamed': return '✏️'
    default: return '📝'
  }
}

onMounted(() => {
  fetchBranches()
  fetchRemotes()
  fetchStashes()
  statusStore.fetchStatus()
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

// Re-fetch when active repo changes
watch(() => reposStore.activeRepoId, () => {
  if (reposStore.activeRepoId) {
    fetchBranches()
    fetchRemotes()
    fetchStashes()
    statusStore.fetchStatus()
  }
})
</script>

<template>
  <div class="sidebar-header">
    <span>{{ reposStore.displayName(reposStore.activeRepo) || 'Repository' }}</span>
    <span
      style="font-size: 10px; cursor: pointer;"
      title="Preferences"
      @click="emit('open-preferences')"
    >⚙</span>
  </div>

  <!-- Mode switch: Changes / All Commits -->
  <div
    class="sidebar-item"
    :class="{ selected: uiStore.currentView === 'changes' }"
    @click="uiStore.setView('changes')"
  >
    <span>📝</span> Changes ({{ statusStore.totalChanges }})
  </div>
  <div
    class="sidebar-item"
    :class="{ selected: uiStore.currentView === 'commits' }"
    @click="uiStore.setView('commits')"
  >
    <span>≡</span> All Commits
  </div>

  <!-- Search box -->
  <div class="sidebar-search">
    <span>🔍</span>
    <input type="text" placeholder="Filter">
  </div>

  <!-- Starred -->
  <div class="sidebar-group-title" @click="toggleGroup('starred')">
    <span>{{ collapsedGroups.starred ? '▸' : '▾' }} Starred</span>
  </div>
  <template v-if="!collapsedGroups.starred">
    <div
      v-if="branchesData.current"
      class="sidebar-item"
      :class="{ selected: selectedBranch === branchesData.current }"
      @click="switchToBranch(branchesData.current)"
    >
      <span>✓ {{ branchesData.current }}</span>
      <span style="margin-left: auto; color: #ffca28;">☆</span>
    </div>
  </template>

  <!-- Branches -->
  <div class="sidebar-group-title" @click="toggleGroup('branches')">
    <span>{{ collapsedGroups.branches ? '▸' : '▾' }} Branches</span>
  </div>
  <template v-if="!collapsedGroups.branches">
    <div v-if="loadingBranches" class="sidebar-item" style="color: #999; font-style: italic;">
      <span>Loading...</span>
    </div>
    <div
      v-for="branch in branchesData.local"
      :key="branch"
      class="sidebar-item"
      :class="{ selected: selectedBranch === branch }"
      @click="switchToBranch(branch)"
    >
      <span>{{ branch === branchesData.current ? '✓' : '🌿' }} {{ branch }}</span>
    </div>
    <div v-if="!loadingBranches && branchesData.local.length === 0" class="sidebar-item" style="color: #999;">
      <span>No branches</span>
    </div>
  </template>

  <!-- Remotes -->
  <div
    class="sidebar-group-title"
    @click="onRemotesTitleClick"
    @contextmenu.prevent="openRemotesMenu"
    @touchstart.passive="lp.onStart"
    @touchmove.passive="lp.onMove"
    @touchend="lp.onEnd"
    @touchcancel="lp.onEnd"
  >
    <span>{{ collapsedGroups.remotes ? '▸' : '▾' }} Remotes</span>
  </div>
  <template v-if="!collapsedGroups.remotes">
    <div
      class="sidebar-remotes-group"
      @contextmenu.prevent="openRemotesMenu"
      @touchstart.passive="lp.onStart"
      @touchmove.passive="lp.onMove"
      @touchend="lp.onEnd"
      @touchcancel="lp.onEnd"
    >
      <div v-if="loadingRemotes" class="sidebar-item" style="color: #999; font-style: italic;">
        <span>Loading...</span>
      </div>
      <div
        v-for="remote in remotesData"
        :key="remote.name"
        class="sidebar-item sidebar-remote-item"
        :class="{ 'remote-expanded': expandedRemote === remote.name }"
        @click="onRemoteItemClick(remote.name)"
        @contextmenu.prevent.stop="openRemotesMenu"
      >
        <span>{{ expandedRemote === remote.name ? '▾' : '▸' }} 📡 {{ remote.name }}</span>
      </div>
      <template v-if="expandedRemote">
        <div
          v-for="rb in remoteBranches(expandedRemote)"
          :key="rb"
          class="sidebar-item sidebar-remote-branch"
          @click="onRemoteBranchClick(rb)"
        >
          <span>🌿 {{ rb }}</span>
        </div>
        <div v-if="remoteBranches(expandedRemote).length === 0" class="sidebar-item" style="color: #999;">
          <span>No branches</span>
        </div>
      </template>
      <div v-if="!loadingRemotes && remotesData.length === 0" class="sidebar-item" style="color: #999;">
        <span>No remotes</span>
      </div>
    </div>
  </template>

  <!-- Tags -->
  <div class="sidebar-group-title" @click="toggleGroup('tags')">
    <span>{{ collapsedGroups.tags ? '▸' : '▾' }} Tags</span>
  </div>

  <!-- Stashes -->
  <div class="sidebar-group-title" @click="toggleGroup('stashes')">
    <span>{{ collapsedGroups.stashes ? '▸' : '▾' }} Stashes</span>
    <span v-if="stashes.length > 0" class="sidebar-group-count">{{ stashes.length }}</span>
  </div>
  <template v-if="!collapsedGroups.stashes">
    <div v-if="loadingStashes" class="sidebar-item" style="color: #999; font-style: italic;">
      <span>Loading...</span>
    </div>
    <div v-else-if="stashes.length === 0" class="sidebar-item" style="color: #999;">
      <span>No stashes</span>
    </div>
    <template v-else v-for="stash in stashes" :key="stash.ref">
      <div
        class="sidebar-item sidebar-stash-parent"
        :class="{ 'stash-expanded': expandedStashRefs.has(stash.ref) }"
        @click="toggleStashExpand(stash.ref)"
      >
        <span class="sidebar-stash-toggle">{{ expandedStashRefs.has(stash.ref) ? '▾' : '▸' }}</span>
        <span class="sidebar-stash-icon">📦</span>
        <span class="sidebar-stash-label" :title="stash.message">
          <span class="sidebar-stash-ref">{{ stash.ref }}</span>
          <span v-if="stash.branch" class="sidebar-stash-branch">({{ stash.branch }})</span>
          <span class="sidebar-stash-msg">{{ stash.message }}</span>
        </span>
        <span class="sidebar-stash-actions">
          <span class="stash-action-btn stash-apply-btn" title="Apply stash" @click.stop="applyStash(stash.ref)">✓</span>
          <span class="stash-action-btn stash-drop-btn" title="Drop stash" @click.stop="dropStash(stash.ref)">✕</span>
        </span>
      </div>
      <template v-if="expandedStashRefs.has(stash.ref)">
        <div v-if="stash.files.length === 0" class="sidebar-stash-file">
          <span style="color: #999;">(no files)</span>
        </div>
        <div
          v-for="file in stash.files"
          :key="file.path"
          class="sidebar-item sidebar-stash-file"
        >
          <span class="sidebar-stash-file-icon">{{ getStashStatusIcon(file.status) }}</span>
          <span class="sidebar-stash-file-path">{{ file.path }}</span>
        </div>
      </template>
    </template>
  </template>

  <!-- Submodules -->
  <div class="sidebar-group-title" @click="toggleGroup('submodules')">
    <span>{{ collapsedGroups.submodules ? '▸' : '▾' }} Submodules</span>
  </div>

  <!-- Remotes context menu（右鍵 / 長按） -->
  <div
    v-if="remotesMenu.visible"
    class="remotes-context-menu"
    :style="{ left: remotesMenu.x + 'px', top: remotesMenu.y + 'px' }"
    @click.stop="openAddRemoteDialog"
  >
    <div class="remotes-context-menu-item">
      <span class="remotes-context-menu-icon">➕</span>
      <span class="remotes-context-menu-title">Add New Remote</span>
    </div>
  </div>

  <!-- Add Remote Dialog -->
  <AddRemoteDialog
    :show="showAddRemoteDialog"
    @close="closeAddRemoteDialog"
    @created="onRemoteCreated"
  />
</template>

<style scoped>
/* ── Remotes 區塊（Spike (a)：顯示設定的 remote 名稱）───────────── */
.sidebar-remote-item.remote-expanded {
  background-color: #e0e8f5;
  font-weight: 600;
}

.sidebar-remote-branch {
  padding-left: 36px;
  font-size: 12px;
  color: #555;
}

/* ── Remotes context menu ───────────────────────────────────────── */
.remotes-context-menu {
  position: fixed;
  z-index: 99999;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  padding: 6px 0;
  min-width: 200px;
  font-size: 12px;
  /* 避免選單內的點擊被文字選取/拖曳吃掉（選單只有一個項目，點哪都算選取） */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.remotes-context-menu-item {
  padding: 7px 14px;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  transition: background-color 0.1s;
}

.remotes-context-menu-item:hover {
  background-color: #f0f6fc;
}

.remotes-context-menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}
</style>
