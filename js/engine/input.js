import { clamp } from "./math.js";

export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    this.mx = 0;
    this.my = 0;
    this._down = false;

    // Latch: reste vrai jusqu'à consumeClick() (ou endFrame)
    this._clicked = false;

    this._rect = canvas.getBoundingClientRect();
    this._needsRect = true;

    this._onMove = (e) => this._handleMove(e);
    this._onDown = (e) => this._handleDown(e);
    this._onUp = () => this._handleUp();
    this._onResize = () => { this._needsRect = true; };

    canvas.addEventListener("mousemove", this._onMove);
    canvas.addEventListener("mousedown", this._onDown);
    window.addEventListener("mouseup", this._onUp);
    window.addEventListener("resize", this._onResize);
  }

  destroy() {
    this.canvas.removeEventListener("mousemove", this._onMove);
    this.canvas.removeEventListener("mousedown", this._onDown);
    window.removeEventListener("mouseup", this._onUp);
    window.removeEventListener("resize", this._onResize);
  }

  beginFrame() {
    // ⚠️ NE PAS reset _clicked ici (sinon on perd les clics entre frames)
    if (this._needsRect) {
      this._rect = this.canvas.getBoundingClientRect();
      this._needsRect = false;
    }
  }

  endFrame() {
    // Optionnel: si tu veux que "un clic" dure max 1 frame
    // MAIS ici on le laisse se faire consommer par consumeClick()
    // Donc on ne reset pas ici non plus.
  }

  consumeClick() {
    const c = this._clicked;
    this._clicked = false;
    return c;
  }

  get down() { return this._down; }

  _handleMove(e) {
    const r = this._rect;
    const x = (e.clientX - r.left) / r.width * this.canvas.width;
    const y = (e.clientY - r.top) / r.height * this.canvas.height;
    this.mx = clamp(x, 0, this.canvas.width);
    this.my = clamp(y, 0, this.canvas.height);
  }

  _handleDown(e) {
    if (e.button !== 0) return;
    this._down = true;
    this._clicked = true; // latch until consumed
    this._handleMove(e);
  }

  _handleUp() {
    this._down = false;
  }
}
