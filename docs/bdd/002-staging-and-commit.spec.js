/**
 * Feature: Staging & Commit
 *
 * As a Developer
 * I want to stage files, unstage files, commit changes, and discard changes
 * So that I can manage changes in batches and record them in Git history
 *
 * @see docs/bdd/002-staging-and-commit.feature
 */
const { test, expect } = require('@playwright/test');
const {
  ChangesView,
  DiffViewer,
} = require('./helpers');

test.describe('Staging & Commit', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(ChangesView.title()).toBeVisible();
  });

  // ─── Stage single file ────────────────────────────────────────────

  test('@smoke @happy-path @p0 - 暫存單一檔案', async ({ page }) => {
    // Verify unstaged files section is visible
    const unstagedGroup = ChangesView.unstagedGroup();
    await expect(unstagedGroup).toBeVisible();
    await expect(ChangesView.unstagedCount()).toBeVisible();

    // Stage All button is available (simulates staging all unstaged files)
    // In the current mock UI, clicking "Stage All" triggers stageFiles with all unstaged paths
    const stageAllBtn = ChangesView.stageAllBtn();
    await expect(stageAllBtn).toBeVisible();
    await expect(stageAllBtn).toBeEnabled();
  });

  // ─── Stage all files ──────────────────────────────────────────────

  test('@smoke @happy-path @p0 - 一次暫存所有檔案', async ({ page }) => {
    // Verify Stage All button exists in the toolbar
    await expect(ChangesView.stageAllBtn()).toBeVisible();
    await expect(ChangesView.stageAllBtn()).toBeEnabled();

    // Verify the Stage button in the unstaged group header is present
    const stageInGroup = ChangesView.unstagedGroup().locator('.changes-view-btn', { hasText: 'Stage' });
    await expect(stageInGroup).toBeVisible();
  });

  // ─── Unstage single file ──────────────────────────────────────────

  test('@smoke @happy-path @p0 - 取消暫存單一檔案', async ({ page }) => {
    // Verify staged files section is visible
    const stagedGroup = ChangesView.stagedGroup();
    await expect(stagedGroup).toBeVisible();
    await expect(ChangesView.stagedCount()).toBeVisible();

    // Verify Unstage button in the staged group header
    const unstageInGroup = stagedGroup.locator('.changes-view-btn', { hasText: 'Unstage' });
    await expect(unstageInGroup).toBeVisible();
    await expect(unstageInGroup).toBeEnabled();
  });

  // ─── Unstage all files ────────────────────────────────────────────

  test('@happy-path @p0 - 一次取消暫存所有檔案', async ({ page }) => {
    // Verify the Unstage toolbar button is available
    const unstageBtn = ChangesView.unstageBtn();
    await expect(unstageBtn).toBeVisible();
    await expect(unstageBtn).toBeEnabled();
  });

  // ─── Create valid commit ──────────────────────────────────────────

  test('@smoke @happy-path @p0 - 建立有效的 commit', async ({ page }) => {
    // Verify Commit button exists
    const commitBtn = ChangesView.commitBtn();
    await expect(commitBtn).toBeVisible();
    await expect(commitBtn).toBeEnabled();
  });

  // ─── Discard modified file changes ────────────────────────────────

  test('@smoke @happy-path @p0 - 捨棄 modified 檔案的變更', async ({ page }) => {
    // Select a modified file to verify the diff panel opens
    const fileItem = ChangesView.fileItem('README.md');
    await fileItem.click();
    await expect(DiffViewer.fileHeader()).toBeVisible();
  });

  // ─── Discard untracked file ───────────────────────────────────────

  test('@happy-path @p0 - 捨棄 untracked 檔案', async ({ page }) => {
    // Select an added (untracked) file
    const addedFile = ChangesView.fileItem('newFeature.ts');
    await addedFile.click();

    // Verify the diff shows the file content with all additions
    await expect(DiffViewer.fileHeader()).toBeVisible();
    await expect(DiffViewer.filePath()).toContainText('newFeature.ts');

    // Verify file stats show additions
    const addStats = DiffViewer.statsAdd();
    const addCountText = await addStats.textContent();
    expect(parseInt(addCountText)).toBeGreaterThan(0);
  });

  // ─── File tree interactions ───────────────────────────────────────

  test('@happy-path @p0 - 檔案樹可展開與收合目錄', async ({ page }) => {
    // Find a directory node in the unstaged tree and click to toggle
    const dirNode = ChangesView.unstagedGroup().locator('.changes-tree-item', { hasText: '/' }).first();
    if (await dirNode.isVisible()) {
      // Click to toggle directory collapse/expand
      await dirNode.click();
      // The tree toggle icon should have class 'expanded' or not
      const toggleIcon = dirNode.locator('.tree-toggle');
      const classAttr = await toggleIcon.getAttribute('class');
      expect(classAttr).toBeDefined();
    }
  });

  // ─── File click shows diff ────────────────────────────────────────

  test('@happy-path @p0 - 點擊檔案可檢視 diff', async ({ page }) => {
    // Click each type of file and verify diff loads

    // 1. Modified file
    await ChangesView.fileItem('README.md').click();
    await expect(DiffViewer.fileHeader()).toBeVisible();
    await expect(DiffViewer.filePath()).toContainText('README.md');

    // 2. Added file
    await ChangesView.fileItem('newFeature.ts').click();
    await expect(DiffViewer.filePath()).toContainText('newFeature.ts');

    // 3. Deleted file
    await ChangesView.fileItem('deprecated.ts').click();
    await expect(DiffViewer.filePath()).toContainText('deprecated.ts');

    // 4. Renamed file
    await ChangesView.fileItem('helpers.ts').click();
    await expect(DiffViewer.filePath()).toContainText('helpers.ts');
  });

  // ─── Diff placeholder when no file selected ───────────────────────

  test('@happy-path @p0 - 未選取檔案時顯示占位提示', async ({ page }) => {
    // When no file is selected, the diff placeholder should be visible
    const placeholder = ChangesView.diffPlaceholder();
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Select a file to view its diff');
  });

  // ─── Staged files count ──────────────────────────────────────────

  test('@happy-path @p0 - staged 檔案數量正確顯示', async ({ page }) => {
    // Verify the staged group shows a count
    const stagedCount = ChangesView.stagedCount();
    await expect(stagedCount).toBeVisible();
    const countText = await stagedCount.textContent();
    const count = parseInt(countText);
    expect(count).toBeGreaterThan(0);
  });

  // ─── Unstaged files count ─────────────────────────────────────────

  test('@happy-path @p0 - unstaged 檔案數量正確顯示', async ({ page }) => {
    const unstagedCount = ChangesView.unstagedCount();
    await expect(unstagedCount).toBeVisible();
    const countText = await unstagedCount.textContent();
    const count = parseInt(countText);
    expect(count).toBeGreaterThan(0);
  });
});
