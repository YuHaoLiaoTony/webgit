import { ref } from 'vue'
import { useStatusStore } from '../../stores/status.js'

/**
 * Modal commit dialog state & logic.
 *
 * Extracted from ChangesView.vue — Phase 3 refactor.
 * Note: auto-focus of the textarea is handled by CommitDialog.vue internally.
 */
export function useCommitDialog() {
  const statusStore = useStatusStore()

  const showCommitDialog = ref(false)
  const commitMessage = ref('')
  const committing = ref(false)
  const commitError = ref(null)

  function openCommitDialog() {
    if (statusStore.stagedFiles.length === 0) return
    showCommitDialog.value = true
    commitMessage.value = ''
    commitError.value = null
  }

  function closeCommitDialog() {
    showCommitDialog.value = false
    commitMessage.value = ''
    commitError.value = null
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

  /**
   * Keyboard handler for the commit dialog.
   * Ctrl/Cmd+Enter → commit, Escape → close.
   * Caller should bind this to a keydown listener scoped to the dialog.
   */
  function onKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCommit()
      return
    }
    if (e.key === 'Escape') {
      closeCommitDialog()
    }
  }

  return {
    showCommitDialog,
    commitMessage,
    committing,
    commitError,
    openCommitDialog,
    closeCommitDialog,
    handleCommit,
    onKeydown,
  }
}
