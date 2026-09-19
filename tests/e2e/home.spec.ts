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
});

async function dismissEntryNotice(page: Page) {
  const overlay = page.locator('#entry-notice-overlay');
  if (await overlay.count()) {
    await expect(overlay).toHaveClass(/visible/);
    await overlay.click({ position: { x: 6, y: 6 } });
    await expect(overlay).toHaveCount(0);
  }
}

async function canvasHasContent(page: Page) {
  return page.locator('#game-canvas').evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext('2d');
    if (!context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 16) if (pixels[i] > 0) return true;
    return false;
  });
}

test('shows each first-visit notice once and keeps entry values on a whitelist', async ({ page }) => {
  const overlay = page.locator('#entry-notice-overlay');
  const notice = page.locator('#browser-notice');

  await page.goto('/?entry=qr-main&utm_source=poster', { waitUntil: 'domcontentloaded' });
  await expect(overlay).toHaveClass(/visible/);
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText('你是通过二维码进入的，建议换用支持 NFC 的手机碰一碰访问');

  const [overlayBox, noticeBox, viewport] = await Promise.all([
    overlay.boundingBox(),
    notice.boundingBox(),
    page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  ]);
  expect(overlayBox?.width).toBe(viewport.width);
  expect(overlayBox?.height).toBe(viewport.height);
  expect(Math.abs((noticeBox?.x ?? 0) + (noticeBox?.width ?? 0) / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0) / 2 - viewport.height / 2)).toBeLessThan(2);
  expect(await overlay.evaluate((element) => {
    const styles = getComputedStyle(element);
    return styles.backdropFilter || (styles as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter;
  })).toContain('blur(');

  await notice.click();
  await expect(overlay).toHaveClass(/visible/);
  await overlay.click({ position: { x: 6, y: 6 } });
  await expect(overlay).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/entry-notice-open/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(overlay).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.goto('/?entry=%3Cscript%3Euntrusted%3C%2Fscript%3E', { waitUntil: 'domcontentloaded' });
  await expect(overlay).toHaveClass(/visible/);
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText('建议使用 Chrome 或 Chromium 内核浏览器访问，以获得最佳体验');
  await expect(notice).not.toContainText('untrusted');

  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(overlay).toHaveCount(0);
});

test('automatically dismisses the first-visit notice', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('#entry-notice-overlay');
  await expect(overlay).toHaveClass(/visible/);
  await expect(overlay).toHaveCount(0, { timeout: 6_000 });
  await expect(page.locator('body')).not.toHaveClass(/entry-notice-open/);
});

test('preserves map loading and baseline surface at every viewport', async ({ page }, testInfo) => {
  const googleFonts: string[] = [];
  const mapRequests: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.googleapis|fonts\.gstatic/.test(request.url())) googleFonts.push(request.url());
    if (request.url().endsWith('/tour-map.geo.json')) mapRequests.push(request.url());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);
  await page.locator('#map-chart canvas').first().waitFor({ state: 'attached' });
  await expect.poll(async () => page.locator('#map-chart canvas').count()).toBeGreaterThan(0);
  const canvasStats = await page.locator('#map-chart canvas').evaluateAll((canvases) => canvases.map((canvas) => {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) return 0;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonTransparent = 0;
    for (let i = 3; i < pixels.length; i += 16) if (pixels[i] > 0) nonTransparent++;
    return nonTransparent;
  }));
  expect(canvasStats.some((value) => value > 20)).toBe(true);
  expect(mapRequests).toHaveLength(1);
  expect(googleFonts).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath(`home-${testInfo.project.name}.png`), fullPage: true });
});

test('loads sticker previews before lightbox and original only on lightbox', async ({ page }) => {
  const originalRequests: string[] = [];
  await page.on('request', (request) => {
    if (/\/images\/stickers\//.test(request.url())) originalRequests.push(request.url());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);
  await page.mouse.move(0, Math.floor((await page.evaluate(() => innerHeight)) / 2));
  await page.locator('#gallery-tab').click();
  await expect(page.locator('#gallery-grid .gallery-item').first()).toBeVisible({ timeout: 10_000 });
  expect(originalRequests).toHaveLength(0);
  await page.locator('#gallery-grid .gallery-item').first().click();
  await expect(page.locator('#lightbox')).toHaveClass(/open/);
  await expect.poll(() => originalRequests.length).toBeGreaterThan(0);
});

test('keeps panel state transitions exclusive', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);
  const stack = page.locator('#card-stack');
  await stack.click();
  await expect(stack).toHaveClass(/expanded/);
  await expect(page.locator('body')).toHaveClass(/panel-open/);
  await page.keyboard.press('Escape');
  await expect(stack).not.toHaveClass(/expanded/);
  await expect(page.locator('body')).not.toHaveClass(/panel-open/);
});

test('keeps the mobile train details compact and on one line', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);

  for (const width of [414, 375, 360, 320]) {
    await page.setViewportSize({ width, height: 812 });
    const stack = page.locator('#card-stack');
    await stack.click();
    await expect(stack).toHaveClass(/expanded/);
    // 卡片宽高是动画出来的，量布局前先等展开动效落定
    await expect(stack).toHaveClass(/rebounding/);
    await expect(stack).not.toHaveClass(/rebounding/);

    await expect(page.locator('.card-train').first()).toBeHidden();
    await expect(page.locator('.card-venue-meta').first()).toBeHidden();
    await expect(page.locator('.mobile-status').first()).toBeHidden();
    await expect(page.locator('.card-waiting').first()).toBeVisible();
    await expect(page.locator('.card-status').first()).toBeVisible();

    const layout = await page.locator('.tour-card:not(.nest-card)').evaluateAll((cards) => cards.map((card) => {
      const waitingValue = card.querySelector('.waiting-value');
      const waitingRange = document.createRange();
      if (waitingValue) waitingRange.selectNodeContents(waitingValue);
      const route = card.querySelector('.card-route');
      const date = card.querySelector('.card-date');
      const dateRange = document.createRange();
      if (date) dateRange.selectNodeContents(date);
      const box = (selector: string) => card.querySelector(selector)?.getBoundingClientRect();
      const info = box('.card-info');
      const waiting = box('.card-waiting');
      const status = box('.card-status');
      return {
        overflows: card.scrollWidth > card.clientWidth + 1,
        waitingLines: waitingValue ? waitingRange.getClientRects().length : 0,
        waitingWhiteSpace: waitingValue ? getComputedStyle(waitingValue).whiteSpace : '',
        routeClipped: route ? route.scrollWidth > route.clientWidth + 1 : false,
        dateLines: date ? dateRange.getClientRects().length : 0,
        columnsOverlap: Boolean(
          info && waiting && status
          && (info.right - waiting.left > 1 || waiting.right - status.left > 1)
        )
      };
    }));
    expect(layout.every((card) => !card.overflows)).toBe(true);
    expect(layout.every((card) => card.waitingLines === 1 && card.waitingWhiteSpace === 'nowrap')).toBe(true);
    expect(layout.every((card) => !card.routeClipped)).toBe(true);
    expect(layout.every((card) => card.dateLines === 1)).toBe(true);
    expect(layout.every((card) => !card.columnsOverlap)).toBe(true);
    await expect(page.locator('.waiting-value', { hasText: '回响之地·前滩馆' })).toBeVisible();

    const colors = await page.evaluate(() => {
      const resolveColor = (color: string) => {
        const probe = document.createElement('span');
        probe.style.color = color;
        document.body.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      };
      return {
        expectedPast: resolveColor('var(--color-yellow)'),
        expectedUpcoming: resolveColor('#4ade80'),
        past: [...document.querySelectorAll('.card-status.is-past .status-value')]
          .map((element) => getComputedStyle(element).color),
        upcoming: [...document.querySelectorAll('.card-status:not(.is-past) .status-value')]
          .map((element) => getComputedStyle(element).color)
      };
    });
    expect(colors.past.length).toBeGreaterThan(0);
    expect(colors.upcoming.length).toBeGreaterThan(0);
    expect(colors.past.every((color) => color === colors.expectedPast)).toBe(true);
    expect(colors.upcoming.every((color) => color === colors.expectedUpcoming)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(stack).not.toHaveClass(/expanded/);
  }
});

test('opens, renders, and closes the game without changing panel semantics', async ({ page }) => {
  await page.route('**/images/game/yousa-WTF.png', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);
  await page.locator('#game-tab').click();
  const panel = page.locator('#game-panel');
  await expect(panel).toHaveClass(/expanded/);
  await expect(page.locator('body')).toHaveAttribute('data-open-panel', 'game');
  await expect.poll(() => canvasHasContent(page)).toBe(true);
  await page.locator('#close-tab').click();
  await expect(panel).not.toHaveClass(/expanded/);
  await expect(page.locator('body')).not.toHaveAttribute('data-open-panel', 'game');
});

test('does not block a cold game open on the optional sprite', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  let releaseEasterEgg = () => {};
  const easterEggGate = new Promise<void>((resolve) => {
    releaseEasterEgg = resolve;
  });
  await page.route('**/images/game/yousa-WTF.png', async (route) => {
    await easterEggGate;
    await route.continue();
  });

  const easterEggRequest = page.waitForRequest((request) => request.url().endsWith('/images/game/yousa-WTF.png'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissEntryNotice(page);
  await easterEggRequest;
  const panel = page.locator('#game-panel');
  await page.locator('#game-tab').click();
  await expect(panel).toHaveClass(/expanded/);
  await expect.poll(() => canvasHasContent(page), { timeout: 2_500 }).toBe(true);
  await expect(page.locator('#hero-chicken')).toHaveAttribute('src', '/images/game/yousa-chicken.png');

  const easterEggResponse = page.waitForResponse((response) => response.url().endsWith('/images/game/yousa-WTF.png'));
  releaseEasterEgg();
  await easterEggResponse;
  await page.locator('#close-tab').click();
  await expect(panel).not.toHaveClass(/expanded/);

  await page.locator('#game-tab').click();
  await expect(panel).toHaveClass(/expanded/);
  await expect(page.locator('#hero-chicken')).toHaveAttribute('src', '/images/game/yousa-WTF.png');
  await expect.poll(() => canvasHasContent(page)).toBe(true);
  await page.locator('#close-tab').click();
  await expect(panel).not.toHaveClass(/expanded/);
});
