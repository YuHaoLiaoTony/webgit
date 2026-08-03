@webgit @p0
Feature: Add Remote
  作為一個 Developer
  我希望在左側 Remotes 區域用滑鼠右鍵（桌機）或長按（手機）叫出選單，選擇「Add New Remote」輸入名稱與 URL 新增遠端
  以便我能快速把新的 remote 加入目前 repo 並立即使用

  @smoke @happy-path @p0
  Scenario: 右鍵開啟 Remotes 選單（桌機）
    Given 左側 Sidebar 的 Remotes 區域可見
    When 我對 Remotes 標題列（或區塊空白處）按滑鼠右鍵
    Then 跳出 context menu
    And 選單包含「Add New Remote」選項

  @happy-path @p0
  Scenario: 長按開啟 Remotes 選單（手機）
    Given 我在手機瀏覽器開啟左側 Sidebar
    When 我長按 Remotes 區域
    Then 跳出相同的選單
    And 不觸發瀏覽器預設長按行為（文字選取 / 系統選單）

  @smoke @happy-path @p0
  Scenario: 成功新增 remote
    Given 選單已開啟
    When 我點選「Add New Remote」
    And 我輸入名稱「upstream」與 URL「https://github.com/example/repo.git」並送出
    Then 系統建立 remote
    And 左側 Remotes 列表立即出現新的 remote（📡 圖示）
    And 新的 remote 可在 Push / Pull 對話框中選用

  @error-handling @p0
  Scenario Outline: 必填欄位驗證
    Given 新增對話框已開啟
    When 我送出<空白欄位>
    Then 系統顯示「<錯誤訊息>」並阻止送出
    And 不建立任何 remote

    Examples:
      | 空白欄位    | 錯誤訊息       |
      | 空的名稱    | 名稱不可為空   |
      | 空的 URL    | URL 不可為空   |

  @error-handling
  Scenario Outline: 名稱與 URL 格式驗證
    Given 新增對話框已開啟
    When 我輸入名稱「<名稱>」與 URL「<URL>」並送出
    Then 系統顯示「<錯誤訊息>」並拒絕建立
    And 左側 Remotes 列表不變

    Examples:
      | 名稱        | URL                                | 錯誤訊息       |
      | my remote   | https://github.com/example/repo.git | 名稱含非法字元 |
      | upstream    | not-a-url                          | URL 格式無效   |

  @business-rules @p0
  Scenario: 重複名稱不被允許
    Given repo 已存在名為 origin 的 remote
    When 我輸入名稱 origin 並送出
    Then 系統顯示「remote origin 已存在」的錯誤
    And 原有的 remote 不受影響

  @happy-path
  Scenario: 取消新增
    Given 新增對話框已開啟
    When 我按取消或 Esc
    Then 不建立任何 remote
    And 左側 Remotes 列表不變

  @error-handling
  Scenario: 新增失敗時顯示錯誤
    Given 系統無法建立 remote（例如網路或伺服器錯誤）
    When 我送出有效的名稱與 URL
    Then 系統顯示錯誤訊息
    And 左側 Remotes 列表不變

  @edge-case
  Scenario: 多 repo 環境只影響 active repo
    Given 我有多個 repo 且目前 active repo 為 A
    When 我新增 remote「upstream」
    Then remote 只加入 repo A
    And 其他 repo 的 remote 列表不受影響
