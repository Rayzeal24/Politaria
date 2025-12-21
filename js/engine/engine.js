
export class Engine {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;

    this._running = false;
    this._last = 0;
    this._raf = 0;

    // cap dt to avoid huge jumps after tab switch
    this._dtCap = 0.05; // 50ms
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    const loop = (t) => {
      if (!this._running) return;
      const rawDt = (t - this._last) / 1000;
      const dt = rawDt > this._dtCap ? this._dtCap : rawDt;
      this._last = t;

      this.update(dt);
      this.render();

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
}
