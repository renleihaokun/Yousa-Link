export type ChickenPhysicsState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
};

export function updateChickenPhysics(
  chicken: ChickenPhysicsState,
  dt: number,
  bounds: { width: number; height: number },
  bobbing: number,
  random = Math.random
) {
  const maxX = Math.max(0, bounds.width - chicken.width);
  const maxY = Math.max(0, bounds.height - chicken.height);
  chicken.x += chicken.vx * dt;
  chicken.y += chicken.vy * dt;
  if (chicken.x < 0) { chicken.x = 0; chicken.vx = Math.abs(chicken.vx); }
  if (chicken.x + chicken.width > bounds.width) { chicken.x = maxX; chicken.vx = -Math.abs(chicken.vx); }
  if (chicken.y < 0) { chicken.y = 0; chicken.vy = Math.abs(chicken.vy); }
  if (chicken.y + chicken.height > bounds.height) { chicken.y = maxY; chicken.vy = -Math.abs(chicken.vy); }
  if (random() < 1 - Math.pow(0.98, dt * 60)) {
    const angle = random() * Math.PI * 2;
    const speed = Math.min(360, Math.sqrt(chicken.vx * chicken.vx + chicken.vy * chicken.vy) + (random() - 0.5) * 120);
    chicken.vx = Math.cos(angle) * Math.max(180, speed);
    chicken.vy = Math.sin(angle) * Math.max(180, speed);
  }
  return bobbing + 4.8 * dt;
}

export function getChickenBobOffset(bobbing: number) {
  return Math.sin(bobbing) * 2;
}

export function isChickenHit(
  chicken: Pick<ChickenPhysicsState, 'x' | 'y' | 'width' | 'height'>,
  bobbing: number,
  mouse: { x: number; y: number },
  mask: { pixels: Uint8ClampedArray | null; width: number; height: number },
  alphaThreshold: number
) {
  const localX = mouse.x - chicken.x;
  const localY = mouse.y - chicken.y - getChickenBobOffset(bobbing);
  if (localX < 0 || localX >= chicken.width || localY < 0 || localY >= chicken.height) return false;
  if (!mask.pixels || !mask.width || !mask.height) return true;
  const pixelX = Math.min(mask.width - 1, Math.floor(localX / chicken.width * mask.width));
  const pixelY = Math.min(mask.height - 1, Math.floor(localY / chicken.height * mask.height));
  return mask.pixels[(pixelY * mask.width + pixelX) * 4 + 3] > alphaThreshold;
}
