import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Body ↔ Three.js Mesh 동기화. 트레일은 BufferGeometry + Line.
export class BodyRenderer {
  constructor(scene) {
    this.scene = scene;
    this.geometryCache = new THREE.SphereGeometry(1, 24, 16); // 단위 구, 인스턴스마다 scale로 조절
    this.bodies = new Set();
  }

  attach(body) {
    if (this.bodies.has(body)) return;
    const mat = new THREE.MeshStandardMaterial({
      color: body.color,
      emissive: body.color,
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.55,
    });
    const mesh = new THREE.Mesh(this.geometryCache, mat);
    mesh.userData.bodyId = body.id;
    mesh.scale.setScalar(body.radius);
    mesh.position.copy(body.position);
    this.scene.add(mesh);
    body.mesh = mesh;

    if (CONFIG.TRAIL_ENABLED) this._attachTrail(body);
    this.bodies.add(body);
  }

  _attachTrail(body) {
    const N = CONFIG.TRAIL_LENGTH;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = body.position.x;
      positions[i * 3 + 1] = body.position.y;
      positions[i * 3 + 2] = body.position.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ color: body.color, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    this.scene.add(line);
    body.trail = { line, positions, head: 0, count: 0, capacity: N };
  }

  detach(body) {
    if (!this.bodies.has(body)) return;
    if (body.mesh) {
      this.scene.remove(body.mesh);
      body.mesh.material.dispose();
      // geometry는 공유 — dispose 금지
      body.mesh = null;
    }
    if (body.trail) {
      this.scene.remove(body.trail.line);
      body.trail.line.geometry.dispose();
      body.trail.line.material.dispose();
      body.trail = null;
    }
    this.bodies.delete(body);
  }

  syncAll() {
    for (const body of this.bodies) {
      if (!body.mesh) continue;
      body.mesh.position.copy(body.position);
      body.mesh.scale.setScalar(body.radius);
      // 트레일 push
      if (body.trail) {
        const t = body.trail;
        const idx = t.head * 3;
        t.positions[idx] = body.position.x;
        t.positions[idx + 1] = body.position.y;
        t.positions[idx + 2] = body.position.z;
        t.head = (t.head + 1) % t.capacity;
        t.count = Math.min(t.count + 1, t.capacity);
        // 단순화: 정렬 없이 capacity 만큼 보이도록 fill 후 ring 회전 — 시각적으로 충분
        t.line.geometry.attributes.position.needsUpdate = true;
        t.line.geometry.setDrawRange(0, t.count);
      }
    }
  }

  // 공통 머티리얼 변경 (예: 선택 강조)
  setEmphasis(body, on) {
    if (!body || !body.mesh) return;
    body.mesh.material.emissiveIntensity = on ? 1.2 : 0.35;
  }
}
