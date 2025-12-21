
import { TOWER_DATA, TOWER_TYPES, TARGETING } from "../config.js";

export class UIManager {
  constructor(game) {
    this.game = game;

    this.elGold = document.getElementById("gold");
    this.elLives = document.getElementById("lives");
    this.elWave = document.getElementById("wave");
    this.elBest = document.getElementById("bestWave");

    this.btnStart = document.getElementById("btnStart");
    this.btnPause = document.getElementById("btnPause");

    this.panelBody = document.getElementById("panelBody");

    this.btnStart.addEventListener("click", () => this.game.startWaves());
    this.btnPause.addEventListener("click", () => this.game.togglePause());
  }

  updateHUD() {
    const g = this.game.economy;
    this.elGold.textContent = String(g.gold);
    this.elLives.textContent = String(g.lives);
    this.elWave.textContent = String(this.game.waveManager.currentWaveNumber());
    this.elBest.textContent = String(g.bestWave);

    this.btnPause.textContent = this.game.paused ? "Resume" : "Pause";
  }

  renderPanel(selection) {
    // selection: { type: "none"|"pad"|"tower", padIndex?, tower? }
    const g = this.game;

    if (!selection || selection.type === "none") {
      this.panelBody.innerHTML = `<div class="panel-empty">Sélectionne un pad / une tour.</div>`;
      return;
    }

    if (selection.type === "pad") {
      const pad = g.level.pads[selection.padIndex];
      const tower = g.towersByPad[selection.padIndex];
      if (tower && tower.active) {
        this.renderTowerPanel(tower);
        return;
      }
      // Build menu
      const buttons = [
        { t: TOWER_TYPES.ARCHER, label: "Archer", cost: TOWER_DATA[TOWER_TYPES.ARCHER].cost },
        { t: TOWER_TYPES.MAGE, label: "Mage", cost: TOWER_DATA[TOWER_TYPES.MAGE].cost },
        { t: TOWER_TYPES.BARRACKS, label: "Barracks", cost: TOWER_DATA[TOWER_TYPES.BARRACKS].cost },
        { t: TOWER_TYPES.ARTILLERY, label: "Artillery", cost: TOWER_DATA[TOWER_TYPES.ARTILLERY].cost },
      ];

      let html = `
        <div class="card">
          <div class="title">Pad</div>
          <div class="meta">Position: (${pad.x|0}, ${pad.y|0})</div>
        </div>
        <div class="card">
          <div class="title">Build</div>
          <div class="row">
      `;

      for (const b of buttons) {
        const affordable = g.economy.canAfford(b.cost);
        html += `
          <button class="btnSmall ${affordable ? "btnOk" : ""}" data-build="${b.t}">
            ${b.label} (${b.cost})
          </button>
        `;
      }

      html += `</div></div>`;
      this.panelBody.innerHTML = html;

      // Bind
      const buildBtns = this.panelBody.querySelectorAll("[data-build]");
      buildBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-build");
          g.buildTower(selection.padIndex, type);
        });
      });

      return;
    }

    if (selection.type === "tower") {
      this.renderTowerPanel(selection.tower);
      return;
    }
  }

  renderTowerPanel(tower) {
    const g = this.game;
    const def = TOWER_DATA[tower.type];
    const stats = tower.getStats();

    const canUp = tower.canUpgrade();
    const upCost = tower.getUpgradeCost();
    const sell = tower.getSellValue();
    const affordableUp = canUp && g.economy.canAfford(upCost);

    const targetingOptions = `
      <select id="targetMode">
        <option value="${TARGETING.FIRST}" ${tower.mode === TARGETING.FIRST ? "selected" : ""}>First</option>
        <option value="${TARGETING.CLOSEST}" ${tower.mode === TARGETING.CLOSEST ? "selected" : ""}>Closest</option>
        <option value="${TARGETING.STRONGEST}" ${tower.mode === TARGETING.STRONGEST ? "selected" : ""}>Strongest</option>
      </select>
    `;

    let meta = "";
    if (tower.type === "barracks") {
      meta = `Soldiers: 3 | Leash: ${stats.leash} | Respawn: ${stats.respawn}s`;
    } else if (tower.type === "artillery") {
      meta = `DMG: ${stats.dmg} | AoE: ${stats.splash} | Range: ${stats.range} | Rate: ${stats.fireRate.toFixed(2)}/s`;
    } else {
      meta = `DMG: ${stats.dmg} | Range: ${stats.range} | Rate: ${stats.fireRate.toFixed(2)}/s`;
    }

    this.panelBody.innerHTML = `
      <div class="card">
        <div class="title">${def.name} (Lv ${tower.level + 1})</div>
        <div class="meta">${meta}</div>
      </div>

      <div class="card">
        <div class="title">Targeting</div>
        ${targetingOptions}
      </div>

      <div class="card">
        <div class="title">Actions</div>
        <div class="row">
          <button id="btnUpgrade" class="btnSmall ${affordableUp ? "btnOk" : ""}" ${canUp ? "" : "disabled"}>
            Upgrade ${canUp ? `(${upCost})` : "(MAX)"}
          </button>
          <button id="btnSell" class="btnSmall btnDanger">Sell (${sell})</button>
        </div>
      </div>
    `;

    const sel = this.panelBody.querySelector("#targetMode");
    sel.addEventListener("change", () => {
      tower.mode = sel.value;
    });

    const upBtn = this.panelBody.querySelector("#btnUpgrade");
    upBtn.addEventListener("click", () => g.upgradeTower(tower));

    const sellBtn = this.panelBody.querySelector("#btnSell");
    sellBtn.addEventListener("click", () => g.sellTower(tower));
  }
}
