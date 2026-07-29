<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  filePath: { type: String, required: true },
  diffData: { type: Object, default: null },
  fileStatus: { type: String, default: 'modified' },
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 }
})

// ─── Display mode ──────────────────────────────────────────────────────
const displayMode = ref('inline') // 'inline' | 'side-by-side'

function toggleMode() {
  displayMode.value = displayMode.value === 'inline' ? 'side-by-side' : 'inline'
}

// ─── Status label ──────────────────────────────────────────────────────
const statusActionLabel = { added: 'Added', modified: 'Modified', deleted: 'Deleted', renamed: 'Renamed' }
const statusLabel = computed(() => statusActionLabel[props.fileStatus] || 'Modified')

// ─── Collapsed hunks ───────────────────────────────────────────────────
const collapsedHunks = ref(new Set())

function toggleHunk(index) {
  if (collapsedHunks.value.has(index)) {
    collapsedHunks.value.delete(index)
  } else {
    collapsedHunks.value.add(index)
    // Force reactivity
    collapsedHunks.value = new Set(collapsedHunks.value)
  }
}

function isHunkCollapsed(index) {
  return collapsedHunks.value.has(index)
}

// ─── Line number click ─────────────────────────────────────────────────
function onLineClick(hunkIndex, lineIndex) {
  // Placeholder for line selection
}

// ─── Mock diff data (default when no diffData prop) ────────────────────
const defaultDiffData = {
  hunks: [
    {
      header: '@@ -10,7 +10,7 @@',
      lines: [
        { type: 'context', oldNum: 8, newNum: 8, content: 'import { Diagnostic } from "./types";' },
        { type: 'context', oldNum: 9, newNum: 9, content: 'import { Symbol, Type } from "./symbols";' },
        { type: 'del', oldNum: 10, newNum: null, content: 'import { resolveName, isIdentifier } from "./utilities";' },
        { type: 'add', oldNum: null, newNum: 10, content: 'import { resolveName, isIdentifier, isQualifiedName } from "./utilities";' },
        { type: 'context', oldNum: 11, newNum: 11, content: 'import { DeclaredType, FreshObjectLiteralType } from "./declaredTypes";' },
        { type: 'context', oldNum: 12, newNum: 12, content: '' },
        { type: 'context', oldNum: 13, newNum: 13, content: 'export function checkSourceFile(node: SourceFile): Diagnostic[] {' },
      ]
    },
    {
      header: '@@ -568,8 +568,11 @@',
      lines: [
        { type: 'context', oldNum: 566, newNum: 566, content: '  function checkTypeAssignableTo(source: Type, target: Type): boolean {' },
        { type: 'context', oldNum: 567, newNum: 567, content: '    if (source === target) return true;' },
        { type: 'del', oldNum: 568, newNum: null, content: '    if (target.flags & TypeFlags.Any) return true;' },
        { type: 'add', oldNum: null, newNum: 568, content: '    if (target.flags & TypeFlags.Any) return true;' },
        { type: 'add', oldNum: null, newNum: 569, content: '    // Also check for unknown type compatibility' },
        { type: 'add', oldNum: null, newNum: 570, content: '    if (target.flags & TypeFlags.Unknown) return true;' },
        { type: 'context', oldNum: 569, newNum: 571, content: '    if (source.flags & TypeFlags.Never) return true;' },
        { type: 'context', oldNum: 570, newNum: 572, content: '    return isRelatedTo(source, target, RecursionFlags.Source);' },
      ]
    },
    {
      header: '@@ -1204,8 +1207,6 @@',
      lines: [
        { type: 'context', oldNum: 1202, newNum: 1205, content: '  // Check type parameters' },
        { type: 'context', oldNum: 1203, newNum: 1206, content: '  for (const tp of node.typeParameters || []) {' },
        { type: 'del', oldNum: 1204, newNum: null, content: '    const constraint = getConstraintOfTypeParameter(tp);' },
        { type: 'del', oldNum: 1205, newNum: null, content: '    if (constraint && !isTypeAssignableTo(constraint, tp.default)) {' },
        { type: 'context', oldNum: 1206, newNum: 1207, content: '      error(tp, Diagnostics.Type_parameter_0_has_a_default_type_that_is_not_assignable_to_its_constraint);' },
        { type: 'context', oldNum: 1207, newNum: 1208, content: '    }' },
        { type: 'context', oldNum: 1208, newNum: 1209, content: '  }' },
      ]
    }
  ],
  additions: 4,
  deletions: 3
}

// ─── Resolve diff data (use prop or default) ───────────────────────────
const resolvedDiff = computed(() => props.diffData || defaultDiffData)

// ─── Compute total additions/deletions from resolved data ──────────────
const totalAdditions = computed(() => props.additions || resolvedDiff.value.additions || 0)
const totalDeletions = computed(() => props.deletions || resolvedDiff.value.deletions || 0)

// ─── Side-by-side columns ──────────────────────────────────────────────
// For side-by-side: pair up lines from left (old) and right (new)
const sideBySideLines = computed(() => {
  const lines = []
  for (const hunk of resolvedDiff.value.hunks) {
    let leftIdx = 0
    let rightIdx = 0
    const leftLines = hunk.lines.filter(l => l.type !== 'add')
    const rightLines = hunk.lines.filter(l => l.type !== 'del')

    // We need to pair them properly
    const pairs = []
    let li = 0, ri = 0
    while (li < leftLines.length || ri < rightLines.length) {
      if (li < leftLines.length && ri < rightLines.length) {
        const left = leftLines[li]
        const right = rightLines[ri]
        if (left.type === 'del' && right.type === 'add') {
          // Pair deletion with addition
          pairs.push({ left, right, type: 'replace' })
          li++
          ri++
        } else if (left.type === 'del') {
          pairs.push({ left, right: null, type: 'del' })
          li++
        } else if (right.type === 'add') {
          pairs.push({ left: null, right, type: 'add' })
          ri++
        } else {
          pairs.push({ left, right, type: 'context' })
          li++
          ri++
        }
      } else if (li < leftLines.length) {
        pairs.push({ left: leftLines[li], right: null, type: 'del' })
        li++
      } else if (ri < rightLines.length) {
        pairs.push({ left: null, right: rightLines[ri], type: 'add' })
        ri++
      }
    }

    lines.push({ header: hunk.header, pairs })
  }
  return lines
})
</script>

<template>
  <div class="diff-viewer">
    <!-- File Header -->
    <div class="diff-file-header">
      <span :class="['file-status-badge', `file-status-${fileStatus}`]">
        {{ statusLabel }}
      </span>
      <span class="diff-file-path">{{ filePath }}</span>
      <span class="diff-file-stats">
        <span v-if="totalAdditions > 0" class="diff-stats-add">+{{ totalAdditions }}</span>
        <span v-if="totalDeletions > 0" class="diff-stats-del">-{{ totalDeletions }}</span>
      </span>
      <span class="diff-mode-toggle" @click="toggleMode">
        <span :class="{ active: displayMode === 'inline' }">Inline</span>
        <span class="diff-mode-sep">|</span>
        <span :class="{ active: displayMode === 'side-by-side' }">Side-by-Side</span>
      </span>
    </div>

    <!-- Inline Mode -->
    <template v-if="displayMode === 'inline'">
      <div
        v-for="(hunk, hIdx) in resolvedDiff.hunks"
        :key="'h' + hIdx"
        class="diff-hunk-wrapper"
      >
        <!-- Hunk Header (clickable to toggle) -->
        <div class="diff-hunk-header" @click="toggleHunk(hIdx)">
          <span class="diff-hunk-collapse">{{ isHunkCollapsed(hIdx) ? '▶' : '▼' }}</span>
          <span>{{ hunk.header }}</span>
        </div>

        <!-- Hunk Body -->
        <div v-if="!isHunkCollapsed(hIdx)" class="diff-hunk-body">
          <div
            v-for="(line, lIdx) in hunk.lines"
            :key="'l' + hIdx + '-' + lIdx"
            :class="['diff-line', `diff-${line.type}`]"
            @click="onLineClick(hIdx, lIdx)"
          >
            <span class="diff-line-number">{{ line.oldNum || '' }}</span>
            <span class="diff-line-number">{{ line.newNum || '' }}</span>
            <span class="diff-line-content">{{ line.content }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Side-by-Side Mode -->
    <template v-else>
      <div
        v-for="(hunk, hIdx) in sideBySideLines"
        :key="'sbs-h' + hIdx"
        class="diff-hunk-wrapper"
      >
        <!-- Hunk Header -->
        <div class="diff-hunk-header" @click="toggleHunk(hIdx)">
          <span class="diff-hunk-collapse">{{ isHunkCollapsed(hIdx) ? '▶' : '▼' }}</span>
          <span>{{ hunk.header }}</span>
        </div>

        <div v-if="!isHunkCollapsed(hIdx)" class="diff-hunk-body diff-sbs-body">
          <div
            v-for="(pair, pIdx) in hunk.pairs"
            :key="'sbs-' + hIdx + '-' + pIdx"
            class="diff-sbs-row"
          >
            <!-- Left (old) -->
            <div
              :class="[
                'diff-sbs-cell',
                pair.type === 'del' ? 'diff-del' : pair.type === 'replace' ? 'diff-del' : 'diff-context'
              ]"
            >
              <span class="diff-line-number">{{ pair.left?.oldNum || '' }}</span>
              <span class="diff-line-sbs-content">{{ pair.left?.content || '' }}</span>
            </div>
            <!-- Right (new) -->
            <div
              :class="[
                'diff-sbs-cell',
                pair.type === 'add' ? 'diff-add' : pair.type === 'replace' ? 'diff-add' : 'diff-context'
              ]"
            >
              <span class="diff-line-number">{{ pair.right?.newNum || '' }}</span>
              <span class="diff-line-sbs-content">{{ pair.right?.content || '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.diff-viewer {
  font-family: "SF Mono", "Consolas", "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.5;
}

/* File Header */
.diff-viewer .diff-file-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background-color: #f0f2f4;
  border: 1px solid #e1e4e8;
  border-radius: 4px 4px 0 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: bold;
  color: #333;
  border-bottom: none;
}

.diff-viewer .diff-file-header .file-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.diff-viewer .diff-file-header .file-status-badge.file-status-added { background-color: #28a745; }
.diff-viewer .diff-file-header .file-status-badge.file-status-modified { background-color: #d4980a; }
.diff-viewer .diff-file-header .file-status-badge.file-status-deleted { background-color: #cb2431; }
.diff-viewer .diff-file-header .file-status-badge.file-status-renamed { background-color: #0078d4; }

.diff-file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "SF Mono", Consolas, monospace;
  font-weight: normal;
}

.diff-file-stats {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: normal;
}

.diff-stats-add { color: #28a745; }
.diff-stats-del { color: #cb2431; }

.diff-mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #888;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #dcdcdc;
  border-radius: 3px;
  padding: 1px 6px;
}

.diff-mode-toggle span {
  padding: 1px 3px;
  border-radius: 2px;
}

.diff-mode-toggle span.active {
  color: #007acc;
  font-weight: bold;
}

.diff-mode-sep {
  color: #ddd !important;
  font-weight: normal !important;
}

/* Hunk Wrapper */
.diff-hunk-wrapper {
  border: 1px solid #e1e4e8;
  border-top: none;
}

.diff-hunk-wrapper:last-child {
  border-radius: 0 0 4px 4px;
}

/* Hunk Header */
.diff-viewer .diff-hunk-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background-color: #f5f7f9;
  color: #666;
  font-weight: bold;
  font-size: 10px;
  border-bottom: 1px solid #e1e4e8;
  font-family: monospace;
  cursor: pointer;
  user-select: none;
}

.diff-viewer .diff-hunk-header:hover {
  background-color: #eef0f2;
}

.diff-hunk-collapse {
  font-size: 8px;
  color: #999;
  width: 10px;
  text-align: center;
  flex-shrink: 0;
}

/* Hunk Body */
.diff-hunk-body {
  overflow-x: auto;
}

/* Inline diff lines */
.diff-viewer .diff-line {
  display: flex;
  align-items: stretch;
  min-height: 20px;
  font-family: monospace;
  font-size: 11px;
  line-height: 20px;
  cursor: pointer;
}

.diff-viewer .diff-line:hover {
  outline: 1px solid rgba(0, 122, 204, 0.3);
  outline-offset: -1px;
}

.diff-viewer .diff-line .diff-line-number {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 36px;
  min-width: 36px;
  padding: 0 8px 0 4px;
  color: #999;
  user-select: none;
  flex-shrink: 0;
  background-color: #fafbfc;
  border-right: 1px solid #eee;
}

.diff-viewer .diff-line .diff-line-number + .diff-line-number {
  width: 36px;
  min-width: 36px;
  background-color: #fafbfc;
  border-right: 1px solid #e1e4e8;
}

.diff-viewer .diff-line .diff-line-content {
  flex: 1;
  white-space: pre;
  padding: 0 4px 0 8px;
  overflow-x: auto;
}

.diff-viewer .diff-context {
  color: #333;
  background-color: transparent;
}

.diff-viewer .diff-add {
  background-color: #e6ffed;
  color: #22863a;
}

.diff-viewer .diff-del {
  background-color: #ffeef0;
  color: #cb2431;
}

/* Side-by-Side */
.diff-sbs-body {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.diff-sbs-row {
  display: flex;
  width: 100%;
  border-bottom: 1px solid #f6f8fa;
}

.diff-sbs-row:last-child {
  border-bottom: none;
}

.diff-sbs-cell {
  display: flex;
  align-items: stretch;
  width: 50%;
  min-height: 20px;
  line-height: 20px;
  cursor: pointer;
}

.diff-sbs-cell:hover {
  outline: 1px solid rgba(0, 122, 204, 0.3);
  outline-offset: -1px;
}

.diff-sbs-cell .diff-line-number {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 36px;
  min-width: 36px;
  padding: 0 8px 0 4px;
  color: #999;
  user-select: none;
  flex-shrink: 0;
  background-color: #fafbfc;
  border-right: 1px solid #eee;
}

.diff-line-sbs-content {
  flex: 1;
  white-space: pre;
  padding: 0 4px 0 8px;
  overflow-x: auto;
}

/* Border separator between left and right columns */
.diff-sbs-cell:first-child {
  border-right: 1px solid #e1e4e8;
}
</style>
