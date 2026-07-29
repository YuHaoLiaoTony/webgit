@webgit @p0
Feature: Commit History
  作為一個 Developer 與 Reviewer
  我希望瀏覽 commit 歷史並檢視詳細內容
  以便我能追蹤專案變更歷程並審閱程式碼

  @smoke @happy-path @p0
  Scenario: 瀏覽 commit 列表
    Given 我切換到 Commit History 頁面
    When 頁面載入完成
    Then 顯示 commit 列表，包含 author、日期、message
    And 依時間倒序排列（最新的在最上面）

  @edge-case @p1
  Scenario: 超過 50 個 commits 時自動載入更多
    Given 我有超過 50 個 commits
    When 我滾動到列表底部
    Then 自動載入更多 commits（Infinite scroll 或 Load More 按鈕）

  @happy-path @p0
  Scenario: merge commit 顯示合併資訊
    Given commit 列表中有 merge commit
    When 顯示在歷史列表中
    Then 顯示 merge 訊息與 parent 資訊

  ---

  @smoke @happy-path @p0
  Scenario: 檢視 commit 詳細內容
    Given 我在 Commit History 頁面
    When 我點擊一個 commit
    Then 詳細面板打開
    And 顯示 commit hash、author、date、message
    And 顯示該 commit 所有變更檔案的 diff
    And 顯示每個檔案的增減行數統計

  @happy-path @p0
  Scenario: 多檔案 commit 可摺疊展開
    Given commit 包含多個檔案變更
    When 我檢視詳細內容
    Then 檔案可摺疊與展開
