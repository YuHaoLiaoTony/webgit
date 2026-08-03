import { ref } from 'vue'
import { useStatusStore } from '../../stores/status.js'

/**
 * File selection, checkbox, and stage/unstage operations.
 *
 * Extracted from ChangesView.vue — Phase 3 refactor.
 *
 * @param {import('vue').Ref}     selectedFile     shared ref — current file selection (owned by parent, passed through)
 * @param {import('vue').Ref}     selectedDir      shared ref — current dir selection (owned by parent, passed through)
 * @param {Function}              getFilesUnderDir function from useFileTree
 * @param {Function}              openCommitDialog function from useCommitDialog (for commitChanges)
 */
export function useFileSelection(selectedFile, selectedDir, getFilesUnderDir, openCommitDialog) {
  const statusStore = useStatusStore()

  // ── state ──────────────────────────────────────────────────────────
  const checkedFiles = ref(new Set())

  // ── checkbox ───────────────────────────────────────────────────────
  function toggleCheck(file) {
    const newSet = new Set(checkedFiles.value)
    if (newSet.has(file.path)) {
      newSet.delete(file.path)
    } else {
      newSet.add(file.path)
    }
    checkedFiles.value = newSet
  }

  function isChecked(file) {
    return checkedFiles.value.has(file.path)
  }

  // ── selection ──────────────────────────────────────────────────────
  function selectFile(file) {
    selectedFile.value = file
    selectedDir.value = null
  }

  // ── double-click → stage/unstage single file ──────────────────────
  function onFileDblClick(file, group) {
    if (group === 'unstaged') {
      statusStore.stageFiles([file.path])
    } else if (group === 'staged') {
      statusStore.unstageFiles([file.path])
    }
  }

  // ── batch stage ────────────────────────────────────────────────────
  function stageSelected() {
    const unstaged = statusStore.unstagedFiles
    const checked = [...checkedFiles.value].filter(p =>
      unstaged.some(f => f.path === p)
    )
    if (checked.length > 0) {
      statusStore.stageFiles(checked)
    } else if (selectedFile.value && unstaged.some(f => f.path === selectedFile.value.path)) {
      statusStore.stageFiles([selectedFile.value.path])
    } else if (selectedDir.value) {
      const paths = getFilesUnderDir(unstaged, selectedDir.value)
      if (paths.length > 0) statusStore.stageFiles(paths)
    } else {
      const paths = unstaged.map(f => f.path)
      if (paths.length > 0) statusStore.stageFiles(paths)
    }
  }

  // ── batch unstage ──────────────────────────────────────────────────
  function unstageSelected() {
    const staged = statusStore.stagedFiles
    const checked = [...checkedFiles.value].filter(p =>
      staged.some(f => f.path === p)
    )
    if (checked.length > 0) {
      statusStore.unstageFiles(checked)
    } else if (selectedFile.value && staged.some(f => f.path === selectedFile.value.path)) {
      statusStore.unstageFiles([selectedFile.value.path])
    } else if (selectedDir.value) {
      const paths = getFilesUnderDir(staged, selectedDir.value)
      if (paths.length > 0) statusStore.unstageFiles(paths)
    } else {
      const paths = staged.map(f => f.path)
      if (paths.length > 0) statusStore.unstageFiles(paths)
    }
  }

  // ── stage all ──────────────────────────────────────────────────────
  function stageAll() {
    const paths = statusStore.unstagedFiles.map(f => f.path)
    statusStore.stageFiles(paths)
  }

  // ── commit shortcut ────────────────────────────────────────────────
  function commitChanges() {
    openCommitDialog()
  }

  return {
    selectedFile,
    checkedFiles,
    toggleCheck,
    isChecked,
    selectFile,
    onFileDblClick,
    stageSelected,
    unstageSelected,
    stageAll,
    commitChanges,
  }
}
