import GUI from 'lil-gui';
import { GlobalState } from '../state/GlobalState.js';
import { SelectionState } from '../state/SelectionState.js';
import { CONFIG } from '../config.js';

// 우측 하단 고정 lil-gui. 두 폴더(전역 / 선택 객체) 이원화.
export class AdminPanel {
  constructor({ onConvertBlackHole, onDelete }) {
    this.onConvertBlackHole = onConvertBlackHole;
    this.onDelete = onDelete;

    this.gui = new GUI({ title: '관리자 제어 (Admin)' });
    const dom = this.gui.domElement;
    dom.style.position = 'fixed';
    dom.style.right = '12px';
    dom.style.bottom = '12px';
    dom.style.top = 'auto';
    dom.style.left = 'auto';
    dom.style.zIndex = '1000';

    this._buildGlobal();
    this._buildSelection();

    SelectionState.changed.on(() => this._rebuildSelection());
  }

  _buildGlobal() {
    const f = this.gui.addFolder('전역 (Global)');
    f.add(GlobalState, 'paused').name('일시정지');
    f.add(GlobalState, 'timeScale', 0, 5, 0.05).name('시간 배속');
    f.add(GlobalState, 'G', 0, 500, 1).name('중력 상수 G');
    f.add(GlobalState, 'softening', 0.1, 20, 0.1).name('소프트닝 ε');
    f.add(GlobalState, 'mCrit', 50, 5000, 10).name('블랙홀 임계 M_crit');
    f.add(GlobalState, 'cSim', 50, 1000, 10).name('시뮬 광속 c');
    f.add(GlobalState, 'spawnMass', 1, 1000, 1).name('스폰 질량');
    f.add(GlobalState, 'lagrangeVisible').name('L점 표시').onChange(() => GlobalState.notify());
    f.add(GlobalState, 'lagrangeSnapEnabled').name('L점 자석 효과');
    f.add(GlobalState, 'rSnap', 1, 100, 1).name('스냅 반경');
    f.add(GlobalState, 'kSnap', 0, 10, 0.1).name('스냅 강도 k');
    f.add(GlobalState, 'cSnap', 0, 5, 0.05).name('스냅 댐핑 c');
    f.add(GlobalState, 'trailEnabled').name('궤적 표시');

    const presets = {
      '리셋 (Reset)': () => GlobalState.resetReq.emit(),
      '프리셋: 태양계': () => GlobalState.presetReq.emit('sun'),
      '프리셋: 쌍성계': () => GlobalState.presetReq.emit('binary'),
      '프리셋: 군집': () => GlobalState.presetReq.emit('cluster'),
    };
    const pf = this.gui.addFolder('프리셋');
    for (const k in presets) pf.add(presets, k);
    pf.close();

    this.globalFolder = f;
  }

  _buildSelection() {
    this.selectionFolder = this.gui.addFolder('선택 객체 (Selection)');
    this.selectionFolder.add({ '대상 없음': '클릭으로 선택 (Shift+좌클릭)' }, '대상 없음');
    this._selControllers = [];
  }

  _rebuildSelection() {
    // 기존 폴더 destroy 후 재생성
    if (this.selectionFolder) this.selectionFolder.destroy();
    this.selectionFolder = this.gui.addFolder('선택 객체 (Selection)');
    const body = SelectionState.body;
    if (!body) {
      this.selectionFolder.add({ msg: 'Shift+좌클릭으로 선택' }, 'msg');
      return;
    }
    const proxy = {
      이름: body.name,
      질량: body.mass,
      'vel.x': body.velocity.x, 'vel.y': body.velocity.y, 'vel.z': body.velocity.z,
      'pos.x': body.position.x, 'pos.y': body.position.y, 'pos.z': body.position.z,
      고정: body.isStatic,
      색상: body.color,
      '블랙홀로 변환': () => this.onConvertBlackHole?.(body),
      '삭제': () => this.onDelete?.(body),
    };
    this.selectionFolder.add(proxy, '이름').onChange(v => body.name = v);
    this.selectionFolder.add(proxy, '질량', 0.1, 5000, 0.1).onChange(v => body.setMass(v)).listen();
    this.selectionFolder.add(proxy, 'vel.x', -100, 100, 0.1).onChange(v => body.velocity.x = v).listen();
    this.selectionFolder.add(proxy, 'vel.y', -100, 100, 0.1).onChange(v => body.velocity.y = v).listen();
    this.selectionFolder.add(proxy, 'vel.z', -100, 100, 0.1).onChange(v => body.velocity.z = v).listen();
    this.selectionFolder.add(proxy, 'pos.x', -CONFIG.WORLD_BOUNDS, CONFIG.WORLD_BOUNDS, 0.1).onChange(v => body.position.x = v).listen();
    this.selectionFolder.add(proxy, 'pos.y', -CONFIG.WORLD_BOUNDS, CONFIG.WORLD_BOUNDS, 0.1).onChange(v => body.position.y = v).listen();
    this.selectionFolder.add(proxy, 'pos.z', -CONFIG.WORLD_BOUNDS, CONFIG.WORLD_BOUNDS, 0.1).onChange(v => body.position.z = v).listen();
    this.selectionFolder.add(proxy, '고정').onChange(v => body.isStatic = v);
    this.selectionFolder.addColor(proxy, '색상').onChange(v => {
      body.color = v;
      if (body.mesh && body.mesh.material && body.mesh.material.color) {
        body.mesh.material.color.set(v);
        if (body.mesh.material.emissive) body.mesh.material.emissive.set(v);
      }
    });
    if (!body.isBlackHole) this.selectionFolder.add(proxy, '블랙홀로 변환');
    this.selectionFolder.add(proxy, '삭제');
    this.selectionFolder.open();
  }
}
