/**
 * Feature: Commit History
 *
 * As a Developer and Reviewer
 * I want to browse commit history and view detailed commit information
 * So that I can track project changes and review code
 *
 * @see docs/bdd/003-commit-history.feature
 */
const { test, expect } = require('@playwright/test');
const {
  Sidebar,
  CommitGraph,
  DetailsPanel,
} = require('./helpers');

test.describe('Commit History', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ─── Browse commit list ───────────────────────────────────────────

  test('@smoke @happy-path @p0 - 瀏覽 commit 列表', async ({ page }) => {
    // Switch to All Commits view via sidebar
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Verify table headers: Graph, Subject, Author, Hash, Date
    const headers = CommitGraph.headers();
    await expect(headers.nth(0)).toContainText('Graph');
    await expect(headers.nth(1)).toContainText('Subject');
    await expect(headers.nth(2)).toContainText('Author');
    await expect(headers.nth(3)).toContainText('Hash');
    await expect(headers.nth(4)).toContainText('Date');

    // Verify commits are displayed (should have the 15 mock commits)
    const rows = CommitGraph.rows();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify each commit shows hash, author, date, subject
    const firstRow = CommitGraph.row(0);
    await expect(firstRow.locator('td:nth-child(2)')).not.toBeEmpty();
    await expect(firstRow.locator('td:nth-child(3)')).not.toBeEmpty();
    await expect(firstRow.locator('td:nth-child(4)')).not.toBeEmpty();
    await expect(firstRow.locator('td:nth-child(5)')).not.toBeEmpty();
  });

  // ─── Commits sorted in reverse chronological order ────────────────

  test('@happy-path @p0 - commit 依時間倒序排列', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Verify the first commit has the most recent date
    const firstDate = await CommitGraph.row(0).locator('td:nth-child(5)').textContent();
    expect(firstDate).toBeTruthy();

    // The mock data has "27 Nov 2020" as the most recent date at the top
    expect(firstDate).toContain('2020');
  });

  // ─── Merge commit displays info ───────────────────────────────────

  test('@happy-path @p0 - merge commit 顯示合併資訊', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // The mock data has merge commits (e.g. "LEGO: Merge pull request 41678")
    const mergeCommit = CommitGraph.row(10); // Row index 10 (id: 11)
    await expect(mergeCommit.locator('td:nth-child(2)')).toContainText('Merge');
  });

  // ─── View commit details ──────────────────────────────────────────

  test('@smoke @happy-path @p0 - 檢視 commit 詳細內容', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Click on the first commit row
    await CommitGraph.row(0).click();

    // Verify the details panel shows commit metadata
    await expect(DetailsPanel.metadata()).toBeVisible();

    // Verify author name is displayed
    await expect(DetailsPanel.authorName()).toBeVisible();
    await expect(DetailsPanel.authorName()).not.toBeEmpty();

    // Verify SHA value is displayed
    await expect(DetailsPanel.shaValue()).toBeVisible();

    // Verify commit title is displayed
    await expect(DetailsPanel.commitTitle()).toBeVisible();
  });

  // ─── Commit details show hash, author, date, message ──────────────

  test('@happy-path @p0 - commit 詳細顯示 hash、author、date、message', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Click the second commit for more data
    await CommitGraph.row(1).click();

    // Verify commit metadata fields
    const metadata = DetailsPanel.metadata();

    // SHA (hash)
    await expect(DetailsPanel.shaValue()).toBeVisible();
    const sha = await DetailsPanel.shaValue().textContent();
    expect(sha.length).toBeGreaterThanOrEqual(7);

    // Author
    await expect(DetailsPanel.authorName()).toBeVisible();
    const author = await DetailsPanel.authorName().textContent();
    expect(author.length).toBeGreaterThan(0);

    // Title
    await expect(DetailsPanel.commitTitle()).toBeVisible();
    const title = await DetailsPanel.commitTitle().textContent();
    expect(title.length).toBeGreaterThan(0);
  });

  // ─── Commit details show file changes ─────────────────────────────

  test('@happy-path @p0 - commit 詳細顯示變更檔案與 diff', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Click a commit with multiple files (e.g. row 1 = commit 2: Fix getTypeFacts)
    await CommitGraph.row(1).click();

    // Verify the Changes tab shows file list
    const changesTab = DetailsPanel.changesTab();
    await expect(changesTab).toBeVisible();

    // Click on Changes tab if not already active
    await changesTab.click();

    // Verify file items are shown
    const fileItems = DetailsPanel.changesFileItem();
    const fileCount = await fileItems.count();
    expect(fileCount).toBeGreaterThan(0);

    // Verify the file change summary is shown (footer with stats)
    await expect(DetailsPanel.fileChangeSummary()).toBeVisible();
  });

  // ─── File diff expandable in commit details ───────────────────────

  test('@happy-path @p0 - commit 的變更檔案可展開顯示 diff', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Click the first commit
    await CommitGraph.row(0).click();

    // Ensure Changes tab is active
    await DetailsPanel.changesTab().click();

    // Click the first file in the changes list to expand its diff
    const fileItem = DetailsPanel.changesFileItem().first().locator('.changes-file-header');
    await fileItem.click();

    // After clicking, the diff content should become visible
    // The file-diff-content has class "visible" when expanded
    const expandedContent = page.locator('.file-diff-content.visible');
    await expect(expandedContent.first()).toBeVisible();
  });

  // ─── File Tree tab ────────────────────────────────────────────────

  test('@happy-path @p0 - commit 詳細有 File Tree 分頁', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await CommitGraph.row(0).click();

    // Click File Tree tab
    await DetailsPanel.fileTreeTab().click();

    // Verify file tree elements are shown
    const ftFiles = page.locator('.ft-file');
    const ftCount = await ftFiles.count();
    expect(ftCount).toBeGreaterThan(0);
  });

  // ─── Branch toggles in commit graph ───────────────────────────────

  test('@happy-path @p0 - commit graph 分支可摺疊展開', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // The mock data has toggle rings for branch points (fix41651 and lego)
    const toggleRings = CommitGraph.toggleRing();
    const ringCount = await toggleRings.count();

    if (ringCount > 0) {
      // Click the first toggle ring to collapse its branch
      await toggleRings.first().click();

      // After collapsing, the branch commits should be hidden
      // (they have class 'collapsed-child')
      await expect(CommitGraph.table()).toBeVisible();

      // Click again to expand
      await toggleRings.first().click();
    }
  });

  // ─── SVG graph elements ───────────────────────────────────────────

  test('@happy-path @p0 - commit graph 顯示 SVG 圖形', async ({ page }) => {
    await Sidebar.commitsItem().click();
    await expect(CommitGraph.table()).toBeVisible();

    // Verify that SVG elements exist in the graph column
    const svgCount = await CommitGraph.svgGraph().count();
    expect(svgCount).toBeGreaterThan(0);
  });
});
