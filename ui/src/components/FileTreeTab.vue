<script setup>
import { ref, computed, reactive } from 'vue'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  files: { type: Array, default: () => [] },
})

// ─── Search ──────────────────────────────────────────────────────────────
const fileTreeSearch = ref('')

// ─── Build tree ──────────────────────────────────────────────────────────
function buildTree(files) {
  const root = { name: '', children: [], files: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let node = root

    for (let i = 0; i < parts.length - 1; i++) {
      let child = node.children.find(c => c.name === parts[i])
      if (!child) {
        child = { name: parts[i], children: [], files: [], _path: parts.slice(0, i + 1).join('/') }
        node.children.push(child)
      }
      node = child
    }

    node.files.push({
      name: parts[parts.length - 1],
      path: file.path,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
    })
  }

  return root
}

const fileTree = computed(() => buildTree(props.files))

// ─── Filter ──────────────────────────────────────────────────────────────
function filterTree(node, query) {
  if (!query) return node

  const q = query.toLowerCase()
  const filteredChildren = node.children
    .map(c => filterTree(c, q))
    .filter(c => c.matched || c.children.length > 0 || c.files.length > 0)

  const filteredFiles = node.files.filter(f =>
    f.path.toLowerCase().includes(q)
  )

  const matched = node.name.toLowerCase().includes(q)

  return {
    ...node,
    children: filteredChildren,
    files: filteredFiles,
    matched: matched || filteredFiles.length > 0 || filteredChildren.length > 0,
  }
}

const filteredTree = computed(() => filterTree(fileTree.value, fileTreeSearch.value))

// ─── Collapse state ──────────────────────────────────────────────────────
const collapsedFolders = reactive(new Set())

function toggleFolder(path) {
  if (collapsedFolders.has(path)) {
    collapsedFolders.delete(path)
  } else {
    collapsedFolders.add(path)
  }
}
</script>

<template>
  <div class="tab-content-filetree">
    <!-- Toolbar -->
    <div class="filetree-toolbar">
      <span class="ft-label">📦 Files</span>
      <input
        class="ft-search"
        type="text"
        placeholder="Filter files..."
        v-model="fileTreeSearch"
      />
      <span class="ft-count">{{ files.length }} files</span>
    </div>

    <!-- Tree -->
    <div class="filetree-scroll">
      <template v-if="filteredTree.matched !== false">
        <TreeNode
          :node="filteredTree"
          :collapsedFolders="collapsedFolders"
          :searchQuery="fileTreeSearch"
          @toggle-folder="toggleFolder"
        />
      </template>
      <div v-else class="ft-no-results">No files match your search.</div>
    </div>
  </div>
</template>

<style scoped>
.tab-content-filetree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.filetree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
  flex-shrink: 0;
}

.ft-label {
  font-weight: bold;
  font-size: 11px;
  color: #333;
  flex-shrink: 0;
}

.ft-search {
  flex: 1;
  max-width: 180px;
  padding: 3px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 11px;
  outline: none;
  font-family: inherit;
}

.ft-search:focus {
  border-color: #007acc;
}

.ft-count {
  font-size: 10px;
  color: #888;
  flex-shrink: 0;
}

.filetree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.ft-no-results {
  padding: 20px;
  text-align: center;
  color: #aaa;
  font-style: italic;
  font-size: 11px;
}
</style>
