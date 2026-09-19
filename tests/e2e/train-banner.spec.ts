import { expect, test, type Page } from '@playwright/test';

test.use({ timezoneId: 'Asia/Shanghai' });

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

function topCard(page: Page) {
  return page.locator('#card-stack .tour-card[data-stack-slot="0"]');
}

async function openAt(page: Page, time: string) {
  await page.clock.setFixedTime(new Date(time));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#card-stack')).toHaveClass(/is-ready/);
}

test('reorders the station screen for the day the visitor opens it', async ({ page }) => {
  await openAt(page, '2026-08-01T12:00:00+08:00');

  await expect(topCard(page)).toHaveAttribute('data-tour-id', 'beijing');
  await expect(topCard(page).locator('.card-to')).toHaveText('北京');
  await expect(topCard(page).locator('.status-value')).toHaveText('今天·正点');
  await expect(page.locator('#card-stack .tour-card[data-tour-id="nest"]')).toBeHidden();
});

test('moves past Xiamen to Wuhan without a rebuild', async ({ page }) => {
  await openAt(page, '2026-09-19T12:00:00+08:00');

  const stack = page.locator('#card-stack');
  const top = topCard(page);
  await expect(top).toHaveAttribute('data-tour-id', 'wuhan');
  await expect(top.locator('.card-from')).toHaveText('厦门');
  await expect(top.locator('.card-to')).toHaveText('武汉');
  await expect(top.locator('.card-date')).toHaveText('9月26日');
  await expect(top.locator('.card-venue')).toHaveText('武汉场');
  await expect(top.locator('.status-value')).toHaveText('7天后·正点');

  const xiamen = stack.locator('.tour-card[data-tour-id="xiamen"]');
  await expect(xiamen.locator('.status-value')).toHaveText('7天前·正点');
  await expect(xiamen.locator('.card-status')).toHaveClass(/is-past/);
  await expect(stack.locator('.tour-card[data-tour-id="nest"]')).toBeHidden();

  await stack.click();
  await expect(stack).toHaveClass(/expanded/);
  await expect(stack.locator('.tour-card[data-tour-id="nest"]')).toBeHidden();
  await expect(stack.locator('.tour-card[data-tour-id="xiamen"]')).toBeVisible();
});

test('parks the station screen on the nest once every tour has passed', async ({ page }) => {
  await openAt(page, '2026-10-04T12:00:00+08:00');

  const stack = page.locator('#card-stack');
  const top = topCard(page);
  await expect(top).toHaveClass(/nest-card/);
  await expect(top.locator('.nest-text')).toHaveText('鸟窝');
  await expect(top).toBeVisible();
  await expect(stack.locator('.tour-card')).toHaveCount(8);
  await expect(stack.locator('.tour-card[data-tour-id="shanghai"] .status-value')).toHaveText('1天前·正点');

  await stack.click();
  await expect(stack).toHaveClass(/expanded/);
  await expect(stack.locator('.tour-card')).toHaveCount(8);
  await expect(stack.locator('.tour-card[data-tour-id="nest"]')).toBeVisible();
});

test('keeps the train columns aligned and unclipped at every width', async ({ page }) => {
  await openAt(page, '2026-09-19T12:00:00+08:00');

  const stack = page.locator('#card-stack');
  for (const width of [320, 375, 520, 521, 600, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await stack.click();
    await expect(stack).toHaveClass(/expanded/);
    // 展开动效落定后再量，避免量到动画中途的宽度
    await expect(stack).toHaveClass(/rebounding/);
    await expect(stack).not.toHaveClass(/rebounding/);

    const cards = await page.locator('.tour-card:not(.nest-card)').evaluateAll((nodes) => nodes.map((node) => {
      const column = (selector: string) => {
        const rect = node.querySelector(selector)?.getBoundingClientRect();
        return rect ? `${Math.round(rect.left)}/${Math.round(rect.width)}` : '';
      };
      const route = node.querySelector('.card-route');
      const waiting = node.querySelector('.waiting-value');
      return {
        columns: `${column('.card-train')}|${column('.card-waiting')}|${column('.card-status')}`,
        clipped: Boolean(route && route.scrollWidth > route.clientWidth + 1)
          || Boolean(waiting && waiting.scrollWidth > waiting.clientWidth + 1)
      };
    }));

    expect(cards.length).toBeGreaterThan(1);
    expect(new Set(cards.map((card) => card.columns)).size).toBe(1);
    expect(cards.every((card) => !card.clipped)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(stack).not.toHaveClass(/expanded/);
  }
});
