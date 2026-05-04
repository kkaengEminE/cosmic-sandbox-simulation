import { CONFIG } from '../config.js';
import { Emitter } from './Emitter.js';

// 런타임에 변경 가능한 전역 시뮬 상태. CONFIG에서 초기값 복사.
class GlobalStateImpl {
  constructor() {
    this.timeScale = CONFIG.TIME_SCALE;
    this.paused = CONFIG.PAUSED;
    this.G = CONFIG.G;
    this.softening = CONFIG.SOFTENING;
    this.mCrit = CONFIG.M_CRIT;
    this.cSim = CONFIG.C_SIM;
    this.rSnap = CONFIG.R_SNAP;
    this.kSnap = CONFIG.K_SNAP;
    this.cSnap = CONFIG.C_SNAP;
    this.vSnapMax = CONFIG.V_SNAP_MAX;
    this.spawnMass = CONFIG.SPAWN_MASS;
    this.trailEnabled = CONFIG.TRAIL_ENABLED;
    this.lagrangeVisible = true;
    this.lagrangeSnapEnabled = true;

    this.changed = new Emitter();   // 일반 변경
    this.resetReq = new Emitter();  // 리셋 요청
    this.presetReq = new Emitter(); // 프리셋 로드 요청 (payload: 'sun' | 'binary' | 'cluster')
  }
  notify() { this.changed.emit(this); }
}

export const GlobalState = new GlobalStateImpl();
