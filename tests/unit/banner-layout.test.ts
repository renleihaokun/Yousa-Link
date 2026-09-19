import { describe, expect, it } from 'vitest';
import {
  formatCardStyle,
  getCardStyleVars,
  getExpandedHeight,
  getStackedHeight,
  isCardHidden
} from '../../src/components/TrainScreen/banner-layout';

describe('train banner layout', () => {
  it('sizes the collapsed stack from the visible slots', () => {
    expect(getStackedHeight(1)).toBe(96);
    expect(getStackedHeight(7)).toBe(120);
    expect(getStackedHeight(8)).toBe(120);
  });

  it('sizes the expanded list from the card count', () => {
    expect(getExpandedHeight(7)).toBe(786);
    expect(getExpandedHeight(8)).toBe(882);
  });

  it('hides every card past the third slot', () => {
    expect([0, 1, 2, 3, 7].map(isCardHidden)).toEqual([false, false, false, true, true]);
  });

  it('derives slot variables for the stack and the expanded list', () => {
    expect(getCardStyleVars(0, 7)).toEqual({
      '--stack-top': '0px',
      '--stack-left': '0%',
      '--stack-width': 'calc(100% - 0%)',
      '--stack-bright': '1',
      '--stack-z': '7',
      '--exp-top': '52px',
      '--exp-left': '30px',
      '--exp-width': 'calc(100% - 60px)',
      '--exp-bright': '1',
      '--exp-z': '7',
      '--expand-delay': '0ms',
      '--collapse-delay': '84ms'
    });

    expect(getCardStyleVars(3, 7)).toEqual({
      '--stack-top': '24px',
      '--stack-left': '8%',
      '--stack-width': 'calc(100% - 16%)',
      '--stack-bright': '0.4',
      '--stack-z': '4',
      '--exp-top': '340px',
      '--exp-left': '30px',
      '--exp-width': 'calc(100% - 60px)',
      '--exp-bright': '1',
      '--exp-z': '4',
      '--expand-delay': '84ms',
      '--collapse-delay': '0ms'
    });
  });

  it('serializes slot variables for inline styles', () => {
    expect(formatCardStyle({ '--stack-top': '0px', '--stack-z': '7' })).toBe('--stack-top: 0px; --stack-z: 7;');
  });
});
