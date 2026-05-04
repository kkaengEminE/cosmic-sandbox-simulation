import * as THREE from 'three';

const _diff = new THREE.Vector3();

// 모든 Body 쌍에 대해 가속도를 계산. softening 적용으로 r→0 발산 방지.
// a_i += G * m_j * r̂ / (r² + ε²)^(3/2) 형태의 표준 소프트 N-body.
export function computeAccelerations(bodies, G, softening) {
  const eps2 = softening * softening;
  for (const b of bodies) b.acceleration.set(0, 0, 0);

  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a.alive || a.isStatic) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!b.alive) continue;
      _diff.subVectors(b.position, a.position);
      const r2 = _diff.lengthSq() + eps2;
      const invR3 = 1 / (r2 * Math.sqrt(r2));
      // a += G * m_b * r⃗ / |r|³
      a.acceleration.addScaledVector(_diff, G * b.mass * invR3);
      if (!b.isStatic) b.acceleration.addScaledVector(_diff, -G * a.mass * invR3);
    }
  }
}
