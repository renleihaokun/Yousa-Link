import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://ip.nemui.cn/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ip: '127.0.0.1', location: { city: 'beijing', region: 'beijing' } })
  }));
  await page.route('https://meting.mysqil.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ name: 'Test song', author: 'Test artist', url: 'https://example.com/song.mp3', pic: '' }])
  }));
  await page.addInitScript(() => {
    window.localStorage.setItem('yousa-browser-notice-seen-v1', '1');
  });
});

function timelineTop(page: Page) {
  return page.locator('#timeline-section').evaluate((element) => element.getBoundingClientRect().top);
}

/** 从页面一开始就逐帧记录时间线的顶部位置，避免漏掉只有几百毫秒的弹跳窗口 */
async function recordTimelineTops(page: Page) {
  await page.addInitScript(() => {
    const samples: Array<{ top: number; scrollY: number }> = [];
    (window as unknown as { __timelineTops: Array<{ top: number; scrollY: number }> }).__timelineTops = samples;
    const record = () => {
      // 样式表生效前页面还是无样式布局，这时候的采样不算数
      const section = document.getElementById('timeline-section');
      if (section && document.readyState !== 'loading') {
        samples.push({ top: section.getBoundingClientRect().top, scrollY: window.scrollY });
      }
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
}

function lowestTimelineTop(page: Page) {
  return page.evaluate(() => {
    const samples = (window as unknown as { __timelineTops?: Array<{ top: number; scrollY: number }> }).__timelineTops ?? [];
    return samples.length ? Math.min(...samples.map((sample) => sample.top)) : Number.POSITIVE_INFINITY;
  });
}

test('peeks the album timeline after the page loads and settles back down', async ({ page }) => {
  await recordTimelineTops(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const section = page.locator('#timeline-section');
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  await expect(section).toHaveClass(/timeline-peek/);
  await expect(section).not.toHaveClass(/timeline-peek/);

  // 弹跳期间确实把手柄露进了视口（峰值约 -60px）
  expect(await lowestTimelineTop(page)).toBeLessThan(viewportHeight - 30);
  expect(await timelineTop(page)).toBeGreaterThanOrEqual(viewportHeight - 8);
  await expect(page.locator('html')).not.toHaveClass(/timeline-active/);
});

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('skips the peek', async ({ page }) => {
    await recordTimelineTops(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_500);
    // 先确认模拟确实生效，免得选项失效后这条用例变成空跑
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await expect(page.locator('#timeline-section')).not.toHaveClass(/timeline-peek/);
    expect(await lowestTimelineTop(page)).toBeGreaterThanOrEqual(viewportHeight - 8);
  });
});

test('still reveals the timeline when the visitor scrolls down', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const section = page.locator('#timeline-section');
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));

  await expect(page.locator('html')).toHaveClass(/timeline-active/);
  await expect(section).not.toHaveClass(/timeline-peek/);
  await expect.poll(() => timelineTop(page)).toBeLessThan(10);
});
