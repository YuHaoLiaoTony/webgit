# Commit History：瀏覽與檢視 Commit

<a id="7-瀏覽-commit-歷史"></a>
## US-07：瀏覽 Commit 歷史

**As a** Developer
**I want** 瀏覽 repository 的 commit 歷史
**So that** 我能追蹤專案的變更歷程

### 驗收條件

```
Given 我切換到 Commit History 頁面
When 頁面載入完成
Then 顯示 commit 列表（author、日期、message）
And 依時間倒序排列（最新的在最上面）
```

```
Given 我有超過 50 個 commits
When 我滾動到列表底部
Then 自動載入更多 commits（Infinite scroll 或 Load More 按鈕）
```

```
Given commit 有 merge commit
When 顯示在歷史列表中
Then 顯示 merge 訊息與 parent 資訊
```

### 優先級: Must
### 複雜度: M

---

<a id="8-檢視-commit-詳細內容"></a>
## US-08：檢視 Commit 詳細內容

**As a** Reviewer
**I want** 點擊 commit 檢視完整的 diff 與 metadata
**So that** 我能審閱該次提交的所有變更

### 驗收條件

```
Given 我點擊一個 commit
When 詳細面板打開
Then 顯示 commit hash、author、date、message
And 顯示該 commit 所有變更檔案的 diff
And 顯示每個檔案的增減行數統計
```

```
Given commit 包含多個檔案變更
When 我檢視詳細內容
Then 檔案可摺疊/展開
```

### 優先級: Must
### 複雜度: S
