import { expect, test } from '@playwright/test';

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

test('shows each first-visit notice once and keeps entry values on a whitelist', async ({ page }) => {
  const notice = page.locator('#browser-notice');

  await page.goto('/?entry=qr-main&utm_source=poster', { waitUntil: 'domcontentloaded' });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText('你是通过二维码进入的，建议换用支持 NFC 的手机碰一碰访问');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(notice).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.goto('/?entry=%3Cscript%3Euntrusted%3C%2Fscript%3E', { waitUntil: 'domcontentloaded' });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText('建议使用 Chrome 或 Chromium 内核浏览器访问，以获得最佳体验');
  await expect(notice).not.toContainText('untrusted');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(notice).toHaveCount(0);
});

test('preserves map loading and baseline surface at every viewport', async ({ page }, testInfo) => {
  const googleFonts: string[] = [];
  const mapRequests: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.googleapis|fonts\.gstatic/.test(request.url())) googleFonts.push(request.url());
    if (request.url().endsWith('/tour-map.geo.json')) mapRequests.push(request.url());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
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
  const stack = page.locator('#card-stack');
  await stack.click();
  await expect(stack).toHaveClass(/expanded/);
  await expect(page.locator('body')).toHaveClass(/panel-open/);
  await page.keyboard.press('Escape');
  await expect(stack).not.toHaveClass(/expanded/);
  await expect(page.locator('body')).not.toHaveClass(/panel-open/);
});

test('opens, renders, and closes the game without changing panel semantics', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#game-tab').click();
  const panel = page.locator('#game-panel');
  await expect(panel).toHaveClass(/expanded/);
  await expect(page.locator('body')).toHaveAttribute('data-open-panel', 'game');
  await expect.poll(() => page.locator('#game-canvas').evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext('2d');
    if (!context) return false;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 16) if (pixels[i] > 0) return true;
    return false;
  })).toBe(true);
  await page.locator('#close-tab').click();
  await expect(panel).not.toHaveClass(/expanded/);
  await expect(page.locator('body')).not.toHaveAttribute('data-open-panel', 'game');
});
