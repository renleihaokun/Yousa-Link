import { describe, expect, it } from 'vitest';
import { PEEK_MAX_SCROLL_Y, shouldPeekTimeline } from '../../src/domain/timeline-hint';

describe('timeline peek hint', () => {
  const idleState = {
    reducedMotion: false,
    scrollY: 0,
    timelineActive: false,
    panelOpen: false
  };

  it('peeks on a page that is still sitting at the top', () => {
    expect(shouldPeekTimeline(idleState)).toBe(true);
    expect(shouldPeekTimeline({ ...idleState, scrollY: PEEK_MAX_SCROLL_Y })).toBe(true);
  });

  it('stays quiet when motion is reduced, the page moved, or something is already open', () => {
    expect(shouldPeekTimeline({ ...idleState, reducedMotion: true })).toBe(false);
    expect(shouldPeekTimeline({ ...idleState, scrollY: PEEK_MAX_SCROLL_Y + 1 })).toBe(false);
    expect(shouldPeekTimeline({ ...idleState, timelineActive: true })).toBe(false);
    expect(shouldPeekTimeline({ ...idleState, panelOpen: true })).toBe(false);
  });
});
