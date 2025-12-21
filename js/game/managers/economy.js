
import { GAME_DEFAULTS, SAVE_KEY } from "../config.js";

export class Economy {
  constructor() {
    this.gold = GAME_DEFAULTS.startGold;
    this.lives = GAME_DEFAULTS.startLives;

    this.bestWave = 0;
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.bestWave === "number") this.bestWave = data.bestWave;
    } catch {}
  }

  saveBestWave(waveIndex1Based) {
    if (waveIndex1Based > this.bestWave) {
      this.bestWave = waveIndex1Based;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ bestWave: this.bestWave }));
      } catch {}
    }
  }

  canAfford(cost) { return this.gold >= cost; }
  spend(cost) { this.gold -= cost; if (this.gold < 0) this.gold = 0; }
  earn(amount) { this.gold += amount; }
  loseLife(n=1) { this.lives -= n; if (this.lives < 0) this.lives = 0; }
}
