import * as THREE from 'three';
import { Body } from '../physics/Body.js';
import { GlobalState } from '../state/GlobalState.js';
import { SelectionState } from '../state/SelectionState.js';
import { CONFIG } from '../config.js';

// 좌클릭(드래그) → XZ 평면(y=0) raycaster 교차점에 신규 Body 생성.
// 드래그 이동량(평면 위 거리)을 초기 속도 벡터로 변환.
// Shift+좌클릭: 드래그 중 헬퍼는 표시되지만 드롭 시 스폰 대신 선택만 (Picker 책임).

const PLANE_Y = 0;

export class PointerSpawner {
  constructor({ sceneManager, bodyRenderer, bodies, picker }) {
    this.sceneManager = sceneManager;
    this.bodyRenderer = bodyRenderer;
    this.bodies = bodies;
    this.picker = picker;

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANE_Y);
    this.pointer = new THREE.Vector2();

    this.dragStart = null;
    this.dragEnd = null;
    this._wasShift = false;

    this._buildHelper();
    this._bind();
  }

  _buildHelper() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9 });
    this.helperLine = new THREE.Line(geo, mat);
    this.helperLine.frustumCulled = false;
    this.helperLine.visible = false;
    this.sceneManager.scene.add(this.helperLine);

    const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffd166, wireframe: true });
    this.helperSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.helperSphere.visible = false;
    this.sceneManager.scene.add(this.helperSphere);
  }

  _bind() {
    const dom = this.sceneManager.renderer.domElement;
    dom.addEventListener('pointerdown', this._onDown);
    dom.addEventListener('pointermove', this._onMove);
    dom.addEventListener('pointerup', this._onUp);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _toNDC(e) {
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _intersectPlane(out) {
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
    const hit = this.raycaster.ray.intersectPlane(this.plane, out);
    return hit;
  }

  _onDown = (e) => {
    if (e.button !== 0) return;
    this._toNDC(e);
    this._wasShift = e.shiftKey;

    // Shift+클릭은 선택 → Picker로 위임
    if (this._wasShift) {
      const picked = this.picker.pickAt(this.pointer);
      SelectionState.set(picked);
      return;
    }

    const start = new THREE.Vector3();
    if (!this._intersectPlane(start)) return;
    this.dragStart = start.clone();
    this.dragEnd = start.clone();
    this.helperLine.visible = true;
    this.helperSphere.visible = true;
    const r = Math.cbrt((3 * GlobalState.spawnMass) / (4 * Math.PI * CONFIG.SPAWN_DENSITY));
    this.helperSphere.scale.setScalar(Math.max(1.0, r));
    this.helperSphere.position.copy(start);
    this._updateHelperLine();
  }

  _onMove = (e) => {
    if (!this.dragStart) return;
    this._toNDC(e);
    const p = new THREE.Vector3();
    if (!this._intersectPlane(p)) return;
    this.dragEnd = p;
    this._updateHelperLine();
  }

  _onUp = (e) => {
    if (e.button !== 0) return;
    if (this._wasShift) { this._wasShift = false; return; }
    if (!this.dragStart) return;

    // 드래그 거리를 초기 속도 벡터로 변환 (방향: start → end)
    const dragVec = new THREE.Vector3().subVectors(this.dragEnd ?? this.dragStart, this.dragStart);
    // 거리 → 속도 (선형, 상한 적용)
    const SCALE = 0.6;
    const v = dragVec.clone().multiplyScalar(SCALE);
    if (v.length() > CONFIG.SPAWN_VEL_MAX) v.setLength(CONFIG.SPAWN_VEL_MAX);

    const body = new Body({
      mass: GlobalState.spawnMass,
      position: this.dragStart.toArray(),
      velocity: v.toArray(),
    });
    this.bodies.push(body);
    this.bodyRenderer.attach(body);

    this.dragStart = null;
    this.dragEnd = null;
    this.helperLine.visible = false;
    this.helperSphere.visible = false;
  }

  _updateHelperLine() {
    if (!this.dragStart || !this.dragEnd) return;
    const arr = this.helperLine.geometry.attributes.position.array;
    arr[0] = this.dragStart.x; arr[1] = this.dragStart.y; arr[2] = this.dragStart.z;
    arr[3] = this.dragEnd.x;   arr[4] = this.dragEnd.y;   arr[5] = this.dragEnd.z;
    this.helperLine.geometry.attributes.position.needsUpdate = true;
  }
}
