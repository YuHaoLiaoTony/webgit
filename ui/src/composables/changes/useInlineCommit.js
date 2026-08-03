import { ref, computed } from 'vue'
import { useStatusStore } from '../../stores/status.js'

/**
 * Inline commit form state & submission.
 *
 * Extracted from ChangesView.vue — Phase 3 refactor.
 */
export function useInlineCommit() {
  const statusStore = useStatusStore()

  const commitTitle = ref('')
  const commitBody = ref('')
  const inlineCommitting = ref(false)
  const inlineCommitError = ref(null)

  const isCommitDisabled = computed(() =>
    inlineCommitting.value || !commitTitle.value.trim()
  )

  async function handleInlineCommit() {
    if (!commitTitle.value.trim()) return
    inlineCommitting.value = true
    inlineCommitError.value = null
    try {
      await statusStore.commit({
        title: commitTitle.value.trim(),
        body: commitBody.value.trim(),
      })
      commitTitle.value = ''
      commitBody.value = ''
    } catch (e) {
      inlineCommitError.value = e.message
    } finally {
      inlineCommitting.value = false
    }
  }

  return {
    commitTitle,
    commitBody,
    inlineCommitting,
    inlineCommitError,
    isCommitDisabled,
    handleInlineCommit,
  }
}
