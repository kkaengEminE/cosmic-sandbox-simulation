import * as THREE from 'three';

// L1~L5 마커 그룹. update(lp) 로 위치 갱신.
export class LagrangeViz {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const colors = { L1: 0x66e0ff, L2: 0x66e0ff, L3: 0x66e0ff, L4: 0x9effa0, L5: 0x9effa0 };
    this.markers = {};
    for (const id of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      const geo = new THREE.RingGeometry(2.5, 4, 24);
      const mat = new THREE.MeshBasicMaterial({ color: colors[id], side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
      const ring = new THREE.Mesh(geo, mat);
      ring.userData.lagrangeId = id;

      const sprite = makeLabelSprite(id, colors[id]);
      sprite.position.y = 6;

      const pivot = new THREE.Group();
      pivot.add(ring);
      pivot.add(sprite);
      pivot.visible = false;
      this.group.add(pivot);
      this.markers[id] = { pivot, ring, sprite };
    }
    this.visible = true;
  }

  setVisible(v) {
    this.visible = v;
    if (!v) for (const id in this.markers) this.markers[id].pivot.visible = false;
  }

  update(lp, camera) {
    if (!lp || !this.visible) {
      for (const id in this.markers) this.markers[id].pivot.visible = false;
      return;
    }
    for (const id of ['L1', 'L2', 'L3', 'L4', 'L5']) {
      const m = this.markers[id];
      m.pivot.position.copy(lp[id]);
      m.pivot.visible = true;
      // 링이 카메라를 향하도록
      m.ring.lookAt(camera.position);
    }
  }
}

function makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.font = 'bold 22px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 32, 16);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8, 4, 1);
  return sprite;
}
