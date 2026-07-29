@webgit @p0
Feature: Branch Management
  作為一個 Developer
  我希望能夠建立、切換與刪除分支
  以便我能隔離開發新功能並保持分支列表簡潔

  @smoke @happy-path @p0
  Scenario: 建立新分支
    Given 我在分支管理頁面
    When 我輸入新分支名稱並點擊 Create
    Then 系統執行 git branch <name>
    And 新分支出現在分支列表中

  @happy-path @p0
  Scenario: 建立分支並同時切換
    Given 我在分支管理頁面
    When 我輸入新分支名稱
    And 我勾選「同時切換到新分支」
    And 我點擊 Create
    Then 系統建立分支並切換過去

  @error-handling @p0
  Scenario: 建立已存在的分支名稱
    Given 分支名稱已存在
    When 我嘗試建立相同名稱的分支
    Then 顯示「Branch already exists」的錯誤

  @edge-case @p1
  Scenario: 分支名稱包含特殊字元
    Given 我在分支管理頁面
    When 我輸入包含斜線的名稱例如「feature/login」
    And 我點擊 Create
    Then 系統正確建立該分支

  @error-handling @p0
  Scenario: 分支名稱為空或過長
    Given 我在分支管理頁面
    When 我提交空白的或過長的分支名稱
    Then 系統拒絕建立

  ---

  @smoke @happy-path @p0
  Scenario: 切換到另一個分支
    Given 分支列表中有多個分支
    When 我選擇一個分支並點擊 Checkout
    Then 系統執行 git checkout <branch>
    And 頁面狀態更新為該分支的狀態

  @error-handling @p0
  Scenario: 有未提交變更時切換分支顯示警告
    Given 目前有未暫存或未提交的變更
    When 我嘗試切換分支
    Then 顯示警告提示有未提交變更
    And 允許我取消操作

  ---

  @smoke @happy-path @p0
  Scenario: 刪除已合併的分支
    Given 我檢視分支列表
    When 我對一個已合併的分支點擊 Delete
    Then 系統執行 git branch -d <name>
    And 該分支從列表中移除

  @error-handling @p0
  Scenario: 刪除未合併的分支
    Given 分支尚未合併
    When 我嘗試刪除
    Then 顯示「Branch not fully merged」的錯誤提示

  @error-handling @p0
  Scenario: 刪除目前所在的分支
    Given 我正處於要刪除的分支上
    When 我嘗試刪除
    Then 顯示「Cannot delete current branch」的錯誤提示
