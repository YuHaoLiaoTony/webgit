import { ref } from 'vue'
import { useApi } from '../useApi.js'
import { useToast } from '../useToast.js'

/**
 * AI commit message generation.
 *
 * Extracted from ChangesView.vue — Phase 3 refactor.
 */
export function useAICommit() {
  const aiGenerating = ref(false)
  const customPrompt = ref('')
  const showCustomPrompt = ref(false)

  /**
   * Load the active AI profile's prompt and pre-fill the custom prompt input.
   * The user may override it temporarily — the override is never persisted.
   */
  async function loadSavedPrompt() {
    const { get } = useApi()
    try {
      const data = await get('/ai/profiles')
      const active = (data.profiles || []).find(p => p.id === data.active)
      if (active?.prompt) {
        customPrompt.value = active.prompt
      }
    } catch (_) {
      // Config may be unavailable — ignore and keep the prompt empty
    }
  }

  /**
   * Call POST /ai-commit-generate and populate title + body.
   * Returns the result object { title, body } so the caller can assign to
   * whatever commit-message fields it owns (inline or modal).
   *
   * @param {Array} stagedFiles  raw staged file list from store
   * @returns {Promise<{title:string, body:string}>}
   */
  async function generateAIMessage(stagedFiles) {
    const { post } = useApi()
    const toast = useToast()

    if (!stagedFiles || stagedFiles.length === 0) {
      toast.showToast('warning', 'No files staged')
      return { title: '', body: '' }
    }

    aiGenerating.value = true
    try {
      const result = await post('/ai-commit-generate', {
        stagedFiles,
        customPrompt: customPrompt.value.trim() || undefined,
      })
      toast.showToast('success', 'Commit message generated')
      return result
    } catch (e) {
      toast.showToast('error', 'AI generation failed')
      throw e
    } finally {
      aiGenerating.value = false
    }
  }

  return {
    aiGenerating,
    customPrompt,
    showCustomPrompt,
    loadSavedPrompt,
    generateAIMessage,
  }
}
