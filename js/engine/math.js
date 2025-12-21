
export const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return v < a ? a : (v > b ? b : v);
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

export function len(dx, dy) {
  return Math.sqrt(dx * dx + dy * dy);
}

export function norm(dx, dy) {
  const l = Math.sqrt(dx * dx + dy * dy);
  if (l <= 1e-8) return { x: 0, y: 0, l: 0 };
  return { x: dx / l, y: dy / l, l };
}
