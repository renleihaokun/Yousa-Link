import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closePanel,
  getOpenPanel,
  onPanelClose,
  openPanel,
  subscribePanel
} from '../../src/scripts/panel-controller';

describe('panel controller', () => {
  beforeEach(() => {
    delete document.body.dataset.openPanel;
    document.body.className = '';
  });

  it('keeps a single open panel and emits compatible close events', () => {
    const close = vi.fn();
    const unsubscribeClose = onPanelClose('train', close);
    openPanel('train');
    openPanel('gallery');
    expect(getOpenPanel()).toBe('gallery');
    expect(document.body.classList.contains('panel-open')).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
    unsubscribeClose();
  });

  it('notifies subscribers on open and close', () => {
    const changes: Array<[string | null, string | null]> = [];
    const unsubscribe = subscribePanel((current, previous) => changes.push([current, previous]));
    openPanel('game');
    closePanel('game');
    expect(changes).toEqual([['game', null], [null, 'game']]);
    expect(getOpenPanel()).toBeNull();
    expect(document.body.classList.contains('panel-open')).toBe(false);
    unsubscribe();
  });
});
