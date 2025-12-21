
import { dist2, norm, clamp } from "../../engine/math.js";
import { applyDamage } from "../systems/damage.js";

export class Soldier {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0;
    this.homeX = 0; this.homeY = 0;

    this.r = 10;

    this.maxHp = 60;
    this.hp = 60;

    this.dps = 10;           // melee damage per second
    this.meleeRange = 18;
    this.leash = 75;

    this.target = null;      // Enemy
    this.respawnTimer = 0;
    this.dead = false;
  }

  spawn(x, y, maxHp, dps, meleeRange, leash) {
    this.active = true;
    this.dead = false;
    this.respawnTimer = 0;

    this.homeX = x; this.homeY = y;
    this.x = x; this.y = y;

    this.maxHp = maxHp;
    this.hp = maxHp;

    this.dps = dps;
    this.meleeRange = meleeRange;
    this.leash = leash;

    this.target = null;
  }

  kill(respawnSeconds) {
    this.dead = true;
    this.respawnTimer = respawnSeconds;
    this.target = null;
    this.hp = 0;
  }

  update(dt, enemies, respawnSeconds) {
    if (!this.active) return;

    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp = this.maxHp;
        this.x = this.homeX;
        this.y = this.homeY;
      }
      return;
    }

    // Acquire target if none or invalid
    if (!this.target || !this.target.active || this.target.dead || this.target.reached) {
      this.target = null;

      // find enemy close to home within leash
      const leash2 = this.leash * this.leash;
      let best = null;
      let bestD2 = 1e18;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.active || e.dead || e.reached) continue;
        const d2h = dist2(this.homeX, this.homeY, e.x, e.y);
        if (d2h > leash2) continue;
        const d2s = dist2(this.x, this.y, e.x, e.y);
        if (d2s < bestD2) {
          bestD2 = d2s;
          best = e;
        }
      }
      if (best) {
        this.target = best;
        best.blockedBy = this;
      }
    }

    // Move slightly towards target, else return to home
    const speed = 85;
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const n = norm(dx, dy);
      const step = speed * dt;

      // If in melee range -> deal damage over time and keep enemy blocked
      if (n.l <= this.meleeRange + this.target.r + 1) {
        this.target.blockedBy = this;
        applyDamage(this.target, this.dps * dt, "phys");
        return;
      }

      // chase but clamp within leash radius (soft)
      if (n.l > 1e-6) {
        this.x += n.x * step;
        this.y += n.y * step;
      }

      // If soldier goes too far from home, drop target
      const leash2 = this.leash * this.leash;
      if (dist2(this.homeX, this.homeY, this.x, this.y) > leash2) {
        this.target = null;
      }
      return;
    }

    // Return home
    const dx = this.homeX - this.x;
    const dy = this.homeY - this.y;
    const n = norm(dx, dy);
    const step = speed * dt;
    if (n.l <= step) {
      this.x = this.homeX;
      this.y = this.homeY;
    } else {
      this.x += n.x * step;
      this.y += n.y * step;
    }

    // tiny clamp inside canvas-ish (security)
    this.x = clamp(this.x, -50, 1010);
    this.y = clamp(this.y, -50, 600);
  }
}
