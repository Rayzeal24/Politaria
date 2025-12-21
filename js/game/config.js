
export const SAVE_KEY = "td_save_v1";

export const TOWER_TYPES = {
  ARCHER: "archer",
  MAGE: "mage",
  BARRACKS: "barracks",
  ARTILLERY: "artillery",
};

export const TARGETING = {
  FIRST: "first",
  CLOSEST: "closest",
  STRONGEST: "strongest",
};

export const COLORS = {
  path: "rgba(200,220,255,.12)",
  pad: "rgba(255,255,255,.10)",
  padStroke: "rgba(255,255,255,.22)",
  tower: "rgba(255,255,255,.88)",
  range: "rgba(255,255,255,.10)",
  enemy: "rgba(255,120,120,.95)",
  enemyArmor: "rgba(120,180,255,.95)",
  enemyMagic: "rgba(190,140,255,.95)",
  hpBack: "rgba(0,0,0,.55)",
  hpFront: "rgba(45,164,78,.95)",
};

export const GAME_DEFAULTS = {
  canvasW: 960,
  canvasH: 540,
  startGold: 220,
  startLives: 20,
};

export const TOWER_DATA = {
  [TOWER_TYPES.ARCHER]: {
    name: "Archer",
    cost: 70,
    sellRatio: 0.7,
    levels: [
      { dmg: 9, fireRate: 2.2, range: 135, projSpeed: 520, type: "phys" },
      { dmg: 14, fireRate: 2.4, range: 145, projSpeed: 540, type: "phys" },
      { dmg: 20, fireRate: 2.6, range: 155, projSpeed: 560, type: "phys" },
    ],
    upgradeCosts: [60, 90],
  },

  [TOWER_TYPES.MAGE]: {
    name: "Mage",
    cost: 90,
    sellRatio: 0.7,
    levels: [
      { dmg: 26, fireRate: 0.85, range: 150, projSpeed: 430, type: "magic" },
      { dmg: 38, fireRate: 0.90, range: 160, projSpeed: 450, type: "magic" },
      { dmg: 52, fireRate: 0.95, range: 170, projSpeed: 470, type: "magic" },
    ],
    upgradeCosts: [85, 120],
  },

  [TOWER_TYPES.ARTILLERY]: {
    name: "Artillery",
    cost: 110,
    sellRatio: 0.7,
    levels: [
      { dmg: 32, fireRate: 0.55, range: 165, projSpeed: 380, splash: 55, type: "phys" },
      { dmg: 45, fireRate: 0.60, range: 175, projSpeed: 390, splash: 60, type: "phys" },
      { dmg: 62, fireRate: 0.65, range: 185, projSpeed: 410, splash: 65, type: "phys" },
    ],
    upgradeCosts: [95, 140],
  },

  [TOWER_TYPES.BARRACKS]: {
    name: "Barracks",
    cost: 100,
    sellRatio: 0.7,
    levels: [
      { soldierHp: 65, soldierDps: 10, soldierRange: 18, leash: 75, respawn: 4.5 },
      { soldierHp: 90, soldierDps: 14, soldierRange: 18, leash: 80, respawn: 4.2 },
      { soldierHp: 125, soldierDps: 19, soldierRange: 20, leash: 85, respawn: 4.0 },
    ],
    upgradeCosts: [90, 140],
  },
};

export const ENEMY_ARCHETYPES = {
  grunt:  { maxHp: 120, speed: 58, armor: 0.10, mResist: 0.00, goldReward: 6 },
  brute:  { maxHp: 260, speed: 42, armor: 0.25, mResist: 0.10, goldReward: 10 },
  shaman: { maxHp: 160, speed: 50, armor: 0.05, mResist: 0.35, goldReward: 8 },
};

export const WAVES = [
  {
    name: "Wave 1",
    entries: [
      { type: "grunt", count: 10, interval: 0.65 },
      { type: "grunt", count: 6,  interval: 0.55 },
    ],
  },
  {
    name: "Wave 2",
    entries: [
      { type: "grunt", count: 8, interval: 0.55 },
      { type: "shaman", count: 6, interval: 0.80 },
      { type: "brute", count: 3, interval: 1.20 },
    ],
  },
  {
    name: "Wave 3",
    entries: [
      { type: "grunt",  count: 10, interval: 0.50 },
      { type: "shaman", count: 8,  interval: 0.70 },
      { type: "brute",  count: 6,  interval: 1.00 },
    ],
  },
];
