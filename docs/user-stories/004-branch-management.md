# Branch Management：分支管理

<a id="9-建立分支"></a>
## US-09：建立分支

**As a** Developer
**I want** 從目前分支建立一個新分支
**So that** 我能隔離開發新功能

### 驗收條件

```
Given 我在分支管理頁面
When 我輸入新分支名稱並點擊 Create
Then 系統執行 git branch <name>
And 新分支出現在分支列表中
And 可選是否同時切換到新分支（checkout）
```

```
Given 分支名稱已存在
When 我嘗試建立
Then 顯示「Branch already exists」的錯誤
```

### 邊界案例

- 分支名稱包含特殊字元或斜線（如 `feature/login`）：正確建立
- 分支名稱過長或為空：拒絕建立

### 優先級: Must
### 複雜度: S

---

<a id="10-切換分支"></a>
## US-10：切換分支

**As a** Developer
**I want** 切換到另一個已存在的分支
**So that** 我能在不同分支間切換工作

### 驗收條件

```
Given 分支列表中有多個分支
When 我選擇一個分支並點擊 Checkout
Then 系統執行 git checkout <branch>
And 頁面狀態更新為該分支的狀態
```

```
Given 目前有未暫存或未提交的變更
When 我嘗試切換分支
Then 顯示警告提示有未提交變更
And 允許我取消操作
```

### 優先級: Must
### 複雜度: S

---

<a id="11-刪除分支"></a>
## US-11：刪除分支

**As a** Developer
**I want** 刪除一個已合併或不再需要的本地分支
**So that** 我能保持分支列表簡潔

### 驗收條件

```
Given 我檢視分支列表
When 我對一個分支點擊 Delete
Then 系統執行 git branch -d <name>
And 該分支從列表中移除
```

```
Given 分支尚未合併
When 我嘗試刪除
Then 顯示「Branch not fully merged」的錯誤提示
```

```
Given 我正處於要刪除的分支上
When 我嘗試刪除
Then 顯示「Cannot delete current branch」的錯誤提示
```

### 優先級: Must
### 複雜度: S
