import { computeAccelerations } from './GravitySolver.js';

// Velocity-Verlet:
// 1) x(t+dt) = x + v*dt + 0.5*a*dt²
// 2) a(t+dt) = compute(...)
// 3) v(t+dt) = v + 0.5*(a + a_new)*dt
//
// 외부에서 가속도 보조 수정자(라그랑주 스냅, 사용자 지정 추가력 등)를 주입할 수 있도록
// applyExtraAccel 콜백을 제공.
export function stepVerlet(bodies, dt, G, softening, applyExtraAccel) {
  // 첫 호출 시 이전 가속도가 없으면 초기 계산
  if (!_initialized.has(bodies)) {
    computeAccelerations(bodies, G, softening);
    if (applyExtraAccel) applyExtraAccel(bodies);
    _initialized.add(bodies);
  }

  // 위치 업데이트
  for (const b of bodies) {
    if (!b.alive || b.isStatic) continue;
    b.position.addScaledVector(b.velocity, dt).addScaledVector(b.acceleration, 0.5 * dt * dt);
    b.prevAcceleration.copy(b.acceleration);
  }

  // 새 가속도
  computeAccelerations(bodies, G, softening);
  if (applyExtraAccel) applyExtraAccel(bodies);

  // 속도 업데이트
  for (const b of bodies) {
    if (!b.alive || b.isStatic) continue;
    b.velocity.x += 0.5 * (b.prevAcceleration.x + b.acceleration.x) * dt;
    b.velocity.y += 0.5 * (b.prevAcceleration.y + b.acceleration.y) * dt;
    b.velocity.z += 0.5 * (b.prevAcceleration.z + b.acceleration.z) * dt;
  }
}

const _initialized = new WeakSet();

// bodies 배열이 재구성되었을 때 호출 (리셋, 프리셋 로드 등)
export function resetIntegrator(bodies) { _initialized.delete(bodies); }
