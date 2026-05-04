import * as THREE from 'three';
import { Body } from './Body.js';
import { CONFIG } from '../config.js';
import vertSrc from '../scene/shaders/blackhole.vert.glsl?raw';
import fragSrc from '../scene/shaders/blackhole.frag.glsl?raw';

// Body → BlackHole 인플레이스 변환. Body 인스턴스의 isBlackHole 플래그와 메시 재구성을 담당.
// 별도 클래스로 두지 않고 함수로 처리 (Body 참조가 모든 곳에 저장돼 있어 인플레이스가 안전).

export function schwarzschildRadius(mass, G, c) {
  return Math.max(CONFIG.R_SCHWARZ_MIN, (2 * G * mass) / (c * c));
}

const _sharedQuad = new THREE.PlaneGeometry(2, 2);

export function convertToBlackHole(body, scene, bodyRenderer, G, c) {
  if (body.isBlackHole) return;
  body.isBlackHole = true;
  const rs = schwarzschildRadius(body.mass, G, c);
  body.radius = rs;
  body.color = 0x000000;

  // 기존 mesh + 트레일 제거 (BodyRenderer 내부 구조 활용)
  if (body.mesh) {
    scene.remove(body.mesh);
    body.mesh.material.dispose();
    body.mesh = null;
  }
  if (body.trail) {
    scene.remove(body.trail.line);
    body.trail.line.geometry.dispose();
    body.trail.line.material.dispose();
    body.trail = null;
  }
  bodyRenderer.bodies.delete(body);

  // 빌보드 평면에 셰이더 — 카메라를 향해 자동 회전
  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.5 },
      uGlowColor: { value: new THREE.Color(0xff8a3d) },
    },
  });
  const mesh = new THREE.Mesh(_sharedQuad, material);
  // 외곽 글로우까지 포함되도록 평면을 사건의 지평선의 약 6배로
  const visualScale = rs * 6;
  mesh.scale.setScalar(visualScale);
  mesh.position.copy(body.position);
  mesh.userData.bodyId = body.id;
  mesh.userData.isBlackHole = true;
  scene.add(mesh);

  body.mesh = mesh;
  body._bhMaterial = material;
  bodyRenderer.bodies.add(body); // syncAll 위치 업데이트는 계속 받지만 trail은 없음
}

// 매 프레임 호출 — 빌보드 회전 + 시간 uniform 갱신
const _camDir = new THREE.Vector3();
export function updateBlackHoleVisuals(bodies, camera, dt) {
  for (const b of bodies) {
    if (!b.isBlackHole || !b.mesh) continue;
    b.mesh.lookAt(camera.position);
    if (b._bhMaterial) {
      b._bhMaterial.uniforms.uTime.value += dt;
      b._bhMaterial.uniforms.uIntensity.value = 1.0 + Math.min(2.0, b.mass / 800);
    }
    // 사건의 지평선 시각 크기 업데이트 (질량 변동 반영)
    const visualScale = b.radius * 6;
    b.mesh.scale.setScalar(visualScale);
  }
}
