import { expect, test, type Page } from '@playwright/test';
import { PEEK_DURATION_MS, PEEK_START_DELAY_MS } from '../../src/domain/timeline-hint';

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

test('peeks the album timeline after the page loads and settles back down', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  const section = page.locator('#timeline-section');
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  // 页面就绪后要先静一会儿，不能一进来就动
  await page.waitForTimeout(500);
  await expect(section).not.toHaveAttribute('data-peek-state', 'running');

  // 并发跑时 load 本身可能被拖很久，弹跳窗口给足超时
  await expect(section).toHaveAttribute('data-peek-state', 'done', { timeout: 20_000 });

  const peek = await section.evaluate((element) => ({
    ready: Number(element.dataset.peekReady ?? 0),
    start: Number(element.dataset.peekStart ?? 0),
    elapsed: Number(element.dataset.peekElapsed ?? 0)
  }));
  // 等过延迟才开始，而且动画整整跑完（没被截断、也没有瞬间结束）
  // 时间戳都取自页面时钟，避免测试侧 CDP 往返被拖慢而误判
  expect(peek.start - peek.ready).toBeGreaterThanOrEqual(PEEK_START_DELAY_MS - 150);
  expect(peek.elapsed).toBeGreaterThan(PEEK_DURATION_MS / 1000 - 0.4);

  // 结束后回到原位，提示标签摘掉，也没有误触发地图虚化
  await expect(section).not.toHaveClass(/timeline-peek/);
  expect(await timelineTop(page)).toBeGreaterThanOrEqual(viewportHeight - 8);
  await expect(page.locator('html')).not.toHaveClass(/timeline-active/);

  // 关键帧幅度：至少抬起 40px，保证手柄真的露出来
  const peakOffset = await page.evaluate(() => {
    let peak = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules ?? [])) {
        if (!(rule instanceof CSSKeyframesRule) || !rule.name.includes('timeline-peek')) continue;
        for (const frame of Array.from(rule.cssRules)) {
          const match = /translateY\((-?[\d.]+)px\)/.exec((frame as CSSKeyframeRule).style.transform);
          if (match) peak = Math.max(peak, Math.abs(Number(match[1])));
        }
      }
    }
    return Math.round(peak);
  });
  expect(peakOffset).toBeGreaterThanOrEqual(40);
});

test.describe('prefers-reduced-motion: reduce', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('skips the peek', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // 先确认模拟确实生效，免得选项失效后这条用例变成空跑
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    await page.waitForTimeout(PEEK_START_DELAY_MS + PEEK_DURATION_MS + 800);
    const section = page.locator('#timeline-section');
    await expect(section).not.toHaveAttribute('data-peek-state', /.*/);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(await timelineTop(page)).toBeGreaterThanOrEqual(viewportHeight - 8);
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
