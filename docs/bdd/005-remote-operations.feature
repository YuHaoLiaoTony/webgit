@webgit @p0
Feature: Remote Operations
  作為一個 Developer
  我希望從 remote repository fetch、pull 與 push
  以便我能與團隊同步程式碼變更

  @smoke @happy-path @p0
  Scenario: 從 remote fetch
    Given 我有設定的 remote
    When 我點擊 Fetch
    Then 系統執行 git fetch
    And 顯示 fetch 結果（更新了哪些 references）
    And 頁面上的 ahead/behind 資訊更新

  @error-handling @p0
  Scenario: 沒有 remote 時無法 fetch
    Given 沒有設定 remote
    When 我點擊 Fetch
    Then 顯示「No remote configured」的提示

  ---

  @smoke @happy-path @p0
  Scenario: 從 remote pull（預設）
    Given 我有 upstream 分支
    When 我點擊 Pull
    Then 系統執行 git pull
    And 顯示 pull 結果（fast-forward 或 merge commit 資訊）

  @happy-path @p0
  Scenario: 從 remote pull 並使用 rebase
    Given 我有 upstream 分支
    When 我勾選 Rebase 選項並點擊 Pull
    Then 系統執行 git pull --rebase

  @error-handling @p0
  Scenario: pull 時發生衝突
    Given 本地有未提交的變更且與遠端衝突
    When 我點擊 Pull
    Then 顯示衝突錯誤訊息

  ---

  @smoke @happy-path @p0
  Scenario: 推送 commits 到 remote
    Given 本地有 commits 領先 upstream
    When 我點擊 Push
    Then 系統執行 git push
    And 顯示 push 結果

  @error-handling @p0
  Scenario: push 被拒絕因落後 upstream
    Given 本地落後 upstream
    When 我點擊 Push
    Then 顯示 rejection 訊息
    And 提示建議先 pull

  @business-rules @p0
  Scenario: force push 需要確認
    Given 本地有 commits 領先 upstream
    When 我勾選 Force Push
    And 我點擊 Push
    Then 系統顯示確認對話框（因 force push 會覆蓋遠端歷史）
    And 確認後執行 git push --force

  @happy-path @p0
  Scenario: 首次推送設定 upstream
    Given 目前分支沒有 upstream
    When 我點擊 Push
    Then 系統執行 git push --set-upstream origin <branch>
