@webgit @p1
Feature: Configuration & Administration
  作為一個 Developer 與 DevOps
  我希望管理 Git 設定、透過 CLI 啟動服務、確保安全性以及監控服務狀態
  以便我能正確配置環境、安全操作並監控系統

  @smoke @happy-path @p1
  Scenario: 檢視 Git 設定
    Given 我在 Config 頁面
    When 頁面載入完成
    Then 顯示目前的 user.name、user.email、init.defaultbranch

  @happy-path @p1
  Scenario: 修改並儲存 Git 設定
    Given 我在 Config 頁面
    When 我修改 user.name 或 user.email
    And 我點擊 Save
    Then 系統執行 git config 寫入新值
    And 頁面顯示更新後的設定值

  @error-handling @p1
  Scenario: 修改不允許的設定鍵被拒絕
    Given 我在 Config 頁面
    When 我嘗試修改不允許的設定鍵
    And 我提交修改
    Then 請求被拒絕（基於 whitelist 驗證）

  ---

  @smoke @happy-path @p0
  Scenario: CLI 預設啟動
    Given 我在任何 Git repository 目錄
    When 我執行 npx @rodriguezst_/webgit
    Then 伺服器在 localhost:3000 啟動
    And 瀏覽器顯示該 repository 的 WebGit 介面

  @happy-path @p0
  Scenario: CLI 自訂 port
    Given 我想用自訂 port
    When 我執行 webgit --port 8080
    Then 伺服器在 localhost:8080 啟動

  @happy-path @p0
  Scenario: CLI 指定 repository 路徑
    Given 我想指定 repository 路徑
    When 我執行 webgit --dir /path/to/repo
    Then 伺服器顯示該 repository 的內容

  @happy-path @p0
  Scenario: CLI 啟動後自動開啟瀏覽器
    Given 我想啟動後自動開啟瀏覽器
    When 我執行 webgit --open
    Then 伺服器啟動後自動開啟瀏覽器到對應 URL

  @error-handling @p0
  Scenario: 在非 Git 目錄啟動 CLI
    Given 啟動的目錄不包含 .git
    When 我執行 webgit
    Then 顯示「Not a git repository」錯誤並結束

  ---

  @smoke @error-handling @p0
  Scenario: 寫入請求缺少 CSRF token
    Given 前端發起寫入請求（stage、commit、push 等）
    When 請求不包含 X-CSRF-Token header
    Then 回傳 403 並拒絕操作

  @error-handling @p0
  Scenario: 寫入請求帶有無效的 CSRF token
    Given 前端發起寫入請求
    When 請求包含無效的 CSRF token
    Then 回傳 403 並拒絕操作

  @business-rules @p0
  Scenario: 讀取請求不需要 CSRF token
    Given 前端發起 GET 請求（讀取操作）
    When 請求不包含 CSRF token
    Then 正常回應（不阻擋讀取）

  ---

  @smoke @happy-path @p1
  Scenario: 健康檢查端點正常回應
    Given WebGit 正在執行
    When 我 GET /health
    Then 回傳 JSON { status: "ok", timestamp, uptime }
    And HTTP status 200
