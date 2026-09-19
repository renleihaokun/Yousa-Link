import type { Page } from '@playwright/test';

/**
 * 等车站大屏的展开/收起过渡真正跑完。
 *
 * 大屏的展开动画是 CSS 过渡（0.54s + 每张卡片的错峰延迟 + 回弹动画），
 * component 里那个 `rebounding` 类只存在 720ms，CI 上点完再断言常常已经消失，
 * 所以这里直接看卡堆与卡片上还有没有没跑完的动画。
 */
export async function settleBannerAnimation(page: Page) {
  // 先放过两帧，确保浏览器已经把过渡创建出来
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.waitForFunction(() => {
    const stack = document.getElementById('card-stack');
    if (!stack) return false;
    const nodes = [stack, ...stack.querySelectorAll('.tour-card')];
    return nodes.every((node) => node.getAnimations()
      .every((animation) => animation.playState === 'finished' || animation.playState === 'idle'));
  });
}
