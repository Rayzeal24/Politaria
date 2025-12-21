
import { GAME_DEFAULTS } from "./config.js";

export function createDemoLevel() {
  // Chemin fixe: waypoints (utilisés par Enemy)
  const waypoints = [
    { x: -30, y: 280 },
    { x: 140, y: 280 },
    { x: 210, y: 170 },
    { x: 360, y: 170 },
    { x: 440, y: 350 },
    { x: 610, y: 350 },
    { x: 720, y: 220 },
    { x: 840, y: 220 },
    { x: 990, y: 220 },
  ];

  // 8 pads cliquables
  const pads = [
    { x: 170, y: 360, r: 18 },
    { x: 260, y: 250, r: 18 },
    { x: 320, y: 95,  r: 18 },
    { x: 455, y: 120, r: 18 },
    { x: 520, y: 420, r: 18 },
    { x: 630, y: 290, r: 18 },
    { x: 760, y: 320, r: 18 },
    { x: 800, y: 140, r: 18 },
  ];

  return {
    w: GAME_DEFAULTS.canvasW,
    h: GAME_DEFAULTS.canvasH,
    waypoints,
    pads,
    base: { x: 930, y: 220, r: 22 },
  };
}
