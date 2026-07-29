# WebGit User Stories

> 本目錄收錄 WebGit 專案的所有 User Story，按功能領域分類為獨立檔案。
> 每份 Story 皆遵循 As a / I want / So that 格式，附 Given/When/Then 驗收條件。

## 角色定義

| 角色 | 說明 |
|------|------|
| **Developer** | 使用 Git 的開發者，需要透過瀏覽器管理 repository |
| **Reviewer** | 團隊成員，需要審閱程式碼變更與 commit 歷史 |
| **DevOps** | 系統管理員，需要在伺服器端輕量管理 Git repos |

## User Stories 索引

| # | Story | 角色 | 優先級 | 複雜度 | 檔案 |
|---|-------|------|--------|--------|------|
| 1 | 查看 Repository 狀態 | Developer | Must | S | [001-status-and-diff.md](./001-status-and-diff.md) |
| 2 | 檢視檔案變更內容 (Diff) | Developer | Must | M | [001-status-and-diff.md](./001-status-and-diff.md) |
| 3 | 暫存檔案 (Stage) | Developer | Must | S | [002-staging-and-commit.md](./002-staging-and-commit.md) |
| 4 | 取消暫存檔案 (Unstage) | Developer | Must | S | [002-staging-and-commit.md](./002-staging-and-commit.md) |
| 5 | 建立 Commit | Developer | Must | M | [002-staging-and-commit.md](./002-staging-and-commit.md) |
| 6 | 捨棄變更 (Discard) | Developer | Must | M | [002-staging-and-commit.md](./002-staging-and-commit.md) |
| 7 | 瀏覽 Commit 歷史 | Developer | Must | M | [003-commit-history.md](./003-commit-history.md) |
| 8 | 檢視 Commit 詳細內容 | Reviewer | Must | S | [003-commit-history.md](./003-commit-history.md) |
| 9 | 建立分支 | Developer | Must | S | [004-branch-management.md](./004-branch-management.md) |
| 10 | 切換分支 | Developer | Must | S | [004-branch-management.md](./004-branch-management.md) |
| 11 | 刪除分支 | Developer | Must | S | [004-branch-management.md](./004-branch-management.md) |
| 12 | 從 Remote Fetch | Developer | Must | M | [005-remote-operations.md](./005-remote-operations.md) |
| 13 | 從 Remote Pull | Developer | Must | M | [005-remote-operations.md](./005-remote-operations.md) |
| 14 | 推送至 Remote Push | Developer | Must | M | [005-remote-operations.md](./005-remote-operations.md) |
| 15 | 管理 Git Config | Developer | Should | S | [006-config-and-admin.md](./006-config-and-admin.md) |
| 16 | CLI 啟動與選項 | DevOps | Must | S | [006-config-and-admin.md](./006-config-and-admin.md) |
| 17 | 安全性防護 | DevOps | Must | S | [006-config-and-admin.md](./006-config-and-admin.md) |
| 18 | 健康檢查 | DevOps | Should | XS | [006-config-and-admin.md](./006-config-and-admin.md) |
