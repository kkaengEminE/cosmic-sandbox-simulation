import * as THREE from 'three';

// raycaster로 가장 가까운 Body 메시를 선택. bodyId가 userData에 있으면 매칭.
export class Picker {
  constructor({ sceneManager, bodies }) {
    this.sceneManager = sceneManager;
    this.bodies = bodies;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 1 };
  }

  pickAt(ndc) {
    this.raycaster.setFromCamera(ndc, this.sceneManager.camera);
    const meshes = [];
    const idToBody = new Map();
    for (const b of this.bodies) {
      if (b.mesh && b.alive) {
        meshes.push(b.mesh);
        idToBody.set(b.id, b);
      }
    }
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const id = hits[0].object.userData.bodyId;
    return idToBody.get(id) ?? null;
  }
}
