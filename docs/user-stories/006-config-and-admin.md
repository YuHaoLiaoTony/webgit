# Config & Admin：設定與管理

<a id="15-管理-git-config"></a>
## US-15：管理 Git Config

**As a** Developer
**I want** 檢視與修改 Git 設定（user.name、user.email 等）
**So that** 我能確保 commit 的作者資訊正確

### 驗收條件

```
Given 我在 Config 頁面
When 頁面載入完成
Then 顯示目前的 user.name、user.email、init.defaultbranch
```

```
Given 我修改 user.name 或 user.email
When 我點擊 Save
Then 系統執行 git config 寫入新值
And 頁面顯示更新後的設定值
```

```
Given 我嘗試修改不允許的設定鍵
When 我提交修改
Then 拒絕請求（基於 whitelist 驗證）
```

### 優先級: Should
### 複雜度: S

---

<a id="16-cli-啟動與選項"></a>
## US-16：CLI 啟動與選項

**As a** DevOps
**I want** 透過 CLI 在任意 Git repository 目錄啟動 WebGit 伺服器
**So that** 我能快速開啟一個 Git 網頁介面而不需安裝其他工具

### 驗收條件

```
Given 我在任何 Git repository 目錄
When 我執行 npx @rodriguezst_/webgit
Then 伺服器在 localhost:3000 啟動
And 瀏覽器顯示該 repository 的 WebGit 介面
```

```
Given 我想用自訂 port
When 我執行 webgit --port 8080
Then 伺服器在 localhost:8080 啟動
```

```
Given 我想指定 repository 路徑
When 我執行 webgit --dir /path/to/repo
Then 伺服器顯示該 repository 的內容
```

```
Given 我想啟動後自動開啟瀏覽器
When 我執行 webgit --open
Then 伺服器啟動後自動開啟瀏覽器到對應 URL
```

```
Given 啟動的目錄不包含 .git
When 我執行 webgit
Then 顯示「Not a git repository」錯誤並結束
```

### 優先級: Must
### 複雜度: S

---

<a id="17-安全性防護"></a>
## US-17：安全性防護

**As a** DevOps
**I want** WebGit 的所有寫入操作都需要 CSRF token 驗證
**So that** 防止跨站請求偽造攻擊

### 驗收條件

```
Given 前端發起寫入請求（stage、commit、push 等）
When 請求不包含 X-CSRF-Token header
Then 回傳 403 並拒絕操作
```

```
Given 前端發起寫入請求
When 請求包含無效的 CSRF token
Then 回傳 403 並拒絕操作
```

```
Given 前端發起 GET 請求（讀取操作）
When 請求不包含 CSRF token
Then 正常回應（不阻擋讀取）
```

### 邊界案例

- CSRF token 為 session 層級，每次啟動新 server 產生新 token
- Error message 不洩漏檔案路徑

### 優先級: Must
### 複雜度: S

---

<a id="18-健康檢查"></a>
## US-18：健康檢查

**As a** DevOps
**I want** 存取 `/health` 端點確認伺服器狀態
**So that** 我能整合到監控系統

### 驗收條件

```
Given WebGit 正在執行
When 我 GET /health
Then 回傳 JSON { status: "ok", timestamp, uptime }
And HTTP status 200
```

### 優先級: Should
### 複雜度: XS
