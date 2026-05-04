// 미니멀 pub/sub
export class Emitter {
  constructor() { this._listeners = new Set(); }
  on(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
  emit(payload) { for (const fn of this._listeners) fn(payload); }
}
