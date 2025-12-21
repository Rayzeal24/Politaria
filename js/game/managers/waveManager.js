import { WAVES, ENEMY_ARCHETYPES } from "../config.js";

export class WaveManager {
  constructor(enemyPool, waypoints) {
    this.enemyPool = enemyPool;
    this.waypoints = waypoints;

    this.running = false;
    this.waveIndex = 0; // 0..WAVES.length-1
    this._entryIndex = 0;
    this._spawnLeft = 0;
    this._spawnInterval = 0.6;
    this._spawnTimer = 0;

    this._waveAlive = 0; // track alive enemies for wave end
  }

  get waveCount() { return WAVES.length; }

  start() {
    this.running = true;
  }

  isFinishedAll() {
    return this.waveIndex >= WAVES.length;
  }

  currentWaveNumber() {
    return Math.min(this.waveIndex + 1, WAVES.length);
  }

  tryStartNextWave() {
    if (!this.running) return false;
    if (this.isFinishedAll()) return false;

    // if already in progress, no
    if (this._entryIndex !== 0 || this._spawnLeft !== 0 || this._waveAlive > 0) return false;

    // load first entry
    const w = WAVES[this.waveIndex];
    this._entryIndex = 0;
    this._spawnLeft = w.entries[0].count;
    this._spawnInterval = w.entries[0].interval;
    this._spawnTimer = 0.01; // spawn quickly
    return true;
  }

  onEnemySpawned() {
    this._waveAlive += 1;
  }

  onEnemyRemoved() {
    if (this._waveAlive > 0) this._waveAlive -= 1;
  }

  update(dt) {
    if (!this.running) return { spawned: 0, waveEnded: false };

    // Start next wave automatically when previous ended and waveIndex advanced is ready
    // (Game controls Start button; wave runs after Start)
    let spawned = 0;
    let waveEnded = false;

    // If wave not initialized, ensure it starts (first wave) when running
    if (this._entryIndex === 0 && this._spawnLeft === 0 && this._waveAlive === 0 && !this.isFinishedAll()) {
      this.tryStartNextWave();
    }

    if (this.isFinishedAll()) return { spawned: 0, waveEnded: false };

    const w = WAVES[this.waveIndex];
    if (!w) return { spawned: 0, waveEnded: false };

    // Spawn logic
    if (this._spawnLeft > 0) {
      this._spawnTimer -= dt;
      if (this._spawnTimer <= 0) {
        // spawn one
        const entry = w.entries[this._entryIndex];
        const arche = ENEMY_ARCHETYPES[entry.type];
        const e = this.enemyPool.acquire();
        if (e) {
          e.reset();
          e.spawn(arche, this.waypoints);
          spawned += 1;
          this.onEnemySpawned();
        }

        this._spawnLeft -= 1;
        this._spawnTimer += this._spawnInterval;
        if (this._spawnTimer < 0.02) this._spawnTimer = 0.02; // avoid spiral
      }
    } else {
      // Move to next entry if any
      const nextEntryIndex = this._entryIndex + 1;
      if (nextEntryIndex < w.entries.length) {
        this._entryIndex = nextEntryIndex;
        const entry = w.entries[this._entryIndex];
        this._spawnLeft = entry.count;
        this._spawnInterval = entry.interval;
        this._spawnTimer = 0.15;
      } else {
        // All entries spawned -> wait for waveAlive==0 to end
        if (this._waveAlive === 0) {
          waveEnded = true;
          // Advance to next wave
          this.waveIndex += 1;
          // Reset state for next wave
          this._entryIndex = 0;
          this._spawnLeft = 0;
          this._spawnInterval = 0.6;
          this._spawnTimer = 0;
        }
      }
    }

    return { spawned, waveEnded };
  }
}

