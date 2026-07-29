import { describe, expect, it } from 'vitest';
import { getChickenBobOffset, isChickenHit, updateChickenPhysics } from '../../src/domain/game-physics';

describe('game physics', () => {
  it('keeps movement, bounce, and bobbing parameters deterministic', () => {
    const chicken = { x: 95, y: 10, vx: 20, vy: -40, width: 10, height: 10 };
    const bobbing = updateChickenPhysics(chicken, 0.5, { width: 100, height: 100 }, 0, () => 1);
    expect(chicken.x).toBe(90);
    expect(chicken.y).toBe(0);
    expect(chicken.vx).toBe(-20);
    expect(chicken.vy).toBe(40);
    expect(bobbing).toBe(2.4);
    expect(getChickenBobOffset(bobbing)).toBeCloseTo(1.3509, 3);
  });

  it('uses the same rectangular and alpha-mask hit thresholds', () => {
    const chicken = { x: 10, y: 20, width: 20, height: 20 };
    const pixels = new Uint8ClampedArray(2 * 2 * 4);
    pixels[3] = 200;
    expect(isChickenHit(chicken, 0, { x: 11, y: 21 }, { pixels, width: 2, height: 2 }, 128)).toBe(true);
    expect(isChickenHit(chicken, 0, { x: 30, y: 21 }, { pixels, width: 2, height: 2 }, 128)).toBe(false);
    pixels[3] = 20;
    expect(isChickenHit(chicken, 0, { x: 11, y: 21 }, { pixels, width: 2, height: 2 }, 128)).toBe(false);
  });
});
