# Status & Diff：工作目錄狀態與差異檢視

<a id="1-查看-repository-狀態"></a>
## US-01：查看 Repository 狀態

**As a** Developer
**I want** 在瀏覽器中查看目前 repository 的完整狀態
**So that** 我能快速了解哪些檔案有異動、是否在追蹤 upstream、以及 ahead/behind 情況

### 驗收條件

```
Given 我開啟 WebGit 首頁
When 頁面載入完成
Then 顯示目前所在分支名稱
And 顯示 modified / added / deleted / untracked / staged / renamed / conflicted 的檔案列表
And 顯示與 upstream 的 ahead/behind 數量
```

```
Given 目前沒有未提交的變更
When 頁面載入完成
Then 顯示「working tree clean」的提示
```

```
Given repository 沒有 upstream 分支
When 頁面載入完成
Then 不顯示 ahead/behind 資訊
```

### 優先級: Must
### 複雜度: S

---

<a id="2-檢視檔案變更內容-diff"></a>
## US-02：檢視檔案變更內容 (Diff)

**As a** Developer
**I want** 檢視已修改檔案的 diff 內容
**So that** 我能確認變更細節再決定是否暫存或提交

### 驗收條件

```
Given 我點擊一個 modified 檔案
When Diff 面板打開
Then 顯示該檔案的 side-by-side 或 unified diff
And 變更行有語法高亮
```

```
Given 我點擊一個 staged 檔案
When 我勾選「Show Staged Diff」
Then 顯示 staged 版本的 diff
```

```
Given 我點擊一個 untracked 檔案
When Diff 面板打開
Then 顯示該檔案的完整內容（無 diff 標記）
```

### 邊界案例

- 二進位檔案：顯示「Binary file not shown」
- 空檔案 / 新檔案：正確顯示內容

### 優先級: Must
### 複雜度: M
