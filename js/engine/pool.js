
export class Pool {
  constructor(factory, capacity = 64) {
    this.factory = factory;
    this.items = new Array(capacity);
    this.free = new Array(capacity);
    this.count = 0;
    this.freeCount = 0;

    for (let i = 0; i < capacity; i++) {
      const it = factory();
      it.active = false;
      this.items[i] = it;
      this.free[this.freeCount++] = it;
    }
  }

  acquire() {
    if (this.freeCount > 0) {
      const it = this.free[--this.freeCount];
      it.active = true;
      return it;
    }
    // capacity reached -> recycle oldest inactive search (rare). Avoid alloc if possible.
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.active) {
        it.active = true;
        return it;
      }
    }
    return null;
  }

  release(it) {
    if (!it) return;
    it.active = false;
    this.free[this.freeCount++] = it;
  }

  forEachActive(fn) {
    const arr = this.items;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      if (it.active) fn(it);
    }
  }
}
