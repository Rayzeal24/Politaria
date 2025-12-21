
import { dist2, norm } from "../../engine/math.js";

export class Enemy {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0;
    this.r = 12;

    this.maxHp = 100;
    this.hp = 100;
    this.speed = 50;

    this.armor = 0;
    this.mResist = 0;

    this.goldReward = 5;

    this.dead = false;
    this.reached = false;

    this.wpIndex = 0;
    this.pathIndexProgress = 0; // monotonic for "FIRST" targeting

    this.blockedBy = null; // Soldier
  }

  spawn(archetype, waypoints) {
    this.active = true;
    this.dead = false;
    this.reached = false;
    this.blockedBy = null;

    this.maxHp = archetype.maxHp;
    this.hp = archetype.maxHp;
    this.speed = archetype.speed;
    this.armor = archetype.armor;
    this.mResist = archetype.mResist;
    this.goldReward = archetype.goldReward;

    this.wpIndex = 0;
    this.pathIndexProgress = 0;

    // start at waypoint 0 position (can be outside screen)
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
  }

  update(dt, waypoints) {
    if (!this.active || this.dead || this.reached) return;

    if (this.hp <= 0) {
      this.dead = true;
      return;
    }

    // If blocked by soldier and still in melee range, stop
    if (this.blockedBy && this.blockedBy.active) {
      const d2 = dist2(this.x, this.y, this.blockedBy.x, this.blockedBy.y);
      const stopR = (this.r + this.blockedBy.r + 2);
      if (d2 <= stopR * stopR) {
        // stay blocked
        return;
      }
      // soldier moved away -> unblocked
      this.blockedBy = null;
    }

    const nextIndex = this.wpIndex + 1;
    if (nextIndex >= waypoints.length) {
      this.reached = true;
      return;
    }

    const a = waypoints[this.wpIndex];
    const b = waypoints[nextIndex];

    const dx = b.x - this.x;
    const dy = b.y - this.y;
    const n = norm(dx, dy);

    const step = this.speed * dt;
    if (n.l <= step) {
      this.x = b.x;
      this.y = b.y;
      this.wpIndex = nextIndex;
      this.pathIndexProgress += 1;
      if (this.wpIndex >= waypoints.length - 1) {
        // next update will mark reached when it tries to go past end
      }
    } else {
      this.x += n.x * step;
      this.y += n.y * step;
      // progress is approximate but monotonic
      this.pathIndexProgress += step * 0.002;
    }
  }
}
