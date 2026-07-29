/**
 * Feature: Remote Operations
 *
 * As a Developer
 * I want to fetch, pull, and push from a remote repository
 * So that I can sync code changes with my team
 *
 * @see docs/bdd/005-remote-operations.feature
 */
const { test, expect } = require('@playwright/test');
const {
  Toolbar,
} = require('./helpers');

test.describe('Remote Operations', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ─── Fetch button exists ──────────────────────────────────────────

  test('@smoke @happy-path @p0 - Fetch 按鈕存在於工具列', async ({ page }) => {
    const fetchBtn = Toolbar.fetchBtn();
    await expect(fetchBtn).toBeVisible();
    await expect(fetchBtn).toBeEnabled();
  });

  // ─── Pull button exists ───────────────────────────────────────────

  test('@smoke @happy-path @p0 - Pull 按鈕存在於工具列', async ({ page }) => {
    const pullBtn = Toolbar.pullBtn();
    await expect(pullBtn).toBeVisible();
    await expect(pullBtn).toBeEnabled();
  });

  // ─── Push button exists ───────────────────────────────────────────

  test('@smoke @happy-path @p0 - Push 按鈕存在於工具列', async ({ page }) => {
    const pushBtn = Toolbar.pushBtn();
    await expect(pushBtn).toBeVisible();
    await expect(pushBtn).toBeEnabled();
  });

  // ─── All remote buttons visible ───────────────────────────────────

  test('@happy-path @p0 - Fetch、Pull、Push 按鈕並排顯示', async ({ page }) => {
    const fetchBtn = Toolbar.fetchBtn();
    const pullBtn = Toolbar.pullBtn();
    const pushBtn = Toolbar.pushBtn();

    // Verify all three are in the toolbar
    await expect(fetchBtn).toBeVisible();
    await expect(pullBtn).toBeVisible();
    await expect(pushBtn).toBeVisible();

    // Verify order: Fetch should appear before Pull, Pull before Push
    const toolbar = page.locator('.toolbar');
    const fetchBox = await fetchBtn.boundingBox();
    const pullBox = await pullBtn.boundingBox();
    const pushBox = await pushBtn.boundingBox();

    if (fetchBox && pullBox && pushBox) {
      expect(fetchBox.x).toBeLessThan(pullBox.x);
      expect(pullBox.x).toBeLessThan(pushBox.x);
    }
  });

  // ─── Toolbar icons ────────────────────────────────────────────────

  test('@happy-path @p0 - 工具列按鈕有對應圖示', async ({ page }) => {
    const fetchIcon = Toolbar.fetchBtn().locator('.toolbar-icon');
    const pullIcon = Toolbar.pullBtn().locator('.toolbar-icon');
    const pushIcon = Toolbar.pushBtn().locator('.toolbar-icon');

    await expect(fetchIcon).toBeVisible();
    await expect(pullIcon).toBeVisible();
    await expect(pushIcon).toBeVisible();
  });

  // ─── Remotes group in sidebar ─────────────────────────────────────

  test('@happy-path @p0 - 側邊欄有 Remotes 群組', async ({ page }) => {
    const remotesTitle = page.locator('.sidebar-group-title', { hasText: 'Remotes' });
    await expect(remotesTitle).toBeVisible();
  });

  // ─── Quick Launch button ──────────────────────────────────────────

  test('@happy-path @p0 - 工具列有 Quick Launch 按鈕', async ({ page }) => {
    const quickLaunch = page.locator('.toolbar-btn', { hasText: 'Quick Launch' });
    await expect(quickLaunch).toBeVisible();
  });
});
