/**
 * Feature: Add Remote
 *
 * As a Developer
 * I want to right-click (desktop) or long-press (mobile) on the left Remotes area
 * to open a menu, choose "Add New Remote", enter a name and URL to add a remote
 * So that I can quickly add a new remote to the current repo and use it right away
 *
 * @see docs/bdd/007-add-remote.feature
 * @see docs/user-stories/007-add-remote.md
 * @see docs/tech-decisions/tech-decision-新增Remote-2026-08-02.md
 */
import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ─── Helpers ──────────────────────────────────────────────────────────

let seq = 0;
/** 產生平行測試安全的唯一 remote 名稱（符合 git remote 命名規則） */
function unique(prefix = 'e2e') {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq}${Math.random().toString(36).slice(2, 6)}`;
}

/** 監聽頁面發出的 POST /api/remotes 請求（回傳計數器函式） */
function trackRemotesPosts(page) {
  const posts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().endsWith('/api/remotes')) {
      posts.push(req.url());
    }
  });
  return () => posts;
}

/** 確保 Remotes 群組已展開（預設為收合） */
async function ensureRemotesExpanded(page) {
  const title = page.locator('.sidebar-group-title', { hasText: 'Remotes' });
  const group = page.locator('.sidebar-remotes-group');
  if (!(await group.isVisible())) {
    await title.click();
  }
  await expect(group).toBeVisible();
}

/** 右鍵開啟 Remotes 選單（點擊標題列） */
async function openRemotesMenu(page) {
  const title = page.locator('.sidebar-group-title', { hasText: 'Remotes' });
  await expect(title).toBeVisible();
  await title.click({ button: 'right' });
  await expect(page.locator('.remotes-context-menu')).toBeVisible();
}

/** 右鍵點擊個別 remote 項目開啟選單 (US-007: 個別 remote 項目右鍵支援) */
async function openRemoteItemMenu(page, remoteName) {
  await ensureRemotesExpanded(page);
  const item = page.locator('.sidebar-remote-item', { hasText: remoteName });
  await expect(item).toBeVisible();
  await item.click({ button: 'right' });
  await expect(page.locator('.remotes-context-menu')).toBeVisible();
}

/** 右鍵 → Add New Remote → 等待對話框開啟 */
async function openAddRemoteDialog(page) {
  await openRemotesMenu(page);
  await page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' }).click();
  await expect(page.locator('.add-remote-dialog')).toBeVisible();
}

/** 填寫名稱與 URL（留空則不填） */
async function fillRemoteForm(page, { name, url }) {
  if (name !== undefined && name !== null) {
    await page.locator('.add-remote-name-input').fill(name);
  }
  if (url !== undefined && url !== null) {
    await page.locator('.add-remote-url-input').fill(url);
  }
}

async function apiGet(page, url) {
  const res = await page.request.get(`/api${url}`);
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

async function apiPost(page, url, body) {
  const tokenRes = await page.request.get('/api/csrf-token');
  const { token } = await tokenRes.json();
  const res = await page.request.post(`/api${url}`, {
    headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
    data: body,
  });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

const exactName = (name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

test.describe('Add Remote', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ─── 右鍵開啟選單（桌機）────────────────────────────────────────

  test('@smoke @happy-path @p0 - 右鍵開啟 Remotes 選單（桌機）', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop-only scenario');

    const title = page.locator('.sidebar-group-title', { hasText: 'Remotes' });
    await expect(title).toBeVisible();

    await title.click({ button: 'right' });

    const menu = page.locator('.remotes-context-menu');
    await expect(menu).toBeVisible();
    await expect(page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' })).toBeVisible();
  });

  // ─── 對個別 remote 項目右鍵開啟選單（桌機）────────────────────

  test('@smoke @happy-path @p0 - 對個別 remote 項目右鍵開啟選單，並完成新增流程（桌機）', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'desktop-only scenario');

    const newRemoteName = unique('new-remote');
    const newRemoteUrl = 'https://github.com/example/new-remote.git';

    // 取得既有 remote（取第一個）
    await ensureRemotesExpanded(page);
    const firstRemote = page.locator('.sidebar-remote-item').first();
    await expect(firstRemote).toBeVisible();
    const remoteText = await firstRemote.textContent();
    // 從 "▸ 📡 origin" 或 "▾ 📡 origin" 中取出名稱
    const existingName = remoteText.replace(/[▸▾]\s*📡\s*/, '').trim();

    // 對個別 remote 項目右鍵
    await firstRemote.click({ button: 'right' });
    const menu = page.locator('.remotes-context-menu');
    await expect(menu).toBeVisible();
    await expect(page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' })).toBeVisible();

    // 左鍵點擊 Add New Remote → 對話框出現
    await page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' }).click();
    await expect(page.locator('.add-remote-dialog')).toBeVisible();

    // 填寫名稱與 URL
    await fillRemoteForm(page, { name: newRemoteName, url: newRemoteUrl });
    await page.locator('.add-remote-create-btn').click();

    // 列表立即出現新 remote（📡 圖示）
    const newItem = page.locator('.sidebar-remote-item', { hasText: newRemoteName });
    await expect(newItem).toBeVisible();
    await expect(newItem).toContainText('📡');

    // 既有 remote 名稱未被改變
    if (existingName) {
      await expect(page.locator('.sidebar-remote-item', { hasText: existingName })).toBeVisible();
    }
  });

  // ─── 長按開啟選單（手機）────────────────────────────────────────

  test('@happy-path @p0 - 長按開啟 Remotes 選單（手機）', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only scenario');

    const title = page.locator('.sidebar-group-title', { hasText: 'Remotes' });
    await expect(title).toBeVisible();

    const box = await title.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // 以 CDP 送出真實 touch 事件模擬長按 ~500ms
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(650);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const menu = page.locator('.remotes-context-menu');
    await expect(menu).toBeVisible();
    await expect(page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' })).toBeVisible();
  });

  // ─── 點擊 Add New Remote 開啟對話框 ────────────────────────────

  test('@smoke @happy-path @p0 - 點擊 Add New Remote 開啟新增對話框', async ({ page }) => {
    const posts = trackRemotesPosts(page);

    await ensureRemotesExpanded(page);
    await openRemotesMenu(page);
    await page.locator('.remotes-context-menu-item', { hasText: 'Add New Remote' }).click();

    // 對話框開啟，含名稱/URL 輸入與按鈕
    const dialog = page.locator('.add-remote-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.add-remote-name-input')).toBeVisible();
    await expect(page.locator('.add-remote-url-input')).toBeVisible();
    await expect(page.locator('.add-remote-create-btn')).toBeVisible();

    // 可輸入
    await page.locator('.add-remote-name-input').fill('probe-name');
    await expect(page.locator('.add-remote-name-input')).toHaveValue('probe-name');

    // 取消不建立任何 remote
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(posts()).toHaveLength(0);
  });

  // ─── 成功新增 remote ────────────────────────────────────────────

  test('@smoke @happy-path @p0 - 成功新增 remote', async ({ page }) => {
    const remoteName = unique('upstream');
    const remoteUrl = 'https://github.com/example/repo.git';

    await ensureRemotesExpanded(page);
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: remoteUrl });
    await page.locator('.add-remote-create-btn').click();

    // 左側 Remotes 列表立即出現新的 remote（📡 圖示）
    const item = page.locator('.sidebar-remote-item', { hasText: remoteName });
    await expect(item).toBeVisible();
    await expect(item).toContainText('📡');

    // 新的 remote 可在 Push 對話框中選用（存在於下拉清單且可被選取）
    await page.locator('.toolbar-btn', { hasText: 'Push' }).click();
    await expect(page.locator('.push-dialog')).toBeVisible();
    await expect(page.locator('.push-dialog option', { hasText: exactName(remoteName) })).toHaveCount(1);
    const remoteSelect = page.locator('.push-dialog .push-select').nth(1);
    await remoteSelect.selectOption(remoteName);
    await expect(remoteSelect).toHaveValue(remoteName);
  });

  // ─── 必填欄位驗證 ───────────────────────────────────────────────

  for (const tc of [
    { empty: 'name', name: '', url: 'https://github.com/example/repo.git', message: '名稱不可為空' },
    { empty: 'url', name: unique('req'), url: '', message: 'URL 不可為空' },
  ]) {
    test(`@error-handling @p0 - 必填欄位驗證：${tc.message}`, async ({ page }) => {
      const posts = trackRemotesPosts(page);

      await openAddRemoteDialog(page);
      await fillRemoteForm(page, { name: tc.name, url: tc.url });
      await page.locator('.add-remote-create-btn').click();

      await expect(
        page.locator('.add-remote-field-error, .add-remote-error').filter({ hasText: tc.message }).first()
      ).toBeVisible();

      // 不建立任何 remote
      await expect(posts()).toHaveLength(0);
    });
  }

  // ─── 名稱與 URL 格式驗證 ────────────────────────────────────────

  for (const tc of [
    { name: 'my remote', url: 'https://github.com/example/repo.git', message: '名稱含非法字元' },
    { name: unique('fmt'), url: 'not-a-url', message: 'URL 格式無效' },
  ]) {
    test(`@error-handling - 名稱與 URL 格式驗證：${tc.message}`, async ({ page }) => {
      const posts = trackRemotesPosts(page);

      await openAddRemoteDialog(page);
      await fillRemoteForm(page, { name: tc.name, url: tc.url });
      await page.locator('.add-remote-create-btn').click();

      await expect(
        page.locator('.add-remote-field-error, .add-remote-error').filter({ hasText: tc.message }).first()
      ).toBeVisible();

      // 左側 Remotes 列表不變（無任何 POST）
      await expect(posts()).toHaveLength(0);
    });
  }

  // ─── 重複名稱不被允許 ───────────────────────────────────────────

  test('@business-rules @p0 - 重複名稱不被允許', async ({ page }) => {
    const remoteName = unique('origin');
    const remoteUrl = 'https://github.com/example/repo.git';

    // 先成功建立一個 remote（模擬「repo 已存在某 remote」）
    await ensureRemotesExpanded(page);
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: remoteUrl });
    await page.locator('.add-remote-create-btn').click();
    await expect(page.locator('.sidebar-remote-item', { hasText: remoteName })).toBeVisible();

    // 再以相同名稱送出 → 前端預檢擋下
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: remoteUrl });
    await page.locator('.add-remote-create-btn').click();
    await expect(
      page.locator('.add-remote-field-error, .add-remote-error').filter({ hasText: `remote ${remoteName} 已存在` }).first()
    ).toBeVisible();

    // 後端兜底：繞過前端直接呼叫 API，也應被拒絕
    const res = await apiPost(page, '/remotes', { name: remoteName, url: remoteUrl });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(res.body)).toContain(`remote ${remoteName} 已存在`);

    // 原有的 remote 不受影響（仍只有一筆該名稱）
    const list = await apiGet(page, '/remotes');
    const matches = list.body.filter((r) => r.name === remoteName);
    expect(matches).toHaveLength(1);
  });

  // ─── 取消新增 ───────────────────────────────────────────────────

  test('@happy-path - 取消新增（Esc 與 Cancel 按鈕）', async ({ page }) => {
    const posts = trackRemotesPosts(page);
    const remoteName = unique('cancel');

    // Esc 取消
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: 'https://github.com/example/repo.git' });
    await page.keyboard.press('Escape');
    await expect(page.locator('.add-remote-dialog')).toBeHidden();

    // Cancel 按鈕取消
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: 'https://github.com/example/repo.git' });
    await page.locator('.add-remote-cancel-btn').click();
    await expect(page.locator('.add-remote-dialog')).toBeHidden();

    // 不建立任何 remote，左側列表不變
    await expect(posts()).toHaveLength(0);
    await ensureRemotesExpanded(page);
    await expect(page.locator('.sidebar-remote-item', { hasText: remoteName })).toHaveCount(0);
  });

  // ─── 新增失敗時顯示錯誤 ─────────────────────────────────────────

  test('@error-handling - 新增失敗時顯示錯誤', async ({ page }) => {
    // 模擬伺服器錯誤
    await page.route('**/api/remotes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'simulated server error' }),
        });
      } else {
        await route.continue();
      }
    });
    const posts = trackRemotesPosts(page);
    const remoteName = unique('fail');

    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name: remoteName, url: 'https://github.com/example/repo.git' });
    await page.locator('.add-remote-create-btn').click();

    // 顯示錯誤訊息，對話框保持開啟
    await expect(page.locator('.add-remote-error', { hasText: 'simulated server error' })).toBeVisible();
    await expect(page.locator('.add-remote-dialog')).toBeVisible();
    expect(posts()).toHaveLength(1);

    // 左側 Remotes 列表不變
    await page.keyboard.press('Escape');
    await ensureRemotesExpanded(page);
    await expect(page.locator('.sidebar-remote-item', { hasText: 'fail-' })).toHaveCount(0);
  });

  // ─── UI 對話框新增只作用於 active repo ─────────────────────────

  test('@edge-case - UI 對話框新增 remote 只作用於 active repo', async ({ page }) => {
    // 攔截 POST /api/remotes，驗證前端有帶上 active repo 的 repoId
    let postedBody = null
    await page.route('**/api/remotes', async (route) => {
      if (route.request().method() === 'POST') {
        postedBody = JSON.parse(route.request().postData())
      }
      await route.continue()
    })

    // 取得目前 active repo（等同 repo A）
    const list = await apiGet(page, '/repos');
    expect(list.status).toBe(200);
    const activeRepo = list.body.activeRepo;
    expect(activeRepo).toBeTruthy();

    // UI 對話框新增 remote
    const name = unique('upstream');
    await ensureRemotesExpanded(page);
    await openAddRemoteDialog(page);
    await fillRemoteForm(page, { name, url: 'https://github.com/example/repo.git' });
    await page.locator('.add-remote-create-btn').click();

    // 等待列表出現（POST 完成 + 列表刷新）
    await expect(page.locator('.sidebar-remote-item', { hasText: name })).toBeVisible();

    // 前端 POST 帶上 active repo 的 repoId（而非 null / 預設 repo）
    expect(postedBody).toBeTruthy();
    expect(postedBody.repoId).toBe(activeRepo);

    // remote 真的建在 active repo
    const remotes = await apiGet(page, `/remotes?repoId=${encodeURIComponent(activeRepo)}`);
    expect(remotes.body.some((r) => r.name === name)).toBe(true);
  });

  // ─── 多 repo 環境只影響 active repo（API 層）────────────────────

  test('@edge-case - 多 repo 環境只影響 active repo', async ({ page }) => {
    // 建立第二個 repo（temp）
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webgit-e2e-repo-'));
    try {
      execSync('git init -b main', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git -c user.name=e2e -c user.email=e2e@example.com commit --allow-empty -m init', {
        cwd: tmpDir,
        stdio: 'pipe',
      });

      // 取得 repo A（原本的 repo）
      const list = await apiGet(page, '/repos');
      expect(list.status).toBe(200);
      const repoA = list.body.repos.find((r) => r.path !== tmpDir) || list.body.repos[0];
      expect(repoA).toBeTruthy();

      // 透過 API 開啟第二個 repo（repo B）
      const opened = await apiPost(page, '/repos/open', { path: tmpDir });
      expect(opened.status).toBe(200);
      const repoB = opened.body;
      expect(repoB.id).toBeTruthy();

      // 針對 repo B 新增 remote（模擬前端以 activeRepoId 帶 repoId）
      const name = unique('upstream');
      const addRes = await apiPost(page, '/remotes', { name, url: 'https://github.com/example/repo.git', repoId: repoB.id });
      expect(addRes.status).toBe(200);

      // repo B 有該 remote
      const remotesB = await apiGet(page, `/remotes?repoId=${encodeURIComponent(repoB.id)}`);
      expect(remotesB.body.some((r) => r.name === name)).toBe(true);

      // repo A 不受影響
      const remotesA = await apiGet(page, `/remotes?repoId=${encodeURIComponent(repoA.id)}`);
      expect(remotesA.body.some((r) => r.name === name)).toBe(false);
    } finally {
      // 清理：關閉並清除 repo 記錄，刪除 temp 資料夾
      try {
        const list = await apiGet(page, '/repos');
        const openedRepo = list.body.repos.find((r) => r.path === tmpDir);
        if (openedRepo) {
          await page.request.delete(`/api/repos/${encodeURIComponent(openedRepo.id)}?purge=true`);
        }
      } catch (_) {}
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
