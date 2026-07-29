# Staging & Commit：暫存與提交

<a id="3-暫存檔案-stage"></a>
## US-03：暫存檔案 (Stage)

**As a** Developer
**I want** 將指定的已修改檔案暫存到 index
**So that** 我能分批準備要 commit 的變更

### 驗收條件

```
Given 列表中有 modified 或 untracked 檔案
When 我勾選該檔案並點擊 Stage
Then 檔案從 unstaged 區域移到 staged 區域
And 狀態顯示已暫存
```

```
Given 我未選取任何檔案
When 我點擊 Stage All
Then 所有 modified 與 untracked 檔案都被暫存
```

### 邊界案例

- 已暫存相同檔名但內容不同：正確覆蓋
- 同時操作大量檔案（100+）：不逾時或卡住

### 優先級: Must
### 複雜度: S

---

<a id="4-取消暫存檔案-unstage"></a>
## US-04：取消暫存檔案 (Unstage)

**As a** Developer
**I want** 將已暫存的檔案移回 working directory
**So that** 我能修正暫存的選擇

### 驗收條件

```
Given 列表中有 staged 檔案
When 我勾選該檔案並點擊 Unstage
Then 檔案從 staged 區域移回 unstaged 區域
And 檔案的實際變更內容不被影響
```

```
Given 我未選取任何檔案
When 我點擊 Unstage All
Then 所有 staged 檔案都被取消暫存
```

### 優先級: Must
### 複雜度: S

---

<a id="5-建立-commit"></a>
## US-05：建立 Commit

**As a** Developer
**I want** 輸入 commit message 並提交已暫存的變更
**So that** 我能將變更記錄到 Git 歷史中

### 驗收條件

```
Given 已有檔案被暫存
When 我輸入 commit message 並點擊 Commit
Then 系統執行 git commit
And 頁面重新整理顯示 clean status
And commit 出現在 commit 歷史中
```

```
Given 沒有檔案被暫存
When 我點擊 Commit
Then 顯示「Nothing to commit」的錯誤提示
```

```
Given commit message 為空
When 我點擊 Commit
Then 拒絕提交並顯示「Commit message is required」的提示
```

### 邊界案例

- commit message 包含特殊字元（emoji、non-ASCII）：正確處理
- 超過 200 字的 long message：正確儲存（Git 允許多行）
- 使用 `Ctrl+Enter` 快捷鍵：觸發 commit

### 非功能性需求

- 寫入操作需攜帶 CSRF token

### 優先級: Must
### 複雜度: M

---

<a id="6-捨棄變更-discard"></a>
## US-06：捨棄變更 (Discard)

**As a** Developer
**I want** 捨棄指定檔案或所有檔案的未暫存變更
**So that** 我能回復檔案到最後一次 commit 的狀態

### 驗收條件

```
Given 有 modified 檔案
When 我選取該檔案並點擊 Discard
Then 檔案內容回復到 HEAD 的狀態
And 檔案不再出現在變更列表中
```

```
Given 有 untracked 檔案
When 我選取該檔案並點擊 Discard
Then 該檔案被刪除
And 不再出現在 untracked 列表中
```

```
Given 我點擊 Discard 前
When 操作發起
Then 出現確認對話框防止誤操作
```

### 邊界案例

- Discard 後檔案內容不可回復（需提示不可逆）
- 同時 discard tracked 與 untracked 檔案

### 優先級: Must
### 複雜度: M
