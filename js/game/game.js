
import { Pool } from "../engine/pool.js";
import { dist2, TAU } from "../engine/math.js";

import { GAME_DEFAULTS, COLORS, TOWER_DATA, TOWER_TYPES } from "./config.js";
import { createDemoLevel } from "./level.js";

import { Economy } from "./managers/economy.js";
import { WaveManager } from "./managers/waveManager.js";
import { UIManager } from "./managers/ui.js";

import { Enemy } from "./entities/enemy.js";
import { Tower } from "./entities/tower.js";
import { Projectile } from "./entities/projectile.js";
import { Soldier } from "./entities/soldier.js";

import { applyDamage } from "./systems/damage.js";

export class Game {
  constructor(canvas, ctx, input) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;

    this.level = createDemoLevel();

    this.economy = new Economy();

    // Pools (prealloc)
    this.enemyPool = new Pool(() => new Enemy(), 128);
    this.projectilePool = new Pool(() => new Projectile(), 256);
    this.soldierPool = new Pool(() => new Soldier(), 64);

    // Towers: fixed per pad (no alloc per frame)
    this.towersByPad = new Array(this.level.pads.length);
    for (let i = 0; i < this.towersByPad.length; i++) {
      this.towersByPad[i] = new Tower();
    }

    // Convenience: fixed arrays for fast scanning (avoid allocations)
    this.enemyList = this.enemyPool.items;
    this.projectileList = this.projectilePool.items;
    this.soldierList = this.soldierPool.items;

    this.waveManager = new WaveManager(this.enemyPool, this.level.waypoints);
    this.ui = new UIManager(this);

    this.paused = false;
    this._started = false;

    // Selection state
    this.selection = { type: "none", padIndex: -1, tower: null };
    this._hoverPad = -1;

    // Bind initial panel + HUD
    this.ui.updateHUD();
    this.ui.renderPanel(this.selection);
  }

  startWaves() {
    if (this._started) return;
    this._started = true;
    this.waveManager.start();
  }

  togglePause() {
    this.paused = !this.paused;
    this.ui.updateHUD();
  }

  buildTower(padIndex, towerType) {
    const def = TOWER_DATA[towerType];
    if (!def) return;
    if (!this.economy.canAfford(def.cost)) return;

    const pad = this.level.pads[padIndex];
    const tower = this.towersByPad[padIndex];
    if (tower.active) return;

    this.economy.spend(def.cost);
    tower.build(towerType, pad.x, pad.y, padIndex);

    this.selection = { type: "tower", padIndex, tower };
    this.ui.updateHUD();
    this.ui.renderPanel(this.selection);
  }

  upgradeTower(tower) {
    if (!tower || !tower.active) return;
    if (!tower.canUpgrade()) return;

    const cost = tower.getUpgradeCost();
    if (!this.economy.canAfford(cost)) return;

    this.economy.spend(cost);
    tower.upgrade();

    this.ui.updateHUD();
    this.ui.renderPanel({ type: "tower", padIndex: tower.padIndex, tower });
  }

  sellTower(tower) {
    if (!tower || !tower.active) return;

    const value = tower.getSellValue();
    this.economy.earn(value);

    // release soldiers if barracks
    if (tower.type === TOWER_TYPES.BARRACKS) {
      for (let i = 0; i < 3; i++) {
        const sol = tower.soldierSlots[i];
        if (sol && sol.active) {
          this.soldierPool.release(sol);
        }
        tower.soldierSlots[i] = null;
      }
    }

    tower.reset();
    tower.active = false;

    this.selection = { type: "pad", padIndex: tower.padIndex, tower: null };
    this.ui.updateHUD();
    this.ui.renderPanel(this.selection);
  }

  update(dt) {
    this.input.beginFrame();
    if (this.paused) {
      this._handleInput();
      this.input.endFrame();
      return;
    }

    // Waves
    if (this._started) {
      const { waveEnded } = this.waveManager.update(dt);
      if (waveEnded) {
        // Save best wave (1-based waveIndex; waveIndex already advanced)
        this.economy.saveBestWave(Math.min(this.waveManager.waveIndex, this.waveManager.waveCount));
      }
    }

    // Update enemies
    this.enemyPool.forEachActive((e) => {
      e.update(dt, this.level.waypoints);
      if (e.reached && e.active) {
        // reached base -> lose life and remove enemy
        this.economy.loseLife(1);
        this.waveManager.onEnemyRemoved();
        this.enemyPool.release(e);
      } else if (e.dead && e.active) {
        // reward + remove
        this.economy.earn(e.goldReward);
        this.waveManager.onEnemyRemoved();
        this.enemyPool.release(e);
      }
    });

    // Game over (simple)
    if (this.economy.lives <= 0) {
      this.paused = true;
      this.ui.updateHUD();
      this._handleInput();
      this.input.endFrame();
      return;
    }

    // Update soldiers
    // respawnSeconds from barracks stats per soldier (already stored in each soldier as timer)
    this.soldierPool.forEachActive((s) => {
      // respawn seconds: soldier keeps its own timer; pass a default (not used in this impl except kill)
      s.update(dt, this.enemyList, 4.0);
      if (s.active && !s.dead && s.hp <= 0) {
        s.kill(4.5);
      }
    });

    // Update towers
    const ctxGame = {
      enemies: this.enemyPool,
      enemyList: this.enemyList,
      projectiles: this.projectilePool,
      soldierPool: this.soldierPool,
    };

    for (let i = 0; i < this.towersByPad.length; i++) {
      const t = this.towersByPad[i];
      if (t.active) t.update(dt, ctxGame);
    }

    // Update projectiles + hits
    this.projectilePool.forEachActive((p) => {
      p.update(dt, this.enemyList, (proj, hitEnemy, enemies) => {
        if (!hitEnemy || hitEnemy.dead || hitEnemy.reached) return;

        if (proj.splash && proj.splash > 0) {
          const r2 = proj.splash * proj.splash;
          for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.active || e.dead || e.reached) continue;
            if (dist2(proj.x, proj.y, e.x, e.y) <= r2) {
              applyDamage(e, proj.damage, proj.dmgType);
            }
          }
        } else {
          applyDamage(hitEnemy, proj.damage, proj.dmgType);
        }
      });

      if (!p.active) this.projectilePool.release(p);
    });

    // handle input last
    this._handleInput();

    // update HUD (cheap)
    this.ui.updateHUD();

    this.input.endFrame();
  }

  _handleInput() {
    // hover pad detection (no alloc)
    this._hoverPad = -1;
    const mx = this.input.mx, my = this.input.my;

    for (let i = 0; i < this.level.pads.length; i++) {
      const pad = this.level.pads[i];
      const rr = (pad.r + 8);
      if (dist2(mx, my, pad.x, pad.y) <= rr * rr) {
        this._hoverPad = i;
        break;
      }
    }

    if (!this.input.consumeClick()) return;

    // click pad?
    if (this._hoverPad !== -1) {
      const tower = this.towersByPad[this._hoverPad];
      if (tower && tower.active) {
        this.selection = { type: "tower", padIndex: this._hoverPad, tower };
      } else {
        this.selection = { type: "pad", padIndex: this._hoverPad, tower: null };
      }
      this.ui.renderPanel(this.selection);
      return;
    }

    // click empty -> clear selection
    this.selection = { type: "none", padIndex: -1, tower: null };
    this.ui.renderPanel(this.selection);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // clear
    ctx.clearRect(0, 0, w, h);

    // background grid-ish
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 48) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 48) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.strokeStyle = "rgba(255,255,255,.15)";
    ctx.stroke();
    ctx.restore();

    // path
    this._renderPath(ctx);

    // base
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.level.base.x, this.level.base.y, this.level.base.r, 0, TAU);
    ctx.fillStyle = "rgba(255,215,74,.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,74,.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // pads
    for (let i = 0; i < this.level.pads.length; i++) {
      const pad = this.level.pads[i];
      const hovered = (i === this._hoverPad);
      const selectedPad = (this.selection.type === "pad" && this.selection.padIndex === i);
      const selectedTower = (this.selection.type === "tower" && this.selection.padIndex === i);

      ctx.save();
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, pad.r, 0, TAU);
      ctx.fillStyle = hovered || selectedPad || selectedTower ? "rgba(255,255,255,.14)" : COLORS.pad;
      ctx.fill();
      ctx.strokeStyle = hovered || selectedPad || selectedTower ? "rgba(255,255,255,.35)" : COLORS.padStroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // towers
    for (let i = 0; i < this.towersByPad.length; i++) {
      const t = this.towersByPad[i];
      if (!t.active) continue;
      this._renderTower(ctx, t);
    }

    // range overlay (hover or selected)
    const rangeTower = this._getRangeTower();
    if (rangeTower) this._renderRange(ctx, rangeTower);

    // soldiers
    this.soldierPool.forEachActive((s) => {
      if (s.dead) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fillStyle = "rgba(180,220,255,.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.stroke();
      ctx.restore();
    });

    // enemies + hp bars
    this.enemyPool.forEachActive((e) => {
      if (e.dead || e.reached) return;

      ctx.save();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, TAU);

      // small tint based on resistances
      const isArmored = e.armor > 0.18;
      const isMagic = e.mResist > 0.18;
      ctx.fillStyle = isMagic ? COLORS.enemyMagic : (isArmored ? COLORS.enemyArmor : COLORS.enemy);
      ctx.fill();

      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // hp bar
      const bw = 28, bh = 5;
      const px = e.x - bw / 2;
      const py = e.y - e.r - 12;

      ctx.fillStyle = COLORS.hpBack;
      ctx.fillRect(px, py, bw, bh);

      const ratio = e.hp / e.maxHp;
      ctx.fillStyle = COLORS.hpFront;
      ctx.fillRect(px, py, bw * (ratio < 0 ? 0 : ratio), bh);

      ctx.restore();
    });

    // projectiles
    this.projectilePool.forEachActive((p) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fillStyle = p.dmgType === "magic" ? "rgba(190,140,255,.95)" : "rgba(255,255,255,.9)";
      ctx.fill();
      ctx.restore();
    });

    // overlays
    if (!this._started) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "700 22px system-ui";
      ctx.fillText("Clique Start pour lancer les vagues", 270, 270);
      ctx.restore();
    }

    if (this.paused && this.economy.lives > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "700 22px system-ui";
      ctx.fillText("PAUSE", 430, 265);
      ctx.restore();
    }

    if (this.economy.lives <= 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.50)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,120,120,.95)";
      ctx.font = "800 28px system-ui";
      ctx.fillText("GAME OVER", 380, 255);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "500 14px system-ui";
      ctx.fillText("Refresh la page pour recommencer.", 380, 280);
      ctx.restore();
    }
  }

  _renderPath(ctx) {
    const wps = this.level.waypoints;

    ctx.save();
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.stroke();

    ctx.restore();
  }

  _renderTower(ctx, t) {
    const name = t.type;

    ctx.save();
    ctx.translate(t.x, t.y);

    // base
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,.20)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.stroke();

    // top
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    if (name === "archer") ctx.fillStyle = "rgba(180,255,200,.85)";
    else if (name === "mage") ctx.fillStyle = "rgba(190,140,255,.85)";
    else if (name === "artillery") ctx.fillStyle = "rgba(255,215,74,.80)";
    else ctx.fillStyle = "rgba(120,180,255,.70)"; // barracks
    ctx.fill();

    // level pips
    ctx.fillStyle = "rgba(255,255,255,.8)";
    for (let i = 0; i <= t.level; i++) {
      ctx.fillRect(-10 + i * 7, 16, 5, 3);
    }

    ctx.restore();
  }

  _renderRange(ctx, t) {
    const st = t.getStats();
    const r = (t.type === "barracks") ? (st.leash) : st.range;

    ctx.save();
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, TAU);
    ctx.fillStyle = COLORS.range;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.stroke();
    ctx.restore();
  }

  _getRangeTower() {
    // If tower selected, show its range.
    if (this.selection.type === "tower" && this.selection.tower && this.selection.tower.active) {
      return this.selection.tower;
    }
    // If hover pad and tower exists, show.
    if (this._hoverPad !== -1) {
      const t = this.towersByPad[this._hoverPad];
      if (t && t.active) return t;
    }
    return null;
  }
}
