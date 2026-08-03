# ChangesView.vue 重構分析與拆分方案

> 分析日期：2025-08-03
> 檔案現狀：~700+ 行（script ~410 行 + template ~240 行 + style ~250 行）

---

## 一、現狀分析

### 1.1 檔案規模

| 區塊 | 行數 | 佔比 |
|------|------|------|
| `<script setup>` | ~410 行 | ~57% |
| `<template>` | ~240 行 | ~33% |
| `<style scoped>` | ~250 行 | ~35%（有重疊） |

### 1.2 職責盤點（依原始碼順序）

| # | 職責區塊 | Script 區段 | 說明 |
|---|---------|------------|------|
| 1 | **Badge count** | `totalChanged`, `unstageCount`, `stageCount` | 三個簡單 computed，直接轉發 store |
| 2 | **Status maps** | `statusLabelMap`, `statusCssMap`, `statusActionLabel` | 靜態查表常數 |
| 3 | **Tree building** | `buildFlatTree()` | ~55 行，將扁平檔案列表轉為含目錄節點的 flat tree |
| 4 | **Derived state** | `unstagedFiles`, `stagedFiles`, `unstagedFlatItems`, `stagedFlatItems` | computed 轉發 + tree build |
| 5 | **Selection state** | `selectedFile`, `selectedDir`, `checkedFiles`, `collapsedDirs` | UI 互動狀態 |
| 6 | **Commit dialog** | `showCommitDialog` ~ `closeCommitDialog()` | Modal commit dialog 的開關、提交邏輯、鍵盤事件 |
| 7 | **Context menu** | `unstagedCtxMenu` ~ `onCtxMenuDocumentClick()` | 右鍵選單的顯示/隱藏/文件點擊關閉 |
| 8 | **Inline commit state** | `commitTitle`, `commitBody`, `inlineCommitting`, `inlineCommitError` | Inline commit panel 的 form state |
| 9 | **AI commit generation** | `loadSavedPrompt()`, `generateAIMessage()`, `customPrompt`, `showCustomPrompt` | AI 產生 commit message，含 prompt 載入與自訂 |
| 10 | **Inline commit action** | `handleInlineCommit()`, `isCommitDisabled` | Inline 表單提交 |
| 11 | **Discard logic** | `discardLabel` ~ `handleDiscard()` | Discard confirm dialog 的 target 判斷、執行 |
| 12 | **Keyboard shortcuts** | `onKeydown()`, `onDiffKeydown()` | Ctrl+Enter commit、Escape 關閉 |
| 13 | **Tree toggle** | `toggleDir()`, `isDirOpen()`, `isDirCollapsed()`, `shouldShowItem()`, `visibleUnstagedItems`, `visibleStagedItems` | 目錄展開/折疊與可見性過濾 |
| 14 | **File selection** | `selectFile()`, `onFileDblClick()` | 點擊選取、雙擊 stage/unstage |
| 15 | **Checkbox toggle** | `toggleCheck()`, `isChecked()` | 勾選邏輯 |
| 16 | **Helper** | `getFilesUnderDir()` | 收集目錄下所有檔案路徑 |
| 17 | **Stage/unstage actions** | `stageSelected()`, `unstageSelected()`, `stageAll()`, `commitChanges()` | 按鈕觸發的批次操作（含優先級判斷） |
| 18 | **Vertical resizer** | staged panel drag resize | 拖曳調整 staged panel 高度 |
| 19 | **Commit panel resizer** | commit panel drag resize | 拖曳調整 commit panel 高度 |
| 20 | **Horizontal resizer** | files/diff split drag resize | 拖曳調整左右面板寬度 |
| 21 | **Global mouse handlers** | `onGlobalMouseMove()`, `onGlobalMouseUp()` | 三個 drag 的 mousemove/mouseup 統一處理 |
| 22 | **Lifecycle** | `onMounted()`, `onUnmounted()` | 事件綁定、初始資料 fetch、初始面板尺寸 |

總計 **22 個獨立職責區塊**，全部耦合在單一 `.vue` 檔案中。

### 1.3 核心問題

1. **單一職責原則（SRP）嚴重違反**：一個 component 同時管理 tree building、drag resize、commit dialog、AI generation、context menu、discard confirm 等完全不相關的邏輯。
2. **可測試性為零**：所有邏輯內聯在 `<script setup>` 中，無法獨立 unit test。
3. **複用性為零**：drag resize 邏輯重複三份（vertical、commit、horizontal），但無法共用。Context menu、confirm dialog 等通用 UI pattern 也被封在裡面。
4. **維護風險高**：修改任一功能都需在 ~700 行中定位；template 中 unstaged/staged 的 tree rendering 幾乎完全重複。
5. **狀態管理混亂**：local state（`selectedFile`, `checkedFiles`, `collapsedDirs`）與 store state（`statusStore.*`）交織，無清晰邊界。

---

## 二、拆分目標與原則

| 原則 | 目標 |
|------|------|
| **單一職責** | 每個檔案只做一件事 |
| **可測試** | Composable 可獨立單元測試；Component 可隔離測試 |
| **可複用** | Drag resize、context menu、confirm dialog 可供其他頁面使用 |
| **可維護** | 修改某一功能不需遍覽全檔 |
| **漸進式重構** | 可分批進行，不影響既有功能 |

---

## 三、建議目標架構

### 3.1 目錄結構

```
ui/src/
├── components/
│   ├── changes/                          # 🆕 ChangesView 專屬子目錄
│   │   ├── ChangesView.vue               # 主組件（thin orchestrator，~80 行）
│   │   ├── FileTreePanel.vue             # 檔案樹面板（unstaged + staged）
│   │   ├── FileTreeItem.vue              # 單一樹節點（file / dir）
│   │   ├── InlineCommitPanel.vue         # Diff 下方的 inline commit 表單
│   │   ├── CommitDialog.vue              # Modal commit dialog
│   │   ├── DiscardConfirmDialog.vue      # Discard 確認對話框
│   │   └── ContextMenu.vue               # 通用右鍵選單（可提升至 shared/）
│   │
│   ├── shared/                           # 🆕 跨頁面共用元件
│   │   ├── ResizeHandle.vue              # 通用拖曳縮放 handle（含 composable）
│   │   ├── ConfirmDialog.vue             # 通用確認對話框（含 composable）
│   │   └── ContextMenu.vue               # 通用右鍵選單（含 composable）
│   │
│   └── ...existing components...         # 現有元件保持不變
│
├── composables/
│   ├── changes/                          # 🆕 ChangesView 專屬 composables
│   │   ├── useFileTree.js                # 樹狀結構建置、展開/折疊、可見性
│   │   ├── useFileSelection.js           # 選取、勾選、stage/unstage 操作
│   │   ├── useInlineCommit.js            # Inline commit 表單邏輯
│   │   ├── useCommitDialog.js            # Modal commit dialog 邏輯
│   │   ├── useAICommit.js               # AI commit message 生成
│   │   ├── useDiscard.js                # Discard 邏輯
│   │   └── useStatusMaps.js             # Status 常數與查表
│   │
│   ├── shared/                           # 🆕 跨頁面共用 composables
│   │   ├── useDragResize.js              # 通用拖曳縮放（支援 horizontal / vertical）
│   │   └── useConfirmDialog.js           # 通用確認對話框狀態管理
│   │
│   └── ...existing composables...        # useApi, useToast, useTheme, useLongPress
```

### 3.2 各檔案職責詳述

---

#### 🧩 Component：`ChangesView.vue`（主組件）

**角色**：Layout orchestrator，只負責組合子組件與初始資料載入。

**預估行數**：~80 行（script + template）

**保留的職責**：
- `onMounted`：觸發 `statusStore.fetchStatus()` + `loadSavedPrompt()`
- 組合子組件（FileTreePanel、DiffViewer、InlineCommitPanel）
- 管理 `selectedFile` 狀態（傳給 DiffViewer 和 InlineCommitPanel）
- 水平 resizer（files panel ↔ diff panel）

**移除的職責**：
- Tree building / toggle → `useFileTree` + `FileTreePanel`
- 所有 commit 相關 → `InlineCommitPanel` + `CommitDialog`
- 所有 discard 相關 → `DiscardConfirmDialog`
- 所有 context menu → `ContextMenu`
- Staged panel vertical resizer → `useDragResize`（在 FileTreePanel 內使用）
- Commit panel resizer → `useDragResize`（在 InlineCommitPanel 內使用）
- AI commit → `useAICommit`
- Status maps → `useStatusMaps`

---

#### 🧩 Component：`FileTreePanel.vue`

**角色**：渲染 unstaged + staged 兩組檔案樹，含各自的 header、stage/unstage 按鈕、vertical resizer。

**預估行數**：~120 行（script + template）

**Props**：
- `files: FileItem[]` — 檔案列表
- `group: 'unstaged' | 'staged'` — 區分 unstaged/staged
- `title: string` — header 標題

**Emits**：
- `select(file)` — 選取檔案
- `stage(paths[])` / `unstage(paths[])` — 批次操作

**內部使用**：
- `useFileTree` composable
- `useDragResize` composable（for staged panel header drag）
- `FileTreeItem` 子組件

---

#### 🧩 Component：`FileTreeItem.vue`

**角色**：渲染單一樹節點（目錄或檔案）。

**預估行數**：~60 行（script + template）

**Props**：
- `item: TreeItem` — 節點資料
- `depth: number`
- `selected: boolean`
- `dirSelected: boolean`
- `statusMap: Record<string, string>`

**Emits**：
- `click(item)` — 點擊
- `dblclick(item)` — 雙擊
- `toggle-dir(path)` — 展開/折疊目錄
- `contextmenu(event, target)` — 右鍵

**關鍵價值**：消除 template 中 unstaged/staged 兩份幾乎完全相同的 tree item 渲染程式碼。

---

#### 🧩 Component：`InlineCommitPanel.vue`

**角色**：Diff 下方的 inline commit 表單區域，含 AI 按鈕、prompt 設定、commit 提交。

**預估行數**：~100 行（script + template）

**內部使用**：
- `useInlineCommit` composable（表單邏輯）
- `useAICommit` composable（AI 生成邏輯）
- `useDragResize` composable（commit panel header drag）

**Props**：無（直接讀 store）

---

#### 🧩 Component：`CommitDialog.vue`

**角色**：Modal commit dialog。

**預估行數**：~80 行（script + template）

**Emits**：
- `close`

**內部使用**：
- `useCommitDialog` composable

---

#### 🧩 Component：`DiscardConfirmDialog.vue`

**角色**：Discard 確認對話框，顯示將被捨棄的檔案列表。

**預估行數**：~70 行（script + template）

**Props**：
- `checkedFiles: Set<string>`
- `discardLabel: string`

**Emits**：
- `confirm`
- `close`

---

#### 🧩 Component：`ContextMenu.vue`（可提升至 shared/）

**角色**：通用右鍵選單，支援任意選項列表、定位、點擊外部關閉。

**預估行數**：~60 行（script + template）

**Props**：
- `visible: boolean`
- `x: number`
- `y: number`
- `items: MenuItem[]`（`{ label, icon?, shortcut?, action }`）

**Emits**：
- `close`

---

#### 🧩 Composable：`useFileTree.js`

**角色**：將扁平檔案列表轉為含目錄的 flat tree，管理展開/折疊與可見性過濾。

**匯出**：
```js
export function useFileTree(files: Ref<FileItem[]>) {
  return {
    flatItems: ComputedRef<TreeItem[]>,      // buildFlatTree 結果
    collapsedDirs: Reactive<Set<string>>,
    toggleDir(path: string): void,
    isDirOpen(path: string): boolean,
    isDirCollapsed(path: string): boolean,
    visibleItems: ComputedRef<TreeItem[]>,   // 已過濾折疊目錄
    getFilesUnderDir(dirPath: string): string[],
  }
}
```

---

#### 🧩 Composable：`useFileSelection.js`

**角色**：管理檔案選取、勾選、stage/unstage 優先級邏輯。

**匯出**：
```js
export function useFileSelection(unstagedFiles, stagedFiles, statusStore) {
  return {
    selectedFile: Ref<FileItem | null>,
    selectedDir: Ref<string | null>,
    checkedFiles: Reactive<Set<string>>,
    toggleCheck(file): void,
    isChecked(file): boolean,
    stageSelected(): void,
    unstageSelected(): void,
    stageAll(): void,
    selectFile(file): void,
    onFileDblClick(file, group): void,
  }
}
```

---

#### 🧩 Composable：`useInlineCommit.js`

**角色**：Inline commit 表單狀態與提交邏輯。

**匯出**：
```js
export function useInlineCommit(statusStore) {
  return {
    commitTitle: Ref<string>,
    commitBody: Ref<string>,
    inlineCommitting: Ref<boolean>,
    inlineCommitError: Ref<string | null>,
    isCommitDisabled: ComputedRef<boolean>,
    handleInlineCommit(): Promise<void>,
    resetForm(): void,
  }
}
```

---

#### 🧩 Composable：`useCommitDialog.js`

**角色**：Modal commit dialog 的開關、提交、鍵盤快捷鍵。

**匯出**：
```js
export function useCommitDialog(statusStore) {
  return {
    showCommitDialog: Ref<boolean>,
    commitMessage: Ref<string>,
    committing: Ref<boolean>,
    commitError: Ref<string | null>,
    commitInputRef: Ref<HTMLElement | null>,
    openCommitDialog(): void,
    closeCommitDialog(): void,
    handleCommit(): Promise<void>,
    onKeydown(e: KeyboardEvent): void,
  }
}
```

---

#### 🧩 Composable：`useAICommit.js`

**角色**：AI commit message 生成、prompt 載入與自訂。

**匯出**：
```js
export function useAICommit() {
  return {
    aiGenerating: Ref<boolean>,
    customPrompt: Ref<string>,
    showCustomPrompt: Ref<boolean>,
    loadSavedPrompt(): Promise<void>,
    generateAIMessage(stagedFiles): Promise<{ title, body }>,
  }
}
```

---

#### 🧩 Composable：`useDiscard.js`

**角色**：Discard 目標判斷、確認對話框狀態。

**匯出**：
```js
export function useDiscard(unstagedFiles, checkedFiles, statusStore) {
  return {
    showDiscardConfirm: Ref<boolean>,
    discarding: Ref<boolean>,
    discardLabel: ComputedRef<string>,
    openDiscardConfirm(target): void,
    closeDiscardConfirm(): void,
    handleDiscard(): Promise<void>,
  }
}
```

---

#### 🧩 Composable：`useStatusMaps.js`

**角色**：Status 常數與 CSS class 查表（純資料，無狀態）。

```js
export function useStatusMaps() {
  return {
    statusLabelMap: { added: 'C', modified: 'U', deleted: 'D', renamed: 'M', staged: 'A' },
    statusCssMap: { added: 'cv-status-added', modified: 'cv-status-modified', ... },
    statusActionLabel: { added: 'Created', modified: 'Updated', ... },
  }
}
```

> 更極致的做法：直接定義為 constants 而非 composable（因為無 reactive），但保持 composable 風格與專案一致。

---

#### 🧩 Composable：`useDragResize.js`（shared/）

**角色**：通用拖曳縮放邏輯，支援 horizontal / vertical 方向。

**匯出**：
```js
export function useDragResize(options: {
  direction: 'horizontal' | 'vertical',
  targetRef: Ref<HTMLElement | null>,
  handleRef: Ref<HTMLElement | null>,
  minSize: number,
  maxSize?: number,
  onResize?: (size: number) => void,
}) {
  return {
    isDragging: Ref<boolean>,
    onMouseDown(e: MouseEvent): void,
    // 內部自動綁定/解綁 document mousemove/mouseup
  }
}
```

**關鍵設計決策**：三個獨立的 mousemove handler 目前全在 `ChangesView` 的 `onGlobalMouseMove` 中手動判斷 `isDraggingCV` / `isDraggingH` / `isDraggingCommit`。`useDragResize` 應**自行管理 document-level 事件綁定**（onMounted/onUnmounted 在 composable 內部處理），做到「引入即用」，主組件不再需要知道 drag resize 細節。

---

## 四、重構優先順序

### Phase 1：無風險抽離（不改變行為）

| 順序 | 項目 | 理由 |
|------|------|------|
| **P1-1** | `useStatusMaps.js` | 純常數，零風險，立即減少 ~10 行 |
| **P1-2** | `useFileTree.js` | 純邏輯抽離，`buildFlatTree()` 無副作用，可立即寫 unit test |
| **P1-3** | `useDragResize.js` | 消除三份重複的 drag 邏輯，減少 ~60 行，提升複用性 |

### Phase 2：UI 元件拆分

| 順序 | 項目 | 理由 |
|------|------|------|
| **P2-1** | `ContextMenu.vue` | 最獨立的 UI 區塊，teleported，無外部依賴 |
| **P2-2** | `FileTreeItem.vue` | 消除 template 中 unstaged/staged 的 tree item 重複渲染 |
| **P2-3** | `FileTreePanel.vue` | 將 unstaged/staged 兩組 tree 封裝為可複用面板 |
| **P2-4** | `DiscardConfirmDialog.vue` | 獨立的 confirm dialog，teleported |

### Phase 3：功能模組拆分

| 順序 | 項目 | 理由 |
|------|------|------|
| **P3-1** | `useFileSelection.js` | 選取/勾選/stage-unstage 邏輯獨立，依賴 P1-2 |
| **P3-2** | `useAICommit.js` | AI 相關邏輯與 inline commit 解耦 |
| **P3-3** | `useInlineCommit.js` | Inline commit 表單邏輯 |
| **P3-4** | `InlineCommitPanel.vue` | 將 inline commit UI + 邏輯完整抽出 |
| **P3-5** | `useCommitDialog.js` | Modal commit dialog 邏輯 |
| **P3-6** | `CommitDialog.vue` | Modal commit dialog 組件 |
| **P3-7** | `useDiscard.js` | Discard 邏輯獨立 |
| **P3-8** | `ChangesView.vue` 瘦身 | 最終清理，主組件僅保留 layout 組合 |

---

## 五、重構注意事項

### 5.1 漸進式原則

- **每步重構後必須可運行**。不允許「大刀闊斧全改完再測」。
- 每個 phase 拆分後，在瀏覽器中手動驗證：檔案樹展開/折疊、stage/unstage、commit、discard、drag resize 皆正常。
- 建議搭配 git 在每個 phase 後 commit。

### 5.2 Provider/Inject 使用時機

若 props drilling 過深（例如 `statusMaps` 需從 `ChangesView` → `FileTreePanel` → `FileTreeItem` 三層傳遞），可用 `provide/inject` 簡化：

```js
// ChangesView.vue
const { statusLabelMap, statusCssMap } = useStatusMaps()
provide('statusMaps', { statusLabelMap, statusCssMap })

// FileTreeItem.vue
const { statusLabelMap, statusCssMap } = inject('statusMaps')
```

但優先使用 props，只有確實 drilling 超過 2 層時才考慮 provide/inject。

### 5.3 Store 依賴處理

多個 composable 依賴 `useStatusStore()`。有兩種策略：

**A. 在 composable 內部自行呼叫**（推薦）：
```js
export function useInlineCommit() {
  const statusStore = useStatusStore()
  // ...
}
```
優點：呼叫端簡潔。缺點：與 Pinia store 耦合。

**B. 由呼叫端傳入 store**：
```js
export function useInlineCommit(statusStore) {
  // ...
}
```
優點：可測試性更高（可 mock store）。缺點：呼叫端需傳遞。

**建議**：採用策略 B（dependency injection），便於 unit test 時使用 mock store。

### 5.4 `useDragResize` 事件綁定

目前三個 drag 共用 `onGlobalMouseMove` / `onGlobalMouseUp` 掛在 `ChangesView` 的 `onMounted` 上。拆分後，每個 `useDragResize` instance **應在 composable 內部自行管理 `onMounted`/`onUnmounted`** 來綁定/解綁 document 事件，以避免：

1. 主組件仍需知道有幾個 drag handle 在運作
2. 多個 drag handle 的狀態判斷互相干擾

```js
// useDragResize.js 內部
onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})
onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
```

由於 Vue 3 的 composable 可以在 `setup()` 階段使用 lifecycle hooks，這完全可行。

### 5.5 `checkedFiles` 的 reactive Set 問題

`reactive(new Set())` 在 Vue 3 中，`Set` 的操作（`.add()`, `.delete()`）不會自動觸發響應式更新。目前程式碼依賴直接操作 `checkedFiles.add()` / `checkedFiles.delete()`，但可能在某些情況下不觸發重新渲染。

**建議**：在 `useFileSelection` 中改用 `ref(new Set())` 並搭配手動觸發：

```js
const checkedFiles = ref(new Set())
function toggleCheck(file) {
  const newSet = new Set(checkedFiles.value)
  if (newSet.has(file.path)) newSet.delete(file.path)
  else newSet.add(file.path)
  checkedFiles.value = newSet
}
```

### 5.6 Template 重複程式碼

`visibleUnstagedItems` 和 `visibleStagedItems` 的 template 渲染幾乎完全一樣（僅 `group` 參數與 context menu 行為不同）。`FileTreePanel` 組件應以 `group` prop 區分行為，而非複製貼上。

### 5.7 風格一致性

- 繼續使用 `<script setup>` + Composition API
- Composable 命名保持 `use*` 前綴
- 保留 CSS class 命名慣例（`cv-*` 前綴）
- 不要在這個重構中引入 TypeScript（除非團隊已有遷移計畫）

### 5.8 測試建議

重構後，每個 composable 都可用 Vitest + vue-test-utils 獨立測試：

```js
// useFileTree.test.js
import { useFileTree } from './useFileTree'
import { ref } from 'vue'

test('builds flat tree from file paths', () => {
  const files = ref([
    { path: 'src/components/Foo.vue', status: 'modified' },
    { path: 'src/composables/bar.js', status: 'added' },
  ])
  const { flatItems } = useFileTree(files)
  expect(flatItems.value).toHaveLength(5) // 2 dirs + 2 files + ...
})
```

Component 測試可使用 `@vue/test-utils` 的 `mount` 搭配 mock store。

---

## 六、預期成果

| 指標 | 重構前 | 重構後 |
|------|--------|--------|
| ChangesView.vue 行數 | ~700 | ~80 |
| 檔案數量 | 1 | ~15（含 composables） |
| 可單元測試的邏輯單元 | 0 | ~10 |
| 可複用的 drag resize | 0（重複 3 次） | 1 個 composable |
| Template 重複區塊 | unstaged/staged 各一份 | 共用 FileTreePanel × 2 |

---

## 七、附錄：現有依賴關係圖

```
ChangesView.vue
├── imports
│   ├── useStatusStore()     → ../stores/status.js
│   ├── useApi()             → ../composables/useApi.js
│   ├── useToast()           → ../composables/useToast.js
│   └── DiffViewer.vue       → ./DiffViewer.vue
│
├── consumed by
│   └── App.vue              → v-if="uiStore.currentView === 'changes'"
│
└── API endpoints used
    ├── GET  /ai/profiles           (loadSavedPrompt)
    └── POST /ai-commit-generate    (generateAIMessage)
```

---

> **本文檔為重構規劃，實際執行時請依 Phase 順序逐步進行，每階段完成後在瀏覽器中驗證功能正常再進入下一階段。**
