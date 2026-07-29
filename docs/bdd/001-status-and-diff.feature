@webgit @p0
Feature: Repository Status & Diff
  作為一個 Developer
  我希望在瀏覽器中查看 repository 的完整狀態與檔案差異
  以便我能快速掌握工作目錄狀況並確認變更細節

  @smoke @happy-path @p0
  Scenario: 顯示 repository 完整狀態
    Given 我開啟 WebGit 首頁
    When 頁面載入完成
    Then 顯示目前所在分支名稱
    And 顯示 modified、added、deleted、untracked、staged、renamed、conflicted 的檔案列表
    And 顯示與 upstream 的 ahead/behind 數量

  @smoke @happy-path @p0
  Scenario: 工作目錄乾淨時顯示提示
    Given 目前沒有未提交的變更
    When 頁面載入完成
    Then 顯示「working tree clean」的提示

  @edge-case @p0
  Scenario: 沒有 upstream 時隱藏 ahead/behind 資訊
    Given repository 沒有 upstream 分支
    When 頁面載入完成
    Then 不顯示 ahead/behind 資訊

  ---

  @smoke @happy-path @p0
  Scenario: 檢視已修改檔案的 diff
    Given 檔案列表中有一個 modified 檔案
    When 我點擊該檔案
    Then Diff 面板打開
    And 顯示該檔案的 side-by-side 或 unified diff
    And 變更行有語法高亮

  @happy-path @p0
  Scenario: 檢視已暫存檔案的 staged diff
    Given 檔案列表中有一個 staged 檔案
    When 我勾選「Show Staged Diff」
    Then 顯示 staged 版本的 diff

  @happy-path @p0
  Scenario: 檢視 untracked 檔案的完整內容
    Given 檔案列表中有一個 untracked 檔案
    When 我點擊該檔案
    Then Diff 面板顯示該檔案的完整內容（無 diff 標記）

  @edge-case @p0
  Scenario: 二進位檔案不顯示 diff
    Given 檔案列表中有一個二進位檔案
    When 我點擊該檔案
    Then 顯示「Binary file not shown」

  @edge-case @p0
  Scenario: 空檔案或新檔案正確顯示
    Given 檔案列表中有一個空檔案或新檔案
    When 我點擊該檔案
    Then 正確顯示檔案內容
