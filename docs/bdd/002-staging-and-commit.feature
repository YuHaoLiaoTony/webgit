@webgit @p0
Feature: Staging & Commit
  作為一個 Developer
  我希望能夠暫存檔案、取消暫存、提交變更以及捨棄變更
  以便我能分批管理變更並記錄到 Git 歷史

  @smoke @happy-path @p0
  Scenario: 暫存單一檔案
    Given 列表中有 modified 或 untracked 檔案
    When 我勾選該檔案並點擊 Stage
    Then 檔案從 unstaged 區域移到 staged 區域
    And 狀態顯示已暫存

  @smoke @happy-path @p0
  Scenario: 一次暫存所有檔案
    Given 列表中有 modified 與 untracked 檔案
    When 我未選取任何檔案並點擊 Stage All
    Then 所有 modified 與 untracked 檔案都被暫存

  @edge-case @p1
  Scenario: 已暫存相同檔名但內容不同時正確覆蓋
    Given 我已暫存一個檔案
    And 該檔案內容有新的變更
    When 我再次暫存該檔案
    Then 暫存區的內容被正確覆蓋

  @edge-case @p1
  Scenario: 大量檔案暫存不逾時
    Given 列表中有 100 個以上的 modified 或 untracked 檔案
    When 我點擊 Stage All
    Then 操作在合理時間內完成
    And 所有檔案都被暫存

  ---

  @smoke @happy-path @p0
  Scenario: 取消暫存單一檔案
    Given 列表中有 staged 檔案
    When 我勾選該檔案並點擊 Unstage
    Then 檔案從 staged 區域移回 unstaged 區域
    And 檔案的實際變更內容不被影響

  @happy-path @p0
  Scenario: 一次取消暫存所有檔案
    Given 列表中有 staged 檔案
    When 我未選取任何檔案並點擊 Unstage All
    Then 所有 staged 檔案都被取消暫存

  ---

  @smoke @happy-path @p0
  Scenario: 建立有效的 commit
    Given 已有檔案被暫存
    When 我輸入 commit message 並點擊 Commit
    Then 系統執行 git commit
    And 頁面重新整理顯示 clean status
    And commit 出現在 commit 歷史中

  @error-handling @p0
  Scenario: 沒有檔案被暫存時拒絕 commit
    Given 沒有檔案被暫存
    When 我點擊 Commit
    Then 顯示「Nothing to commit」的錯誤提示

  @error-handling @p0
  Scenario: 空的 commit message 被拒絕
    Given 已有檔案被暫存
    When commit message 為空且我點擊 Commit
    Then 拒絕提交並顯示「Commit message is required」的提示

  @edge-case @p1
  Scenario: commit message 包含特殊字元
    Given 已有檔案被暫存
    When 我輸入包含 emoji 或 non-ASCII 字元的 commit message
    And 我點擊 Commit
    Then 系統正確處理並建立 commit

  @edge-case @p1
  Scenario: 長 commit message 正確儲存
    Given 已有檔案被暫存
    When 我輸入超過 200 字的 commit message
    And 我點擊 Commit
    Then 系統正確儲存多行 commit message

  @edge-case @p1
  Scenario: Ctrl+Enter 快捷鍵觸發 commit
    Given 已有檔案被暫存
    And 我已輸入 commit message
    When 我按下 Ctrl+Enter
    Then 系統執行 git commit

  ---

  @smoke @happy-path @p0
  Scenario: 捨棄 modified 檔案的變更
    Given 有 modified 檔案
    When 我選取該檔案並點擊 Discard
    Then 檔案內容回復到 HEAD 的狀態
    And 檔案不再出現在變更列表中

  @happy-path @p0
  Scenario: 捨棄 untracked 檔案
    Given 有 untracked 檔案
    When 我選取該檔案並點擊 Discard
    Then 該檔案被刪除
    And 不再出現在 untracked 列表中

  @business-rules @p0
  Scenario: Discard 前顯示確認對話框
    Given 有 modified 或 untracked 檔案
    When 我點擊 Discard
    Then 出現確認對話框防止誤操作

  @edge-case @p1
  Scenario: 同時 discard tracked 與 untracked 檔案
    Given 列表中有 modified 與 untracked 檔案
    When 我選取所有檔案並點擊 Discard
    Then 所有已選取的檔案都被捨棄
