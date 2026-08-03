import { ref } from 'vue'
import { useStatusStore } from '../../stores/status.js'

/**
 * Discard-changes confirmation logic.
 *
 * Extracted from ChangesView.vue — Phase 3 refactor.
 *
 * @param {import('vue').Ref<Set<string>>} checkedFiles   shared ref from useFileSelection
 * @param {Function}                       getFilesUnderDir  from useFileTree
 */
export function useDiscard(checkedFiles, getFilesUnderDir) {
  const statusStore = useStatusStore()

  const showDiscardConfirm = ref(false)
  const discarding = ref(false)

  /**
   * Build the dynamic label for the discard context-menu item / dialog title.
   * @param {{ type: string, path: string }} target  ctx-menu target
   * @returns {string}
   */
  function getDiscardLabel(target) {
    if (!target) return 'Discard All Changes'
    if (target.type === 'file') return `Discard ${target.path.split('/').pop()}`
    if (target.type === 'dir') return `Discard ${target.path.split('/').pop()}/`
    return 'Discard All Changes'
  }

  /**
   * Called from the context-menu item action.
   * Determines what to discard based on target type and opens the confirm dialog.
   * Does NOT close the context menu — the caller should do that separately.
   *
   * @param {{ type: string, path: string }} target  ctx-menu target
   */
  function handleDiscardSelected(target) {
    if (!target || target.type === 'header') {
      showDiscardConfirm.value = true
      return
    }
    if (target.type === 'file') {
      checkedFiles.value = new Set([target.path])
    } else if (target.type === 'dir') {
      const filesUnder = getFilesUnderDir(statusStore.unstagedFiles, target.path)
      checkedFiles.value = new Set(filesUnder)
    }
    showDiscardConfirm.value = true
  }

  function closeDiscardConfirm() {
    showDiscardConfirm.value = false
  }

  async function handleDiscard() {
    discarding.value = true
    try {
      const files = [...checkedFiles.value]
      await statusStore.discardFiles(files.length > 0 ? files : undefined)
      checkedFiles.value = new Set()
      showDiscardConfirm.value = false
    } catch (_) {
      // error handled by store
    } finally {
      discarding.value = false
    }
  }

  return {
    showDiscardConfirm,
    discarding,
    getDiscardLabel,
    handleDiscardSelected,
    closeDiscardConfirm,
    handleDiscard,
  }
}
