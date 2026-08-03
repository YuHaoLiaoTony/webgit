# Add Remote：新增遠端

<a id="19-從左側-remotes-新增-remote"></a>
## US-19：從左側 Remotes 新增 Remote

**As a** Developer
**I want** 在左側 Remotes 區域用滑鼠右鍵（桌機）或長按（手機）叫出選單，選擇「Add New Remote」並輸入名稱與 URL 新增遠端
**So that** 我不需要繞到其他畫面，就能直接把新的 remote 加入目前 repo 並立即使用

### 驗收條件

```
Given 左側 Sidebar 的 Remotes 區域可見
When 我對 Remotes 標題列（或區塊空白處）按滑鼠右鍵
Then 跳出 context menu，且包含「Add New Remote」選項
```

```
Given 我在手機瀏覽器開啟左側 Sidebar
When 我長按 Remotes 區域
Then 跳出相同的選單，且不會觸發瀏覽器預設長按行為（文字選取 / 系統選單）
```

```
Given 選單已開啟
When 我點選「Add New Remote」，在對話框輸入名稱（如 upstream）與 URL 並送出
Then 系統建立 remote，左側 Remotes 列表立即出現新的 remote（📡 圖示）
And 新的 remote 可在 Push / Pull 對話框中選用
```

```
Given repo 已存在名為 origin 的 remote
When 我輸入名稱 origin 並送出
Then 顯示錯誤訊息
And 原有的 remote 不受影響
```

```
Given 新增對話框已開啟
When 名稱或 URL 為空時送出
Then 顯示欄位錯誤並阻止送出
```

```
Given 新增對話框已開啟
When 我按取消或 Esc
Then 不建立任何 remote，列表不變
```

### 邊界案例

- remote 名稱含空白或非法字元 → 拒絕並提示
- URL 格式無效（git 無法解析）→ 顯示錯誤訊息
- 新增失敗（網路或伺服器錯誤）→ 顯示錯誤，列表不變
- 多 repo 環境 → 只作用於目前 active repo
- 右鍵/長按作用範圍為 Remotes 標題列與區塊空白處；個別 remote 項目上的選單（如 rename / delete）屬後續擴充，不在此範圍

### 非功能性需求

- 手機長按約 500ms 觸發，按住拖曳捲動時不誤觸
- 選單與對話框在手機寬度（375px）下可正常操作
- 送出過程有 loading 回饋，失敗即時顯示錯誤

### 優先級: Must
### 複雜度: M
