
import { TOWER_DATA, TOWER_TYPES, TARGETING } from "../config.js";
import { pickTarget } from "../systems/targeting.js";

export class Tower {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0; this.y = 0;
    this.padIndex = -1;

    this.type = null;
    this.level = 0;
    this.mode = TARGETING.FIRST;

    this.cooldown = 0;

    // barracks
    this.soldierSlots = [null, null, null]; // indices in soldier pool items array? We'll store refs
    this._spawnTimer = 0;
  }

  build(type, x, y, padIndex) {
    this.active = true;
    this.type = type;
    this.x = x; this.y = y;
    this.padIndex = padIndex;
    this.level = 0;
    this.mode = TARGETING.FIRST;
    this.cooldown = 0;
    this._spawnTimer = 0;
    this.soldierSlots[0] = this.soldierSlots[1] = this.soldierSlots[2] = null;
  }

  getStats() {
    const def = TOWER_DATA[this.type];
    return def.levels[this.level];
  }

  canUpgrade() {
    return this.level < 2;
  }

  getUpgradeCost() {
    if (!this.canUpgrade()) return 0;
    return TOWER_DATA[this.type].upgradeCosts[this.level];
  }

  upgrade() {
    if (!this.canUpgrade()) return false;
    this.level += 1;
    // reset cooldown a bit to feel responsive
    this.cooldown = 0;
    return true;
  }

  getSellValue() {
    const def = TOWER_DATA[this.type];
    let spent = def.cost;
    if (this.level >= 1) spent += def.upgradeCosts[0];
    if (this.level >= 2) spent += def.upgradeCosts[1];
    return Math.floor(spent * def.sellRatio);
  }

  update(dt, ctxGame) {
    if (!this.active) return;

    this.cooldown -= dt;
    if (this.cooldown < 0) this.cooldown = 0;

    const { enemies, enemyList, projectiles, soldierPool } = ctxGame;

    if (this.type === TOWER_TYPES.BARRACKS) {
      const s = this.getStats();
      this._spawnTimer -= dt;
      if (this._spawnTimer < 0) this._spawnTimer = 0;

      // ensure 3 soldiers exist; respawn is handled in Soldier itself
      for (let i = 0; i < 3; i++) {
        let sol = this.soldierSlots[i];
        if (!sol || !sol.active) {
          // acquire from pool
          sol = soldierPool.acquire();
          if (!sol) continue;
          const angle = (i / 3) * Math.PI * 2;
          const ox = Math.cos(angle) * 16;
          const oy = Math.sin(angle) * 16;
          sol.spawn(this.x + ox, this.y + oy, s.soldierHp, s.soldierDps, s.soldierRange, s.leash);
          this.soldierSlots[i] = sol;
        } else {
          // keep soldier stats synced with upgrades (no allocation)
          sol.maxHp = s.soldierHp;
          sol.dps = s.soldierDps;
          sol.meleeRange = s.soldierRange;
          sol.leash = s.leash;
        }

        // if soldier died from future extension -> already handles respawn
      }

      return;
    }

    const st = this.getStats();
    if (this.cooldown > 0) return;

    // pick target without allocations (use enemyList which is fixed array of pool items)
    const target = pickTarget(this.mode, this.x, this.y, st.range, enemyList);
    if (!target) return;

    const p = projectiles.acquire();
    if (!p) return;

    p.reset();
    p.fire(this.x, this.y, target, st.projSpeed, st.dmg, st.type, st.splash || 0);

    this.cooldown = 1 / st.fireRate;
  }
}
