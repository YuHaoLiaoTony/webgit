# Remote Operations：遠端操作

<a id="12-從-remote-fetch"></a>
## US-12：從 Remote Fetch

**As a** Developer
**I want** 從 remote repository 執行 fetch
**So that** 我能取得遠端最新的 commits 而不會自動合併

### 驗收條件

```
Given 我有設定的 remote
When 我點擊 Fetch
Then 系統執行 git fetch
And 顯示 fetch 結果（更新了哪些 references）
And 頁面上的 ahead/behind 資訊更新
```

```
Given 沒有設定 remote
When 我點擊 Fetch
Then 顯示「No remote configured」的提示
```

### 優先級: Must
### 複雜度: M

---

<a id="13-從-remote-pull"></a>
## US-13：從 Remote Pull

**As a** Developer
**I want** 從 remote repository 執行 pull
**So that** 我能取得並合併遠端最新的 commits

### 驗收條件

```
Given 我有 upstream 分支
When 我點擊 Pull
Then 系統執行 git pull
And 顯示 pull 結果（fast-forward 或 merge commit 資訊）
```

```
Given 我勾選 Rebase 選項
When 我點擊 Pull
Then 系統執行 git pull --rebase
```

```
Given 本地有未提交的變更且與遠端衝突
When 我點擊 Pull
Then 顯示衝突錯誤訊息
```

### 優先級: Must
### 複雜度: M

---

<a id="14-推送至-remote-push"></a>
## US-14：推送至 Remote (Push)

**As a** Developer
**I want** 將本地 commits 推送到 remote repository
**So that** 我能與團隊分享我的變更

### 驗收條件

```
Given 本地有 commits 領先 upstream
When 我點擊 Push
Then 系統執行 git push
And 顯示 push 結果
```

```
Given push 被拒絕（落後 upstream）
When 我點擊 Push
Then 顯示 rejection 訊息
And 提示建議先 pull
```

```
Given 我勾選 Force Push
When 我點擊 Push
Then 系統執行 git push --force
And 顯示確認對話框（因 force push 會覆蓋遠端歷史）
```

```
Given 目前分支沒有 upstream
When 我點擊 Push
Then 系統執行 git push --set-upstream origin <branch>
```

### 優先級: Must
### 複雜度: M
