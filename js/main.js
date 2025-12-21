
import { Engine } from "./engine/engine.js";
import { Input } from "./engine/input.js";
import { Game } from "./game/game.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: true });

const input = new Input(canvas);
const game = new Game(canvas, ctx, input);

const engine = new Engine({
  update: (dt) => game.update(dt),
  render: () => game.render(),
});

engine.start();

