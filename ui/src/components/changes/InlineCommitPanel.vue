<script setup>
import { ref, onMounted } from 'vue'
import { useDragResize } from '../../composables/shared/useDragResize.js'
import { useInlineCommit } from '../../composables/changes/useInlineCommit.js'
import { useAICommit } from '../../composables/changes/useAICommit.js'
import { useStatusStore } from '../../stores/status.js'

const statusStore = useStatusStore()
const {
  commitTitle,
  commitBody,
  inlineCommitting,
  inlineCommitError,
  isCommitDisabled,
  handleInlineCommit,
} = useInlineCommit()

const {
  aiGenerating,
  customPrompt,
  showCustomPrompt,
  loadSavedPrompt,
  generateAIMessage,
} = useAICommit()

onMounted(() => {
  loadSavedPrompt()
})

// ── AI generate wrapper (bridges composables) ────────────────────────
async function onGenerateAI() {
  try {
    const result = await generateAIMessage(statusStore.stagedFiles)
    if (result) {
      commitTitle.value = result.title || ''
      commitBody.value = result.body || ''
    }
  } catch (_) {
    inlineCommitError.value = 'AI generation failed'
  }
}

// ── keyboard: Ctrl+Enter to commit ──────────────────────────────────
function onDiffKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleInlineCommit()
  }
}

// ── drag resize (commit panel header) ───────────────────────────────
const commitPanelRef = ref(null)
const commitHeaderRef = ref(null)

const { onMouseDown: onCommitResizerMouseDown } = useDragResize({
  direction: 'vertical',
  targetRef: commitPanelRef,
  handleRef: commitHeaderRef,
  minSize: 80,
})
</script>

<template>
  <div class="cv-inline-commit" ref="commitPanelRef" @keydown="onDiffKeydown">
    <div
      class="cv-inline-commit-header"
      ref="commitHeaderRef"
      @mousedown="onCommitResizerMouseDown"
    >Commit</div>

    <div class="cv-inline-commit-body">
      <div class="cv-inline-commit-title-row">
        <input
          v-model="commitTitle"
          class="cv-inline-commit-title"
          type="text"
          placeholder="Commit title…"
        />
        <button
          class="cv-ai-btn"
          :disabled="aiGenerating"
          @click="onGenerateAI"
          :title="aiGenerating ? 'Generating…' : 'Generate commit message with AI'"
        >{{ aiGenerating ? '⏳' : '✨' }}</button>
        <button
          class="cv-ai-prompt-btn"
          @click="showCustomPrompt = !showCustomPrompt"
          :title="showCustomPrompt ? 'Hide custom prompt' : '臨時提示詞（預填啟用中 AI profile 的 prompt）'"
        >📝</button>
      </div>

      <div v-if="showCustomPrompt" class="cv-custom-prompt-wrap">
        <textarea
          v-model="customPrompt"
          class="cv-custom-prompt-input"
          placeholder="臨時提示詞（選填，覆寫啟用中 profile 的 prompt）：例如「請用繁體中文」…"
          rows="2"
        ></textarea>
      </div>

      <textarea
        v-model="commitBody"
        class="cv-inline-commit-body-input"
        placeholder="Optional description…"
      ></textarea>

      <div v-if="inlineCommitError" class="cv-inline-commit-error">{{ inlineCommitError }}</div>
    </div>

    <div class="cv-inline-commit-footer">
      <button
        class="cv-inline-commit-btn"
        :disabled="isCommitDisabled"
        @click="handleInlineCommit"
      >
        {{ inlineCommitting ? 'Committing…' : 'Commit' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Inline Commit Panel (below diff) ──────────────────────────────── */
.cv-inline-commit {
  border: 1px solid #e1e4e8;
  border-top: none;
  border-radius: 0 0 4px 4px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.cv-inline-commit-header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: bold;
  color: #333;
  background-color: #f0f2f4;
  border-bottom: 1px solid #e1e4e8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  cursor: row-resize;
  user-select: none;
}

.cv-inline-commit-header:hover,
.cv-inline-commit-header.dragging {
  background-color: #e8eaec;
}

.cv-inline-commit-body {
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.cv-inline-commit-title-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.cv-inline-commit-title {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  outline: none;
  box-sizing: border-box;
}

.cv-inline-commit-title:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.cv-ai-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.15s;
}

.cv-ai-btn:hover:not(:disabled) {
  background-color: #e8eaec;
}

.cv-ai-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.cv-inline-commit-body-input {
  flex: 1;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.4;
  resize: none;
  min-height: 48px;
  outline: none;
  box-sizing: border-box;
}

.cv-inline-commit-body-input:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}

.cv-inline-commit-footer {
  display: flex;
  justify-content: flex-end;
  padding: 6px 10px 8px;
}

.cv-inline-commit-btn {
  padding: 5px 16px;
  background-color: #28a745;
  color: #fff;
  border: 1px solid #1e7e34;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.15s;
}

.cv-inline-commit-btn:hover:not(:disabled) {
  background-color: #218838;
}

.cv-inline-commit-btn:disabled {
  background-color: #94d3a2;
  border-color: #7fc08f;
  cursor: not-allowed;
}

.cv-inline-commit-error {
  padding: 4px 8px;
  background-color: #fff0f0;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #cb2431;
  font-size: 11px;
}

.cv-ai-prompt-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0;
  transition: background-color 0.15s;
  flex-shrink: 0;
}

.cv-ai-prompt-btn:hover {
  background-color: #e8eaec;
}

.cv-ai-prompt-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cv-custom-prompt-wrap {
  padding: 4px 0;
}

.cv-custom-prompt-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px dashed #bbb;
  border-radius: 4px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.4;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.cv-custom-prompt-input:focus {
  border-color: #007acc;
  border-style: solid;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.15);
}
</style>
