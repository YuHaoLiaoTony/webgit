const { test, expect } = require('@playwright/test');

test('commit table should have no gaps between rows', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);

  // Wait for the commit table to appear
  await page.waitForSelector('.commit-table', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: '/tmp/webgit-gap-test.png', fullPage: false });

  // Check that commit table exists
  const table = await page.$('.commit-table');
  if (table) {
    await table.screenshot({ path: '/tmp/commit-table-only.png' });
    console.log('✅ Table screenshot saved');
  } else {
    console.log('❌ No .commit-table found');
    console.log(await page.content().then(h => h.substring(0, 3000)));
  }

  // Measure gaps between rows
  const gapInfo = await page.evaluate(() => {
    const rows = document.querySelectorAll('.commit-table tbody tr');
    if (rows.length < 2) return { count: rows.length, gaps: [] };

    const gaps = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const r1 = rows[i].getBoundingClientRect();
      const r2 = rows[i + 1].getBoundingClientRect();
      gaps.push({
        row1: i,
        row2: i + 1,
        gap: Math.round(r2.top - r1.bottom)
      });
    }
    return { count: rows.length, gaps };
  });

  console.log('\n📊 Gap analysis:');
  console.log(`   Rows found: ${gapInfo.count}`);
  if (gapInfo.gaps && gapInfo.gaps.length > 0) {
    const hasGap = gapInfo.gaps.some(g => g.gap > 0);
    gapInfo.gaps.forEach(g => {
      const status = g.gap > 0 ? '❌ GAP' : '✅ OK';
      console.log(`   Row ${g.row1} → ${g.row2}: gap=${g.gap}px ${status}`);
    });
    expect(hasGap).toBe(false);
  } else {
    console.log('   No adjacent rows to compare');
  }
});
