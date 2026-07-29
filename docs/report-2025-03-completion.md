# WebGit 專案功能確認與補全報告

> 產出日期：2025-03
> 範圍：docs/user-stories/ 對照 backend / Legacy UI / Vue UI 實作狀態

---

## 一、專案概覽

**WebGit** — 輕量級 Git Web Viewer，可在任意 Git repository 目錄啟動，提供完整的 Git 管理網頁介面。

### 架構

| 層級 | 技術 | 路徑 |
|------|------|------|
| Backend | Node.js + Express + simple-git | `src/server.js`, `src/git.js` |
| Frontend (Legacy) | Vanilla JS | `public/legacy/` |
| Frontend (Vue UI) | Vue 3 + Pinia + Vite | `ui/src/` |
| CLI | Commander | `bin/webgit.js` |
| User Stories | Markdown | `docs/user-stories/` |
| BDD | Gherkin Feature + spec | `docs/bdd/` |

---

## 二、User Stories 實作對照表

| # | Story | 角色 | 優先級 | 複雜度 | Backend API | Legacy UI | Vue UI | 備註 |
|---|-------|------|--------|--------|:-----------:|:---------:|:------:|------|
| 1 | 查看 Repository 狀態 | Developer | Must | S | ✅ | ✅ | ✅ | 已修復 mock 問題 |
| 2 | 檢視 Diff | Developer | Must | M | ✅ | ✅ | ✅ | inline / side-by-side |
| 3 | 暫存 (Stage) | Developer | Must | S | ✅ | ✅ | ✅ | 已修復 mock 問題 |
| 4 | 取消暫存 (Unstage) | Developer | Must | S | ✅ | ✅ | ✅ | 已修復 mock 問題 |
| 5 | 建立 Commit | Developer | Must | M | ✅ | ✅ | ✅ | **本次新增** |
| 6 | 捨棄變更 (Discard) | Developer | Must | M | ✅ | ✅ | ✅ | **本次新增** |
| 7 | 瀏覽 Commit 歷史 | Developer | Must | M | ✅ | ✅ | ✅ | Infinite scroll 待補 |
| 8 | 檢視 Commit 詳細 | Reviewer | Must | S | ✅ | ✅ | ✅ | |
| 9 | 建立分支 | Developer | Must | S | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 10 | 切換分支 | Developer | Must | S | ✅ | ✅ | ✅ | |
| 11 | 刪除分支 | Developer | Must | S | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 12 | 從 Remote Fetch | Developer | Must | M | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 13 | 從 Remote Pull | Developer | Must | M | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 14 | 推送至 Remote Push | Developer | Must | M | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 15 | 管理 Git Config | Developer | Should | S | ✅ | ✅ | 🔴 | Vue UI 待補 |
| 16 | CLI 啟動與選項 | DevOps | Must | S | ✅ | ✅ | ✅ | |
| 17 | 安全性防護 | DevOps | Must | S | ✅ | ✅ | ✅ | CSRF token |
| 18 | 健康檢查 | DevOps | Should | XS | ✅ | ✅ | ✅ | `/health` |

**圖例**：✅ 完整實作　⚠️ 部分實作　🔴 尚未實作

---

## 三、本次修復內容

### 修復檔案

**`ui/src/components/ChangesView.vue`**

### 發現的問題

元件內使用了三個**未定義的變數**：

| 變數名稱 | 使用位置 | 問題 |
|----------|---------|------|
| `mockUnstaged` | computed `unstagedFlatItems`、`stageSelected()`、`stageAll()` | 未定義，`buildFlatTree` 收到 undefined |
| `mockStaged` | computed `stagedFlatItems`、`unstageSelected()`、template badge | 未定義，同上 |
| `allMockFiles` | template toolbar badge | 未定義，顯示為空 |

### 修復項目

#### 1️⃣ 改用真實 Store 資料

將所有 mock 變數取代為 `statusStore` 的 computed getters：

- `mockUnstaged` → `statusStore.unstagedFiles`
- `mockStaged` → `statusStore.stagedFiles`
- `allMockFiles` → 自訂 computed `allChangedFiles`

**相關 store getters**（定義於 `ui/src/stores/status.js`）：
- `unstagedFiles` — 回傳 `{ path, status }[]`，包含 modified/added/deleted/untracked
- `stagedFiles` — 回傳 `{ path, status }[]`，包含 staged/renamed/added/deleted/modified
- `totalChanges` — 計算所有變更檔案總數

#### 2️⃣ 加入 onMounted 初始化資料

```js
onMounted(() => {
  // ... existing resizer handlers ...
  statusStore.fetchStatus() // ← 新增：從 API 載入真實資料
})
```

#### 3️⃣ 新增 Commit 對話框 (US-05)

- 點擊工具列 **Commit…** 彈出 modal
- 顯示已暫存檔案列表
- Commit message textarea（支援多行）
- 驗證：message 不可為空
- `Ctrl+Enter` / `Cmd+Enter` 快捷鍵送出
- `Escape` 關閉
- 錯誤提示（API error、空訊息）

#### 4️⃣ 新增 Discard 功能 (US-06)

- 工具列新增 **Discard** 按鈕（紅色 danger 樣式）
- 點擊後彈出確認對話框
- 提示操作不可逆
- 顯示將被捨棄的檔案列表（有選取時）或提示「全部未暫存變更」
- 支援 `Escape` 關閉

#### 5️⃣ 新增對話框 CSS 樣式

- `.commit-overlay` — 半透明黑色背景遮罩
- `.commit-dialog` — 白色圓角對話框，480px 寬度
- `.commit-dialog-header` / `.commit-dialog-body` / `.commit-dialog-footer`
- `.commit-message-input` — 聚焦時藍色外框
- `.commit-error` — 紅色錯誤提示區塊
- `.changes-view-btn.danger` — 紅色危險按鈕樣式

---

## 四、Vue UI 仍待補強功能

| # | 功能 | 對應 US | 說明 | 建議優先級 |
|---|------|---------|------|:----------:|
| 1 | 建立分支 UI | US-09 | 需要 modal 表單輸入分支名稱 + 可選 checkout | Medium |
| 2 | 刪除分支 UI | US-11 | 分支列表需加入刪除按鈕 + 確認對話框 | Medium |
| 3 | Remote Fetch 操作 | US-12 | 工具列 Fetch 按鈕需串接 API + 顯示結果 | Medium |
| 4 | Remote Pull 操作 | US-13 | 工具列 Pull 按鈕需串接 API（含 --rebase 選項） | Medium |
| 5 | Remote Push 操作 | US-14 | 工具列 Push 按鈕需串接 API（含 --force 選項） | Medium |
| 6 | Config 設定頁 | US-15 | 需要獨立頁面顯示/修改 user.name, user.email 等 | Low |
| 7 | Checkbox 選取檔案 | US-03/04 | `toggleCheck` 已定義但 template 未加入 checkbox | Low |
| 8 | Infinite Scroll | US-07 | commit 歷史超過 50 筆時自動載入更多 | Low |
| 9 | Commit 後自動切到歷史 | US-05 | commit 成功後可選切換到 commits view | Low |
| 10 | Loading / Error 強化 | 所有 | 統一處理 loading spinner 與 error toast | Low |

---

## 五、檔案結構摘要

```
/
├── bin/webgit.js                    # CLI entry point
├── src/
│   ├── server.js                    # Express server + API routes
│   └── git.js                       # Git operations (simple-git)
├── public/
│   ├── index.html                   # Vue UI entry
│   ├── assets/                      # Built Vue assets
│   └── legacy/                      # Legacy Vanilla JS UI
├── ui/
│   ├── src/
│   │   ├── App.vue                  # Root component
│   │   ├── main.js                  # Vue entry
│   │   ├── stores/
│   │   │   ├── status.js            # Status store (API bindings)
│   │   │   └── ui.js                # UI state store
│   │   ├── composables/
│   │   │   ├── useApi.js            # API composable (CSRF)
│   │   │   ├── useTheme.js          # Theme composable
│   │   │   └── useToast.js          # Toast notifications
│   │   └── components/
│   │       ├── ChangesView.vue      # Changes + Staging view (已修復)
│   │       ├── CommitGraph.vue      # Commit history table
│   │       ├── DetailsPanel.vue     # Commit detail panel
│   │       ├── DiffViewer.vue       # Diff viewer (inline + side-by-side)
│   │       ├── Sidebar.vue          # Sidebar (branches, navigation)
│   │       ├── EmptyState.vue       # Empty state placeholder
│   │       └── ToastNotification.vue# Toast notifications
│   └── vite.config.js
└── docs/
    ├── user-stories/                # User stories (18 stories)
    ├── bdd/                         # BDD feature files + specs
    └── report-2025-03-completion.md # This report
```
