export type BlurSource = 'timeline' | 'gallery' | 'game';

const MAX_BLUR = 18;
const blurValues = new Map<BlurSource, number>();
const activeAnimations = new Map<BlurSource, { frame: number; resolve: () => void }>();
let cachedLayer: HTMLElement | null = null;

function clampBlur(value: number) {
  return Math.min(MAX_BLUR, Math.max(0, value));
}

function getLayer() {
  cachedLayer ??= document.getElementById('scene-blur-layer');
  return cachedLayer;
}

function applySceneBlur() {
  const layer = getLayer();
  if (!layer) return;

  const blur = Math.max(0, ...blurValues.values());
  layer.style.setProperty('--scene-blur', `${blur.toFixed(2)}px`);
  layer.classList.toggle('active', blur > 0.01);
}

function writeSceneBlur(source: BlurSource, value: number) {
  const blur = clampBlur(value);
  if (blur <= 0.01) blurValues.delete(source);
  else blurValues.set(source, blur);
  applySceneBlur();
}

function cancelSceneBlurAnimation(source: BlurSource) {
  const active = activeAnimations.get(source);
  if (!active) return;
  cancelAnimationFrame(active.frame);
  activeAnimations.delete(source);
  active.resolve();
}

export function getSceneBlur(source: BlurSource) {
  return blurValues.get(source) ?? 0;
}

export function getCurrentSceneBlur() {
  return Math.max(0, ...blurValues.values());
}

export function setSceneBlur(source: BlurSource, value: number) {
  cancelSceneBlurAnimation(source);
  writeSceneBlur(source, value);
}

export function clearSceneBlur(source: BlurSource) {
  cancelSceneBlurAnimation(source);
  writeSceneBlur(source, 0);
}

export function animateSceneBlur(source: BlurSource, target: number, duration: number) {
  cancelSceneBlurAnimation(source);

  const from = getSceneBlur(source);
  const to = clampBlur(target);
  if (duration <= 0 || Math.abs(to - from) <= 0.01) {
    writeSceneBlur(source, to);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const start = performance.now();
    const state = { frame: 0, resolve };
    activeAnimations.set(source, state);

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      writeSceneBlur(source, from + (to - from) * eased);

      if (progress >= 1) {
        activeAnimations.delete(source);
        resolve();
        return;
      }

      state.frame = requestAnimationFrame(step);
    };

    state.frame = requestAnimationFrame(step);
  });
}
