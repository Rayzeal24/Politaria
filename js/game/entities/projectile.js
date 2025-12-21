
import { dist2, norm } from "../../engine/math.js";

export class Projectile {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.r = 4;

    this.damage = 10;
    this.dmgType = "phys";

    this.splash = 0; // artillery AoE radius
    this.target = null;

    this.life = 0;
    this.maxLife = 2.0;
  }

  fire(fromX, fromY, target, speed, damage, dmgType, splash = 0) {
    this.active = true;
    this.x = fromX; this.y = fromY;
    this.target = target;
    this.damage = damage;
    this.dmgType = dmgType;
    this.splash = splash;

    this.life = 0;
    this.maxLife = 2.2;

    // lead-less homing-ish: recompute dir each update
    const dx = target.x - fromX;
    const dy = target.y - fromY;
    const n = norm(dx, dy);
    this.vx = n.x * speed;
    this.vy = n.y * speed;
  }

  update(dt, enemies, onHit) {
    if (!this.active) return;

    this.life += dt;
    if (this.life > this.maxLife) {
      this.active = false;
      return;
    }

    // If target died -> still travel straight (keep vx/vy)
    if (this.target && this.target.active && !this.target.dead && !this.target.reached) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const n = norm(dx, dy);
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      this.vx = n.x * speed;
      this.vy = n.y * speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Collision simple: check against target first, else cheap scan
    if (this.target && this.target.active && !this.target.dead && !this.target.reached) {
      const hitR = this.r + this.target.r;
      if (dist2(this.x, this.y, this.target.x, this.target.y) <= hitR * hitR) {
        onHit(this, this.target, enemies);
        this.active = false;
      }
      return;
    }

    // fallback scan
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active || e.dead || e.reached) continue;
      const hitR = this.r + e.r;
      if (dist2(this.x, this.y, e.x, e.y) <= hitR * hitR) {
        onHit(this, e, enemies);
        this.active = false;
        return;
      }
    }
  }
}
