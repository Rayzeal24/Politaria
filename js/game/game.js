import { Pool } from "../engine/pool.js";
import { dist2, TAU } from "../engine/math.js";

import { GAME_DEFAULTS, COLORS, TOWER_DATA, TOWER_TYPES, TERRAIN } from "./config.js";
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

    // === TERRAIN CACHE (nouveau) ===
    this._terrainCanvas = document.createElement("canvas");
    this._terrainCanvas.width = this.canvas.width;
    this._terrainCanvas.height = this.canvas.height;
    this._terrainCtx = this._terrainCanvas.getContext("2d", { alpha: false });
    this._generateTerrain(); // 1 seule fois

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
        this.economy.saveBestWave(Math.min(this.waveManager.waveIndex, this.waveManager.waveCount));
      }
    }

    // Update enemies
    this.enemyPool.forEachActive((e) => {
      e.update(dt, this.level.waypoints);
      if (e.reached && e.active) {
        this.economy.loseLife(1);
        this.waveManager.onEnemyRemoved();
        this.enemyPool.release(e);
      } else if (e.dead && e.active) {
        this.economy.earn(e.goldReward);
        this.waveManager.onEnemyRemoved();
        this.enemyPool.release(e);
      }
    });

    // Game over
    if (this.economy.lives <= 0) {
      this.paused = true;
      this.ui.updateHUD();
      this._handleInput();
      this.input.endFrame();
      return;
    }

    // Update soldiers
    this.soldierPool.forEachActive((s) => {
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

    // update HUD
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

    // === TERRAIN (nouveau) ===
    ctx.drawImage(this._terrainCanvas, 0, 0);

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
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "700 22px system-ui";
      ctx.fillText("Clique Start pour lancer les vagues", 270, 270);
      ctx.restore();
    }

    if (this.paused && this.economy.lives > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "700 22px system-ui";
      ctx.fillText("PAUSE", 430, 265);
      ctx.restore();
    }

    if (this.economy.lives <= 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.45)";
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
    if (this.selection.type === "tower" && this.selection.tower && this.selection.tower.active) {
      return this.selection.tower;
    }
    if (this._hoverPad !== -1) {
      const t = this.towersByPad[this._hoverPad];
      if (t && t.active) return t;
    }
    return null;
  }

  // =========================
  // TERRAIN GENERATION (nouveau)
  // =========================

  _generateTerrain() {
    const ctx = this._terrainCtx;
    const w = this._terrainCanvas.width;
    const h = this._terrainCanvas.height;

    // ImageData (1 seule alloc)
    const img = ctx.createImageData(w, h);
    const data = img.data;

    const wps = this.level.waypoints;

    // Prebuild segments for distance checks (no alloc per pixel)
    const segCount = wps.length - 1;
    const segAx = new Float32Array(segCount);
    const segAy = new Float32Array(segCount);
    const segBx = new Float32Array(segCount);
    const segBy = new Float32Array(segCount);

    for (let i = 0; i < segCount; i++) {
      segAx[i] = wps[i].x;   segAy[i] = wps[i].y;
      segBx[i] = wps[i+1].x; segBy[i] = wps[i+1].y;
    }

    const maxD = TERRAIN.gradientMaxDist;

    const near = TERRAIN.nearPath;
    const far  = TERRAIN.farPath;

    const plainsTint = TERRAIN.plainsTint;
    const forestTint = TERRAIN.forestTint;

    const noiseStrength = TERRAIN.noiseStrength;
    const forestStart = TERRAIN.forestStart;

    // Helpers
    const clamp01 = (t) => (t < 0 ? 0 : (t > 1 ? 1 : t));
    const lerp = (a, b, t) => a + (b - a) * t;

    // Distance point -> segment (squared)
    const distPointSeg2 = (px, py, ax, ay, bx, by) => {
      const abx = bx - ax, aby = by - ay;
      const apx = px - ax, apy = py - ay;
      const ab2 = abx * abx + aby * aby;
      if (ab2 <= 1e-8) {
        const dx = px - ax, dy = py - ay;
        return dx * dx + dy * dy;
      }
      let t = (apx * abx + apy * aby) / ab2;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const cx = ax + abx * t;
      const cy = ay + aby * t;
      const dx = px - cx, dy = py - cy;
      return dx * dx + dy * dy;
    };

    // Fast hash noise 0..1 (int)
    const hash01 = (x, y) => {
      let n = (x | 0) * 374761393 + (y | 0) * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      n = n ^ (n >> 16);
      return (n >>> 0) / 4294967295;
    };

    // Fill pixels
    let idx = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // min distance to path polyline
        let minD2 = 1e18;
        for (let i = 0; i < segCount; i++) {
          const d2 = distPointSeg2(x, y, segAx[i], segAy[i], segBx[i], segBy[i]);
          if (d2 < minD2) minD2 = d2;
        }

        const d = Math.sqrt(minD2);
        const t = clamp01(d / maxD); // 0 near path -> 1 far

        // Base gradient color
        let r = lerp(near[0], far[0], t);
        let g = lerp(near[1], far[1], t);
        let b = lerp(near[2], far[2], t);

        // Biome decision: farther => more forest, closer => more plains
        // Add noise so it's not a straight ring around the road
        const n1 = hash01(x >> 3, y >> 3); // low frequency
        const n2 = hash01(x >> 1, y >> 1); // high freq
        const noise = (n1 * 0.7 + n2 * 0.3) - 0.5; // -0.5..0.5

        const biomeFactor = clamp01((t - forestStart) / (1 - forestStart)); // 0..1
        const forestiness = clamp01(biomeFactor + noise * 0.35);

        // Apply tint blend between plains and forest
        // plains: slight boost, forest: slight darken
        const tr = lerp(plainsTint[0], forestTint[0], forestiness);
        const tg = lerp(plainsTint[1], forestTint[1], forestiness);
        const tb = lerp(plainsTint[2], forestTint[2], forestiness);

        r += tr;
        g += tg;
        b += tb;

        // Add subtle texture noise
        const tex = noise * (255 * noiseStrength);
        r += tex * 0.35;
        g += tex * 0.50;
        b += tex * 0.25;

        // Optional "tree specks" in forest areas (rare dots)
        if (forestiness > 0.55) {
          const tseed = hash01(x >> 2, y >> 2);
          if (tseed > 0.985) {
            // darker dot = tree canopy
            r *= 0.65; g *= 0.70; b *= 0.65;
          }
        }

        // Clamp 0..255
        r = r < 0 ? 0 : (r > 255 ? 255 : r);
        g = g < 0 ? 0 : (g > 255 ? 255 : g);
        b = b < 0 ? 0 : (b > 255 ? 255 : b);

        data[idx++] = r | 0;
        data[idx++] = g | 0;
        data[idx++] = b | 0;
        data[idx++] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    // Add a light vignette to match your UI (cheap, 1 time)
    ctx.save();
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 60, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Add subtle grid overlay (1 time)
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    for (let gx = 0; gx <= w; gx += 48) { ctx.moveTo(gx, 0); ctx.lineTo(gx, h); }
    for (let gy = 0; gy <= h; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(w, gy); }
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.stroke();
    ctx.restore();
  }
}
