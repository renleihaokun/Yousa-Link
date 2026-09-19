export const BANNER_MAX_VISIBLE = 3;
export const BANNER_OFFSET = 12;
export const BANNER_WIDTH_STEP = 0.08;
export const BANNER_BRIGHTNESS_STEP = 0.3;
export const BANNER_CARD_HEIGHT = 82;
export const BANNER_GAP = 14;
export const BANNER_HEADER_HEIGHT = 52;
export const BANNER_FOOTER_HEIGHT = 48;
export const BANNER_PADDING = 14;

const BANNER_STAGGER_MS = 42;

export function getStackedHeight(count: number) {
  const visible = Math.max(1, Math.min(count, BANNER_MAX_VISIBLE));
  return BANNER_CARD_HEIGHT + (visible - 1) * BANNER_OFFSET + BANNER_PADDING;
}

export function getExpandedHeight(count: number) {
  return BANNER_HEADER_HEIGHT
    + count * BANNER_CARD_HEIGHT
    + Math.max(0, count - 1) * BANNER_GAP
    + BANNER_FOOTER_HEIGHT
    + BANNER_PADDING * 2;
}

export function isCardHidden(slot: number) {
  return slot >= BANNER_MAX_VISIBLE;
}

export function getCardStyleVars(slot: number, count: number) {
  const stacked = Math.min(slot, BANNER_MAX_VISIBLE - 1);
  const expandDelay = stacked * BANNER_STAGGER_MS;
  const collapseDelay = Math.max(0, BANNER_MAX_VISIBLE - 1 - stacked) * BANNER_STAGGER_MS;
  return {
    '--stack-top': `${stacked * BANNER_OFFSET}px`,
    '--stack-left': `${stacked * 4}%`,
    '--stack-width': `calc(100% - ${stacked * (BANNER_WIDTH_STEP * 100)}%)`,
    '--stack-bright': `${Math.max(0.2, 1 - stacked * BANNER_BRIGHTNESS_STEP)}`,
    '--stack-z': `${count - slot}`,
    '--exp-top': `${BANNER_HEADER_HEIGHT + slot * (BANNER_CARD_HEIGHT + BANNER_GAP)}px`,
    '--exp-left': '30px',
    '--exp-width': 'calc(100% - 60px)',
    '--exp-bright': '1',
    '--exp-z': `${count - slot}`,
    '--expand-delay': `${expandDelay}ms`,
    '--collapse-delay': `${collapseDelay}ms`
  };
}

export function formatCardStyle(vars: Record<string, string>) {
  return Object.entries(vars).map(([name, value]) => `${name}: ${value};`).join(' ');
}
