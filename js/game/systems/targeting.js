
import { dist2 } from "../../engine/math.js";
import { TARGETING } from "../config.js";

export function pickTarget(mode, towerX, towerY, range, enemies) {
  const r2 = range * range;

  let best = null;
  if (mode === TARGETING.FIRST) {
    let bestProgress = -1;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active || e.dead || e.reached) continue;
      if (dist2(towerX, towerY, e.x, e.y) > r2) continue;
      if (e.pathIndexProgress > bestProgress) {
        bestProgress = e.pathIndexProgress;
        best = e;
      }
    }
    return best;
  }

  if (mode === TARGETING.CLOSEST) {
    let bestD2 = 1e18;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active || e.dead || e.reached) continue;
      const d2 = dist2(towerX, towerY, e.x, e.y);
      if (d2 > r2) continue;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  // STRONGEST
  let bestHp = -1;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e.active || e.dead || e.reached) continue;
    if (dist2(towerX, towerY, e.x, e.y) > r2) continue;
    if (e.hp > bestHp) {
      bestHp = e.hp;
      best = e;
    }
  }
  return best;
}
