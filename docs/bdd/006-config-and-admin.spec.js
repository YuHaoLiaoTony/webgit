/**
 * Feature: Configuration & Administration
 *
 * As a Developer and DevOps
 * I want to manage Git settings, start the server via CLI, ensure security, and monitor service status
 * So that I can configure the environment correctly, operate safely, and monitor the system
 *
 * @see docs/bdd/006-config-and-admin.feature
 */
const { test, expect } = require('@playwright/test');
const {
  HealthCheck,
} = require('./helpers');

test.describe('Configuration & Administration', () => {

  // ─── Health check endpoint ────────────────────────────────────────

  test('@smoke @happy-path @p1 - 健康檢查端點正常回應', async ({ request }) => {
    const response = await request.get(HealthCheck.endpoint);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');

    // Verify timestamp is a valid ISO date string
    const timestamp = new Date(body.timestamp);
    expect(timestamp.toISOString()).toBe(body.timestamp);
  });

  // ─── Health check uptime is a number ──────────────────────────────

  test('@happy-path @p1 - 健康檢查回傳 uptime 為有效數值', async ({ request }) => {
    const response = await request.get(HealthCheck.endpoint);
    const body = await response.json();

    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof body.uptime).toBe('number');
  });

  // ─── Health check returns correct Content-Type ────────────────────

  test('@smoke @happy-path @p1 - 健康檢查回傳 JSON 格式', async ({ request }) => {
    const response = await request.get(HealthCheck.endpoint);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  // ─── Server is running ────────────────────────────────────────────

  test('@smoke @happy-path @p0 - 伺服器正常運行且回傳 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
  });

  // ─── Page has correct title ───────────────────────────────────────

  test('@smoke @happy-path @p0 - 頁面標題正確', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WebGit/);
  });

  // ─── Security headers ─────────────────────────────────────────────

  test('@smoke @happy-path @p0 - 回應包含安全相關 headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();

    // X-Frame-Options should be DENY (prevents clickjacking)
    expect(headers['x-frame-options']).toBe('DENY');

    // X-Content-Type-Options should be nosniff
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-XSS-Protection header
    expect(headers['x-xss-protection']).toBe('1; mode=block');
  });

  // ─── CSRF token endpoint exists ───────────────────────────────────

  test('@smoke @happy-path @p0 - CSRF token API 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/csrf-token');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  // ─── API status endpoint ──────────────────────────────────────────

  test('@smoke @happy-path @p0 - API status 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('unstaged');
    expect(body).toHaveProperty('staged');
    expect(body).toHaveProperty('conflicted');
    expect(body).toHaveProperty('isClean');
  });

  // ─── API branches endpoint ────────────────────────────────────────

  test('@smoke @happy-path @p0 - API branches 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/branches');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('local');
  });

  // ─── API commits endpoint ─────────────────────────────────────────

  test('@smoke @happy-path @p0 - API commits 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/commits');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // ─── CSRF protection: POST without token returns 403 ──────────────

  test('@smoke @error-handling @p0 - 寫入請求缺少 CSRF token 回傳 403', async ({ request }) => {
    const response = await request.post('/api/stage', {
      data: { files: [] },
      headers: {
        'Content-Type': 'application/json',
        // No X-CSRF-Token header
      },
    });
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  // ─── CSRF protection: invalid token returns 403 ───────────────────

  test('@error-handling @p0 - 無效的 CSRF token 回傳 403', async ({ request }) => {
    const response = await request.post('/api/commit', {
      data: { message: 'test' },
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'invalid-token-value',
      },
    });
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  // ─── Read-only endpoints don't need CSRF token ────────────────────

  test('@business-rules @p0 - 讀取請求不需要 CSRF token', async ({ request }) => {
    // GET /api/status without CSRF token should work
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);
  });

  // ─── API diff endpoint ────────────────────────────────────────────

  test('@happy-path @p0 - API diff 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/diff');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('diff');
  });

  // ─── API config endpoint ──────────────────────────────────────────

  test('@happy-path @p1 - API config 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/config');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('userName');
    expect(body).toHaveProperty('userEmail');
    expect(body).toHaveProperty('defaultBranch');
  });

  // ─── API remotes endpoint ─────────────────────────────────────────

  test('@happy-path @p0 - API remotes 端點正常回應', async ({ request }) => {
    const response = await request.get('/api/remotes');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
