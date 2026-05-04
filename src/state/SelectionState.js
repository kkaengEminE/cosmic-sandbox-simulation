import { Emitter } from './Emitter.js';

class SelectionStateImpl {
  constructor() {
    this.body = null;          // 현재 선택된 Body 인스턴스
    this.changed = new Emitter();
  }
  set(body) {
    if (this.body === body) return;
    this.body = body;
    this.changed.emit(body);
  }
  clear() { this.set(null); }
}

export const SelectionState = new SelectionStateImpl();
