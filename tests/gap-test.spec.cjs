const { test, expect } = require('@playwright/test');

test('pixel-level gap analysis', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const app = document.querySelector('#app');
    if (app && app.__vue_app__) {
      const pinia = app.__vue_app__.config.globalProperties.$pinia;
      if (pinia && pinia.state.value.ui) {
        pinia.state.value.ui.currentView = 'commits';
      }
    }
  });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.commit-table tbody tr', { timeout: 10000 });

  // Take a tight crop of rows 0-3 to see the gap visually
  const rows = await page.$$('.commit-table tbody tr');
  if (rows.length >= 4) {
    const box0 = await rows[0].boundingBox();
    const box3 = await rows[3].boundingBox();
    if (box0 && box3) {
      const clip = {
        x: box0.x,
        y: box0.y,
        width: Math.min(box0.width, 600),
        height: (box3.y + box3.height) - box0.y
      };
      await page.screenshot({ path: '/tmp/rows-0-3-crop.png', clip });
      console.log(`✅ Crop screenshot: x=${clip.x}, y=${clip.y}, w=${clip.width}, h=${clip.height}`);
    }
  }

  // Check pixel colors along a vertical line between rows
  const pixelCheck = await page.evaluate(() => {
    const rows = document.querySelectorAll('.commit-table tbody tr');
    if (rows.length < 2) return { error: 'not enough rows' };

    const table = document.querySelector('.commit-table');
    const tableRect = table.getBoundingClientRect();
    const row1 = rows[0];
    const row2 = rows[1];
    const r1 = row1.getBoundingClientRect();
    const r2 = row2.getBoundingClientRect();
    
    // Also check thead-th to first-row gap
    const thead = table.querySelector('thead tr');
    const tHeadRect = thead ? thead.getBoundingClientRect() : null;

    // Check row height
    const firstCells = row1.querySelectorAll('td');
    const cellHeights = [];
    firstCells.forEach((c, i) => {
      const cr = c.getBoundingClientRect();
      cellHeights.push({ index: i, className: c.className, height: cr.height });
    });

    return {
      theadBottom: tHeadRect ? tHeadRect.bottom : null,
      firstRowTop: r1.top,
      theadToRowGap: tHeadRect ? Math.round(r1.top - tHeadRect.bottom) : null,
      rows: {
        row0: { top: Math.round(r1.top), bottom: Math.round(r1.bottom), height: Math.round(r1.height) },
        row1: { top: Math.round(r2.top), bottom: Math.round(r2.bottom), height: Math.round(r2.height) },
        gap: Math.round(r2.top - r1.bottom)
      },
      cellHeightDetails: cellHeights,
      tableTop: Math.round(tableRect.top),
      tableBottom: Math.round(tableRect.bottom)
    };
  });

  console.log('\n📐 Layout Analysis:');
  console.log(JSON.stringify(pixelCheck, null, 2));
});
