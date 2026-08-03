# 開發方案決策文件：新增 Remote（US-19）

## 📌 決策摘要

| 項目 | 內容 |
|------|------|
| **最終方案** | 方案 B：元件化（AddRemoteDialog 獨立元件 + useLongPress composable + `POST /api/remotes`） |
| **決策日期** | 2026-08-02 |
| **參與討論** | Developer（webgit 使用者代表） |
| **共識程度** | ✅ 團隊一致通過（4 項決策全部採建議方案） |

| 決策點 | 結論 |
|--------|------|
| 驗證策略 | 前後端雙層（前端預檢重複名稱/格式 + 後端 git 錯誤兜底） |
| 對話框形式 | 自訂 Vue 對話框（沿用 NewBranchDialog 模式） |
| 測試範圍 | 一併產出 Playwright spec.js（與 001–006 一致） |
| 實作架構 | 方案 B：元件化 |

---

## 1. 需求回顧

**US-19**：開發者在左側 Remotes 區域以滑鼠右鍵（桌機）或長按（手機）叫出選單，選擇「Add New Remote」輸入名稱與 URL 新增遠端，無需繞路即可立即使用。

- **Must**：選單觸發（右鍵/長按）→ 「Add New Remote」→ 名稱+URL 對話框 → 後端建立 → 列表即時更新
- **整合點**：`Sidebar.vue`、`src/git.js`（simple-git）、`src/server.js`、`useApi.js`（CSRF 已有）
- **限制**：手機長按 ~500ms 不誤觸捲動、375px 寬可用、多 repo 只作用於 active repo
- **已排除**：個別 remote 項目的 rename/delete 選單（後續擴充）

---

## 2. 候選方案

### 方案 A：內嵌實作（Sidebar 自含）
右鍵/長按 handler、選單、API 呼叫全部寫在 `Sidebar.vue` 內。
- 優：檔案最少、開發最快
- 缺：Sidebar 變胖、長按邏輯無法重用、難以單獨測試

### 方案 B：元件化 ✅ 已選
- 新增 `AddRemoteDialog.vue`，沿用 `NewBranchDialog` 模式（`props: show`、`emit: close/created`、`canCreate` computed、`creating` loading）
- 長按/右鍵邏輯抽成 `useLongPress` composable；選單小段內嵌 Sidebar（本 story 只有一項）
- 後端新增 `POST /api/remotes`（simple-git 內建 `addRemote()`，沿用 csrfProtection + getGitAPI 模式）
- 優：可單獨測試、樣式一致、Sidebar 保持乾淨
- 缺：多 1–2 個檔案

### 方案 C：通用 Context Menu 框架
建通用 context-menu 元件 + 指令式選單管理，為未來 rename/delete 鋪路。
- 優：擴充性最好
- 缺：YAGNI — rename/delete 已排除在範圍外，抽象現在用不到

---

## 3. 權衡評估

| 維度 | A 內嵌 | B 元件化 | C 通用框架 |
|------|:---:|:---:|:---:|
| 🎯 需求符合度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| ⚡ 開發速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 🔧 維護成本 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 📈 擴充性 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 👥 團隊熟悉度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 💰 基礎設施成本 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 🔒 穩定性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**關鍵取捨**：
1. **擴充性 vs 當下簡單**：rename/delete 已排除，C 的抽象現在用不到 → 傾向 B。
2. **測試難度**：B 的 Playwright spec.js 可直接驅動 dialog 行為，比 A 容易。
3. **需求落差（Spike）**：左側 Remotes 區塊顯示的是 remote-tracking branches（`git branch -r`），不是設定的 remote 名稱。新增的 remote 尚未 fetch 時其分支不會出現 → 「新增後立即出現」的呈現方式需先定義。

---

## 4. 決策理由

### 為什麼選擇方案 B
1. **符合團隊既有慣例** — NewBranchDialog / NewTagDialog 模式可直接沿用，開發速度快、樣式一致
2. **可測試性** — dialog 為獨立元件，Playwright 可直接驅動；長按邏輯抽 composable 後可單元測試
3. **不過度設計** — 元件化已為未來 rename/delete 保留擴充空間，但不預先建抽象

### 為什麼放棄其他方案
- **方案 A**：Sidebar 變胖、長按邏輯無法重用、難以單獨測試，不利於既有 Playwright 測試模式
- **方案 C**：YAGNI — US-19 邊界案例已明說 rename/delete 屬後續擴充，通用選單框架現在用不到

---

## 5. 行動計畫

### 技術棧
| 層級 | 技術 | 版本 | 備註 |
|------|------|------|------|
| 前端 | Vue 3 | 3.5.40 | Composition API（既有） |
| 前端 | Vite | — | 既有 |
| 後端 | Node.js + Express | 4.18.2 | ESM（既有） |
| Git 操作 | simple-git | 3.22.0 | 內建 `addRemote(name, repo)` |
| 測試 | Playwright | — | `npm test`（既有） |

### 架構概覽
```
┌──────────────────────────┐   ┌──────────────────────────┐
│ Sidebar.vue              │   │ server.js                │
│  @contextmenu / 長按      │──▶│ POST /api/remotes        │──▶ simple-git
│  ├─ Remotes 選單          │   │ (csrfProtection)         │    addRemote()
│  └─ AddRemoteDialog.vue   │◀──│ gitAPI.addRemote()       │
└────────────┬─────────────┘   └──────────────────────────┘
             │ emit created → 重新載入 /branches + toast
             └───────────────────────────────────────────
```

### 檔案變動
| 檔案 | 動作 | 內容 |
|------|------|------|
| `ui/src/components/AddRemoteDialog.vue` | 新增 | 名稱+URL 輸入、前端預檢（重複/格式）、`canCreate`、`creating` loading、錯誤顯示 |
| `ui/src/composables/useLongPress.js` | 新增 | ~500ms 長按偵測、位移閾值避免捲動誤觸、釋放時清除 |
| `ui/src/components/Sidebar.vue` | 修改 | Remotes 區塊加 `@contextmenu` + 長按、內嵌選單、開啟 dialog |
| `src/git.js` | 修改 | 新增 `addRemote({ name, url })`（含名稱非空驗證） |
| `src/server.js` | 修改 | 新增 `POST /api/remotes`（csrfProtection + sanitizeError） |
| `docs/bdd/007-add-remote.spec.js` | 新增 | Playwright 測試，對應 feature |
| `docs/bdd/007-add-remote.feature` | 既有 | 9 個 Scenario |

### 初期任務
| 優先級 | 任務 | 預估 | 依賴 |
|--------|------|------|------|
| P0 | Spike：Remotes 區塊呈現方式（remote 名稱 vs remote-tracking branches） | 0.5d | — |
| P0 | 後端：`git.js addRemote()` + `POST /api/remotes` | 0.5d | — |
| P0 | 前端：`AddRemoteDialog.vue`（雙層驗證） | 1d | #2 |
| P0 | 前端：Sidebar 右鍵/長按觸發 + 選單 + 列表更新 + toast | 1d | #3 |
| P1 | Playwright `007-add-remote.spec.js` | 1d | #4 |
| P1 | 手機實測（長按 500ms、375px、捲動不誤觸、多 repo） | 0.5d | #4 |

### 有待驗證的項目 (Spike)
- **Remotes 區塊資料落差**：目前左側顯示 `git branch -r` 的 remote-tracking branches；新增 remote 未 fetch 時分支不會出現。需 Spike 決定：
  - (a) Remotes 區塊改顯示 `/api/remotes` 的設定 remote 名稱（可再展開分支）
  - (b) 維持 branch 列表，新增成功後僅 toast 提示 + 觸發一次 fetch
  - 決定後需同步調整 US-19 驗收條件 #3 與 BDD Scenario「成功新增 remote」

---

## 6. 風險登錄

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| 左側列表「立即出現」與實際資料落差 | 高 | 中 | Spike 決定呈現方式，調整 AC 與 BDD |
| 手機長按與捲動衝突（誤觸選單） | 中 | 高 | useLongPress 位移閾值 + 實機測試 |
| git remote add 失敗情境多（URL 無效、網路、權限） | 中 | 低 | 後端 sanitizeError + 前端顯示錯誤並維持列表不變 |
| 安全性（CSRF、名稱注入） | 低 | 高 | 沿用既有 csrfProtection；名稱/URL 以字串參數傳入 simple-git，不拼接 shell |

---

## 📝 決策後續

- 本文件已存至 `docs/tech-decisions/tech-decision-新增Remote-2026-08-02.md`，應納入版本控制
- Spike 結果需回饋更新 US-19 AC #3 與 `007-add-remote.feature`
- 建議 1 個月後回顧決策正確性；若實作中發現方案 B 的假設不成立（如選單未來需要多項），可升級為方案 C 的通用框架
