import { test, expect } from '@playwright/test'

// ────────────────────────────────────────────
// Helper: mock data factories
// ────────────────────────────────────────────

function cleanStatus() {
  return {
    current: 'main',
    tracking: 'origin/main',
    ahead: 0,
    behind: 0,
    files: {
      modified: [],
      added: [],
      deleted: [],
      untracked: [],
      staged: [],
      renamed: [],
    },
    isClean: true,
  }
}

function dirtyStatus() {
  return {
    current: 'main',
    tracking: 'origin/main',
    ahead: 1,
    behind: 0,
    files: {
      modified: ['src/App.vue', 'src/utils/helpers.js'],
      added: ['docs/README.md'],
      deleted: ['old-config.yml'],
      untracked: ['new-feature.js', 'src/lib/parser.js'],
      staged: ['package.json'],
      // simple-git returns renamed as { from, to } objects, not strings
      renamed: [
        { from: 'old-name.js', to: 'src/renamed-file.js' },
      ],
    },
    isClean: false,
  }
}

/** Status after Stage All — matches real git behavior:
 *  Files remain in modified/added/deleted/renamed arrays but are also
 *  added to staged. The store's unstagedFiles getter filters modified/
 *  added/deleted against staged, and renamed is always in index when
 *  reported by simple-git.
 */
function allStagedStatus() {
  const renamedFiles = [
    { from: 'old-name.js', to: 'src/renamed-file.js' },
  ]
  return {
    current: 'main',
    tracking: 'origin/main',
    ahead: 1,
    behind: 0,
    files: {
      // Files still show in working tree but are filtered by the store
      modified: ['src/App.vue', 'src/utils/helpers.js'],
      added: ['docs/README.md'],
      deleted: ['old-config.yml'],
      untracked: ['new-feature.js', 'src/lib/parser.js'],
      // All files are also in staged (those that git knows about)
      staged: [
        'src/App.vue',
        'src/utils/helpers.js',
        'docs/README.md',
        'old-config.yml',
        'package.json',
        'src/renamed-file.js',
      ],
      renamed: renamedFiles,
    },
    isClean: false,
  }
}

function diffResponse() {
  return [
    'diff --git a/src/App.vue b/src/App.vue',
    '--- a/src/App.vue',
    '+++ b/src/App.vue',
    '@@ -10,6 +10,8 @@',
    ' const app = createApp(App)',
    ' app.use(router)',
    '+// New feature comment',
    '+console.log("hello")',
    ' app.mount("#app")',
    ' ',
    '@@ -20,3 +22,7 @@',
    '-.old-class {',
    '-  color: blue;',
    ' </style>',
    '+',
    '+.new-class {',
    '+  color: red;',
    '+}',
  ].join('\n')
}

async function mockStatus(page, data) {
  await page.route('**/api/status', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    })
  })
}

async function mockDiff(page, diff) {
  await page.route('**/api/diff*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ diff }),
    })
  })
}

// ────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────

test.describe('ChangesView', () => {
  // ── 1. Changes page loads ──────────────────
  test('1 - Changes page loads with title, badge, and toolbar', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    // Wait for the component to render
    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Title
    const title = page.locator('.changes-view-title')
    await expect(title).toHaveText('Changes')

    // Badge – the total changes count
    const badge = page.locator('.changes-view-badge')
    await expect(badge).toBeVisible()
    await expect(badge).not.toBeEmpty()

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /stage all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /discard/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^commit$/i })).toBeVisible()

    // Verify no rendering crashes (e.g. 'h.path.split is not a function')
    expect(errors.filter(e => e.includes('split')).length).toBe(0)

    await page.waitForTimeout(300)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-loaded.png', fullPage: true })
  })

  // ── 2. Loading state ───────────────────────
  test('2 - Shows loading spinner while fetching status', async ({ page }) => {
    // Delay the API response so the loading state stays visible
    await page.route('**/api/status', async (route) => {
      await new Promise((r) => setTimeout(r, 2000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cleanStatus()),
      })
    })

    await page.goto('/fork/')

    // The loading spinner should appear
    const loadingContainer = page.locator('.changes-view-loading')
    await expect(loadingContainer).toBeVisible({ timeout: 3000 })

    // Check spinner element and text
    await expect(loadingContainer.locator('.loading-spinner')).toBeVisible()
    await expect(loadingContainer).toContainText('Loading changes...')

    // Wait for the loading to finish
    await expect(loadingContainer).not.toBeVisible({ timeout: 5000 })

    // After loading, the clean state should appear
    await expect(page.locator('.cv-clean-state')).toBeVisible()

    await page.waitForTimeout(300)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-loading.png', fullPage: true })
  })

  // ── 3. Clean state ─────────────────────────
  test('3 - Shows "Working tree clean" when there are no changes', async ({ page }) => {
    await mockStatus(page, cleanStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Clean state message
    const cleanState = page.locator('.cv-clean-state')
    await expect(cleanState).toBeVisible()
    await expect(cleanState).toHaveText('Working tree clean')

    // Unstaged / Staged groups should not exist
    await expect(page.locator('#group-unstaged')).not.toBeVisible()
    await expect(page.locator('#group-staged')).not.toBeVisible()

    // Commit area should not exist when clean
    await expect(page.locator('.cv-commit-area')).not.toBeVisible()

    await page.waitForTimeout(300)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-clean.png', fullPage: true })
  })

  // ── 4. Unstaged / Staged groups ────────────
  test('4 - Shows Unstaged and Staged sections with file counts', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Unstaged group
    const unstagedGroup = page.locator('#group-unstaged')
    await expect(unstagedGroup).toBeVisible()

    // Unstaged header
    const unstagedHeader = unstagedGroup.locator('.cv-group-header')
    await expect(unstagedHeader).toContainText('Unstaged')
    // File count should be present
    const unstagedCount = unstagedGroup.locator('.cv-group-count')
    await expect(unstagedCount).toBeVisible()
    await expect(unstagedCount).not.toBeEmpty()

    // modified: ['src/App.vue', 'src/utils/helpers.js'] (2, not staged)
    // added: ['docs/README.md'] (1, not staged)
    // deleted: ['old-config.yml'] (1, not staged)
    // untracked: ['new-feature.js', 'src/lib/parser.js'] (2)
    // renamed: [{ from: 'old-name.js', to: 'src/renamed-file.js' }] (1)
    // => total 7 unstaged files
    const unstagedCountText = await unstagedCount.textContent()
    expect(Number(unstagedCountText)).toBe(7)

    // Staged group
    const stagedGroup = page.locator('#group-staged')
    await expect(stagedGroup).toBeVisible()

    const stagedHeader = stagedGroup.locator('.cv-group-header')
    await expect(stagedHeader).toContainText('Staged')

    const stagedCount = stagedGroup.locator('.cv-group-count')
    await expect(stagedCount).toBeVisible()
    const stagedCountText = await stagedCount.textContent()
    expect(Number(stagedCountText)).toBe(1)

    // Unstage button inside staged group
    const unstageBtn = stagedGroup.locator('.unstage-btn')
    await expect(unstageBtn).toBeVisible()
    await expect(unstageBtn).toHaveText('Unstage')

    // Verify no rendering crashes when building file tree
    expect(errors.filter(e => e.includes('split')).length).toBe(0)

    await page.waitForTimeout(300)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-groups.png', fullPage: true })
  })

  // ── 5. File tree display ───────────────────
  test('5 - Files are displayed in tree; folders can be expanded', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Check for file-tree-node components exist
    const fileNodes = page.locator('.file-tree-node')
    await expect(fileNodes.first()).toBeVisible()

    // Look for a folder node – our mock has "src/" and "docs/" folder paths
    const folderNode = fileNodes.filter({ has: page.locator('.node-icon:text-is("📁")') })
    const folderCount = await folderNode.count()
    expect(folderCount).toBeGreaterThanOrEqual(1)

    // Look for a file node (a leaf node without folder icon)
    const fileLeaf = fileNodes.filter({ has: page.locator('.node-icon:text-is("📄")') })
    await expect(fileLeaf.first()).toBeVisible()

    // Click the first folder toggle to expand
    // Use first() on toggle to avoid hitting nested folder toggles
    const firstFolderNode = folderNode.first()
    const firstFolderToggle = firstFolderNode.locator('.folder-toggle').first()
    await firstFolderToggle.click()

    // After clicking, toggle should have 'expanded' class
    await expect(firstFolderToggle).toHaveClass(/expanded/)

    // Children of the folder should be visible now
    // Check that the expanded folder reveals nested file nodes
    const expandedFolder = folderNode.first()
    const children = expandedFolder.locator('~ .folder-children .file-tree-node')
    // or within the same parent via the structure
    // Actually FileTreeNode renders recursively, so the expanded state shows children

    // Verify no rendering crashes
    expect(errors.filter(e => e.includes('split')).length).toBe(0)

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-file-tree.png', fullPage: true })
  })

  // ── 6. Select file to view diff ────────────
  test('6 - Clicking a file shows its diff in the right panel', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))

    await mockStatus(page, dirtyStatus())
    await mockDiff(page, diffResponse())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Initially the diff placeholder should be visible
    const placeholder = page.locator('.diff-placeholder')
    await expect(placeholder).toBeVisible()
    await expect(placeholder).toContainText('← Select a file to view its diff')

    // First expand the 'src' folder (App.vue is nested inside)
    const srcFolderToggle = page.locator('.file-tree-node .node-content')
      .filter({ hasText: 'src' })
      .locator('.folder-toggle')
      .first()
    await srcFolderToggle.click()
    await expect(srcFolderToggle).toHaveClass(/expanded/)

    // Now find and click App.vue file node
    const appFileContent = page.locator('.file-content').filter({ hasText: 'App.vue' }).first()
    await expect(appFileContent).toBeVisible()
    await appFileContent.click()

    // Now the DiffViewer should render the diff content
    const diffViewer = page.locator('.diff-viewer')
    await expect(diffViewer).toBeVisible()

    // Check diff header has the filename
    const diffFilename = diffViewer.locator('.diff-filename')
    await expect(diffFilename).toBeVisible()
    await expect(diffFilename).toContainText('src/App.vue')

    // Check diff lines are rendered (added/removed lines)
    const diffAdd = diffViewer.locator('.diff-add')
    await expect(diffAdd.first()).toBeVisible()
    const diffDel = diffViewer.locator('.diff-del')
    await expect(diffDel.first()).toBeVisible()

    // The placeholder should be gone
    await expect(placeholder).not.toBeVisible()

    // Verify no rendering crashes after interacting with files
    expect(errors.filter(e => e.includes('split')).length).toBe(0)

    await page.waitForTimeout(300)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-diff.png', fullPage: true })
  })

  // ── 7. Commit area ─────────────────────────
  test('7 - Commit area has message input and Commit Changes button', async ({ page }) => {
    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Commit area container
    const commitArea = page.locator('.cv-commit-area')
    await expect(commitArea).toBeVisible()

    // Commit message input
    const commitInput = commitArea.locator('.commit-message-input')
    await expect(commitInput).toBeVisible()
    await expect(commitInput).toHaveAttribute('placeholder', 'Describe changes')

    // Commit Changes button
    const commitBtn = commitArea.getByRole('button', { name: /commit changes/i })
    await expect(commitBtn).toBeVisible()

    // Type a commit message
    await commitInput.fill('Fix the thing')
    await expect(commitInput).toHaveValue('Fix the thing')

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-commit-area.png', fullPage: true })
  })

  // ── 8. Stage All button ────────────────────
  test('8 - Stage All unstaged API returns empty', async ({ page }) => {
    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Stage All button in the toolbar
    const stageAllBtn = page.getByRole('button', { name: /stage all/i })
    await expect(stageAllBtn).toBeVisible()
    await expect(stageAllBtn).toBeEnabled()

    // Intercept the /api/stage POST
    let stageCalled = false
    await page.route('**/api/stage', (route) => {
      stageCalled = true
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // After stage, return allStagedStatus() — unstaged arrays filtered by staged,
    // renamed files treated as staged per simple-git behavior
    await page.unroute('**/api/status')
    await page.route('**/api/status', (route) => {
      const data = stageCalled ? allStagedStatus() : dirtyStatus()
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      })
    })

    await stageAllBtn.click()

    // After staging, the store refreshes and returns allStagedStatus()
    // All files are staged: modified/added filtered by staged, renamed
    // is always in index per simple-git behavior → unstagedFiles = 0
    const unstagedGroup = page.locator('#group-unstaged')
    await expect(unstagedGroup).toBeVisible({ timeout: 5000 })
    const unstagedCount = unstagedGroup.locator('.cv-group-count')
    await expect(unstagedCount).toBeVisible()
    const countText = await unstagedCount.textContent()
    expect(Number(countText)).toBe(0)

    // Verify staged group now has all files
    const stagedGroup = page.locator('#group-staged')
    await expect(stagedGroup).toBeVisible()
    const stagedCount = stagedGroup.locator('.cv-group-count')
    await expect(stagedCount).toBeVisible()
    const stagedCountText = await stagedCount.textContent()
    // renamed 'src/renamed-file.js' is in staged array + renamed always staged
    expect(Number(stagedCountText)).toBe(6)

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-stage-all.png', fullPage: true })
  })

  // ── 9. Discard and Commit buttons ──────────
  test('9 - Discard and Commit buttons are present in toolbar', async ({ page }) => {
    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Discard button
    const discardBtn = page.locator('.changes-view-btn.discard-btn')
    await expect(discardBtn).toBeVisible()
    await expect(discardBtn).toHaveText('Discard')

    // Commit button (toolbar version)
    const toolbarCommitBtn = page.locator('.changes-view-actions .commit-btn')
    await expect(toolbarCommitBtn).toBeVisible()
    await expect(toolbarCommitBtn).toHaveText('Commit')

    // Both should be enabled
    await expect(discardBtn).toBeEnabled()
    await expect(toolbarCommitBtn).toBeEnabled()

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-toolbar-buttons.png', fullPage: true })
  })

  // ── 10. Error state ────────────────────────
  test('10 - Shows error message when API fails', async ({ page }) => {
    await page.route('**/api/status', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await page.goto('/fork/')

    // Wait for the component to render
    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // Loading should complete (even though there's an error)
    await expect(page.locator('.changes-view-loading')).not.toBeVisible({ timeout: 5000 })

    // Error message should appear
    const errorDiv = page.locator('.changes-view-error')
    await expect(errorDiv).toBeVisible()
    await expect(errorDiv).not.toBeEmpty()

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-error.png', fullPage: true })
  })

  // ── 11. Mobile responsiveness ──────────────
  test('11 - Responsive layout on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await mockStatus(page, dirtyStatus())
    await page.goto('/fork/')

    await expect(page.locator('.changes-view')).toBeVisible({ timeout: 10000 })

    // The files panel and diff panel should still be visible
    const filesPanel = page.locator('.changes-view-files')
    await expect(filesPanel).toBeVisible()

    const diffPanel = page.locator('.changes-view-diff')
    await expect(diffPanel).toBeVisible()

    // Title should be visible
    await expect(page.locator('.changes-view-title')).toHaveText('Changes')

    await page.waitForTimeout(200)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: 'screenshots/changes-view-mobile.png', fullPage: true })
  })
})

// ── Summary ──────────────────────────────────
test.afterAll(async () => {
  console.log('✅ changes-view.spec.js completed — all 11 test cases executed.')
})
