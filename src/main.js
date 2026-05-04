import { CONFIG } from './config.js';
import { GlobalState } from './state/GlobalState.js';
import { SelectionState } from './state/SelectionState.js';
import { SceneManager } from './scene/SceneManager.js';
import { BodyRenderer } from './scene/BodyRenderer.js';
import { LagrangeViz } from './scene/LagrangeViz.js';
import { stepVerlet, resetIntegrator } from './physics/Integrator.js';
import { resolveCollisionsAndBounds } from './physics/Collisions.js';
import { computeLagrangePoints, applyLagrangeSnap } from './physics/LagrangePoints.js';
import { convertToBlackHole, updateBlackHoleVisuals } from './physics/BlackHole.js';
import { PointerSpawner } from './input/PointerSpawner.js';
import { Picker } from './input/Picker.js';
import { AdminPanel } from './ui/AdminPanel.js';
import { presetSun, presetBinary, presetCluster } from './presets.js';

// ───────────────────────────── 부트스트랩 ─────────────────────────────
const container = document.getElementById('app');
const sceneManager = new SceneManager(container);
const bodyRenderer = new BodyRenderer(sceneManager.scene);
const lagrangeViz = new LagrangeViz(sceneManager.scene);

// 시뮬 상태
let bodies = [];
let lagrange = null;
let lastPrimaryPos = null;
let lastSecondaryPos = null;

const picker = new Picker({ sceneManager, bodies });
const spawner = new PointerSpawner({ sceneManager, bodyRenderer, bodies, picker });

const adminPanel = new AdminPanel({
  onConvertBlackHole: (body) => {
    convertToBlackHole(body, sceneManager.scene, bodyRenderer, GlobalState.G, GlobalState.cSim);
    SelectionState.changed.emit(body); // UI 재구성
  },
  onDelete: (body) => {
    body.alive = false;
    bodyRenderer.detach(body);
    const idx = bodies.indexOf(body);
    if (idx >= 0) bodies.splice(idx, 1);
    if (SelectionState.body === body) SelectionState.clear();
  },
});

// 선택 강조
let lastSelected = null;
SelectionState.changed.on((b) => {
  if (lastSelected) bodyRenderer.setEmphasis(lastSelected, false);
  if (b) bodyRenderer.setEmphasis(b, true);
  lastSelected = b;
});

// 리셋·프리셋 핸들러
GlobalState.resetReq.on(() => loadBodies([]));
GlobalState.presetReq.on((kind) => {
  if (kind === 'sun') loadBodies(presetSun());
  else if (kind === 'binary') loadBodies(presetBinary());
  else if (kind === 'cluster') loadBodies(presetCluster());
});

function loadBodies(newBodies) {
  // 기존 정리
  for (const b of [...bodies]) bodyRenderer.detach(b);
  bodies.length = 0;
  SelectionState.clear();

  for (const b of newBodies) {
    bodies.push(b);
    bodyRenderer.attach(b);
  }
  resetIntegrator(bodies);
  lagrange = null;
  lastPrimaryPos = null;
  lastSecondaryPos = null;
}

// 초기 프리셋
loadBodies(presetBinary());

// ───────────────────────────── 메인 루프 ─────────────────────────────
let acc = 0;
let lastT = performance.now() / 1000;

function findTwoHeaviest(arr) {
  let p = null, s = null;
  for (const b of arr) {
    if (!b.alive) continue;
    if (!p || b.mass > p.mass) { s = p; p = b; }
    else if (!s || b.mass > s.mass) { s = b; }
  }
  return [p, s];
}

function maybeRecomputeLagrange() {
  const [p, s] = findTwoHeaviest(bodies);
  if (!p || !s) { lagrange = null; return; }
  // 주 천체 변경 또는 이동량 임계 초과 시 재계산
  const recompute =
    !lagrange ||
    lagrange.primaryId !== p.id || lagrange.secondaryId !== s.id ||
    !lastPrimaryPos || lastPrimaryPos.distanceTo(p.position) > CONFIG.L_RECALC_THRESHOLD ||
    !lastSecondaryPos || lastSecondaryPos.distanceTo(s.position) > CONFIG.L_RECALC_THRESHOLD;
  if (recompute) {
    lagrange = computeLagrangePoints(p, s);
    if (lagrange) {
      lastPrimaryPos = p.position.clone();
      lastSecondaryPos = s.position.clone();
    }
  }
  return [p, s];
}

function applyExtraAccel(arr) {
  if (!GlobalState.lagrangeSnapEnabled) return;
  const [p, s] = findTwoHeaviest(arr);
  if (!p || !s || !lagrange) return;
  applyLagrangeSnap(arr, lagrange, p, s, GlobalState.kSnap, GlobalState.cSnap, GlobalState.rSnap, GlobalState.vSnapMax);
}

function physicsStep(dt) {
  stepVerlet(bodies, dt, GlobalState.G, GlobalState.softening, applyExtraAccel);

  // 충돌·경계
  resolveCollisionsAndBounds(
    bodies,
    CONFIG.WORLD_BOUNDS,
    GlobalState.mCrit,
    (winner, loser) => {
      bodyRenderer.detach(loser);
      if (SelectionState.body === loser) SelectionState.set(winner);
      else if (SelectionState.body === winner) SelectionState.changed.emit(winner); // UI 갱신
    },
    (removed) => {
      bodyRenderer.detach(removed);
      if (SelectionState.body === removed) SelectionState.clear();
    },
  );

  // 자동 블랙홀 변환
  for (const b of bodies) {
    if (b._wantBlackHole && !b.isBlackHole) {
      delete b._wantBlackHole;
      convertToBlackHole(b, sceneManager.scene, bodyRenderer, GlobalState.G, GlobalState.cSim);
      if (SelectionState.body === b) SelectionState.changed.emit(b);
    }
  }
}

function loop() {
  const now = performance.now() / 1000;
  const realDt = Math.min(0.05, now - lastT);
  lastT = now;

  if (!GlobalState.paused) {
    const scaled = realDt * GlobalState.timeScale;
    acc += scaled;
    let steps = 0;
    while (acc >= CONFIG.DT_FIXED && steps < CONFIG.DT_MAX_FRAMES) {
      maybeRecomputeLagrange();
      physicsStep(CONFIG.DT_FIXED);
      acc -= CONFIG.DT_FIXED;
      steps++;
    }
    if (steps === CONFIG.DT_MAX_FRAMES) acc = 0; // 따라잡기 포기
  } else {
    // 일시정지여도 라그랑주 재계산은 한 번 (수동 조작 반영)
    maybeRecomputeLagrange();
    acc = 0;
  }

  // 시각 동기화
  bodyRenderer.syncAll();
  updateBlackHoleVisuals(bodies, sceneManager.camera, realDt);
  lagrangeViz.setVisible(GlobalState.lagrangeVisible);
  lagrangeViz.update(lagrange, sceneManager.camera);

  sceneManager.render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// 디버그용 전역 노출 (테스트 시나리오 검증)
window.__cosmic = { bodies, GlobalState, SelectionState, sceneManager };
