import { reactive, computed } from 'vue'

/**
 * Build a flat tree (directories + files) from a flat file list.
 * Extracted from ChangesView.vue — Phase 1 refactor.
 */
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

/**
 * Composable: file tree building, collapse/expand, and visibility filtering.
 *
 * @param {import('vue').Ref<Array>} unstagedFiles  reactive array of unstaged file items
 * @param {import('vue').Ref<Array>} stagedFiles    reactive array of staged file items
 * @param {import('vue').Ref}        selectedFile   shared ref — cleared when a directory is toggled
 * @param {import('vue').Ref}        selectedDir    shared ref — updated when a directory is toggled
 */
export function useFileTree(unstagedFiles, stagedFiles, selectedFile, selectedDir) {
  // ── collapsed directories ──────────────────────────────────────────
  const collapsedDirs = reactive({ unstaged: new Set(), staged: new Set() })

  // ── flat tree computed ─────────────────────────────────────────────
  const unstagedFlatItems = computed(() => buildFlatTree(unstagedFiles.value))
  const stagedFlatItems = computed(() => buildFlatTree(stagedFiles.value))

  // ── helpers ────────────────────────────────────────────────────────
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

  /**
   * Collect all file paths under a directory.
   * @param {Array} files   array of file items (each with a .path)
   * @param {string} dirPath
   * @returns {string[]}
   */
  function getFilesUnderDir(files, dirPath) {
    return files
      .filter(f => f.path === dirPath || f.path.startsWith(dirPath + '/'))
      .map(f => f.path)
  }

  // ── visible items (filtered by collapsed dirs) ─────────────────────
  const visibleUnstagedItems = computed(() =>
    unstagedFlatItems.value.filter(item => shouldShowItem(item, 'unstaged'))
  )
  const visibleStagedItems = computed(() =>
    stagedFlatItems.value.filter(item => shouldShowItem(item, 'staged'))
  )

  return {
    // state
    collapsedDirs,
    selectedDir,

    // computed
    unstagedFlatItems,
    stagedFlatItems,
    visibleUnstagedItems,
    visibleStagedItems,

    // methods
    toggleDir,
    isDirOpen,
    isDirCollapsed,
    shouldShowItem,
    getFilesUnderDir,
  }
}
