/**
 * Playwright config for running the BDD specs in docs/bdd/.
 *
 * 主 config（playwright.config.js）的 testDir 指向 ./tests，
 * 這裡僅覆蓋 testDir 讓 docs/bdd/*.spec.js 可執行：
 *
 *   npx playwright test --config docs/bdd/playwright.config.js 007-add-remote
 */
import { defineConfig } from '@playwright/test';
import baseConfig from '../../playwright.config.js';

export default defineConfig({
  ...baseConfig,
  testDir: './',
});
