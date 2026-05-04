import * as THREE from 'three';

// 두 주 천체(질량 상위 2개) 기준 L1~L5 계산.
// CR3BP(원형 제한 3체 문제) 근사식 + Newton-Raphson 보정.
// 라그랑주 점은 본래 원궤도 가정에서 정의되지만, 샌드박스에서는 현재 상대 위치/속도로부터
// 즉석 평면을 잡아 시각화·자석 효과를 제공한다.

const _r12 = new THREE.Vector3();
const _vRel = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _com = new THREE.Vector3();

function l1Distance(mu) {
  // f(α) = α^5 - (3-μ)α^4 + (3-2μ)α^3 - μα² + 2μα - μ = 0
  // α = d / R (M2 → M1 방향 거리 비). 초기 추정치 (μ/3)^(1/3).
  let a = Math.cbrt(mu / 3);
  for (let i = 0; i < 8; i++) {
    const f = a * a * a * a * a - (3 - mu) * a ** 4 + (3 - 2 * mu) * a ** 3 - mu * a * a + 2 * mu * a - mu;
    const df = 5 * a ** 4 - 4 * (3 - mu) * a ** 3 + 3 * (3 - 2 * mu) * a * a - 2 * mu * a + 2 * mu;
    if (Math.abs(df) < 1e-12) break;
    a -= f / df;
  }
  return a;
}

function l2Distance(mu) {
  // M2 외측. f(α) = α^5 + (3-μ)α^4 + (3-2μ)α^3 - μα² - 2μα - μ = 0
  let a = Math.cbrt(mu / 3);
  for (let i = 0; i < 8; i++) {
    const f = a ** 5 + (3 - mu) * a ** 4 + (3 - 2 * mu) * a ** 3 - mu * a * a - 2 * mu * a - mu;
    const df = 5 * a ** 4 + 4 * (3 - mu) * a ** 3 + 3 * (3 - 2 * mu) * a * a - 2 * mu * a - 2 * mu;
    if (Math.abs(df) < 1e-12) break;
    a -= f / df;
  }
  return a;
}

function l3Distance(mu) {
  // M1 외측. β = d/R (M1 → -M2 방향). 초기 1 - 7μ/12.
  let b = 1 - (7 * mu) / 12;
  for (let i = 0; i < 8; i++) {
    // 표준 L3 다항식: β^5 + (2+μ)β^4 + (1+2μ)β^3 - (1-μ)β² - 2(1-μ)β - (1-μ) = 0
    const f = b ** 5 + (2 + mu) * b ** 4 + (1 + 2 * mu) * b ** 3 - (1 - mu) * b * b - 2 * (1 - mu) * b - (1 - mu);
    const df = 5 * b ** 4 + 4 * (2 + mu) * b ** 3 + 3 * (1 + 2 * mu) * b * b - 2 * (1 - mu) * b - 2 * (1 - mu);
    if (Math.abs(df) < 1e-12) break;
    b -= f / df;
  }
  return b;
}

// 두 천체의 위치/속도/질량으로부터 L1..L5 절대 위치를 반환
// 반환 객체: { L1, L2, L3, L4, L5, com, axis, normal, R } — 모두 Vector3 (com/axis/normal)
export function computeLagrangePoints(primary, secondary) {
  const m1 = primary.mass;
  const m2 = secondary.mass;
  const M = m1 + m2;
  if (M <= 0) return null;

  // 질량 중심
  _com.copy(primary.position).multiplyScalar(m1).addScaledVector(secondary.position, m2).divideScalar(M);

  // M1 → M2 벡터·거리·축
  _r12.subVectors(secondary.position, primary.position);
  const R = _r12.length();
  if (R < 1e-3) return null;
  _axis.copy(_r12).divideScalar(R); // M1 → M2 단위벡터

  // 회전축 (각운동량 방향). v_rel × r12 또는 그 반대를 사용. 0이면 Y축 fallback.
  _vRel.subVectors(secondary.velocity, primary.velocity);
  _normal.crossVectors(_r12, _vRel);
  if (_normal.lengthSq() < 1e-6) _normal.set(0, 1, 0);
  else _normal.normalize();

  // μ = m2 / M (μ ≤ 0.5 가 정의역. m1 ≥ m2 가정)
  const mu = m2 / M;

  // L1: M2에서 M1 쪽으로 R·α 만큼
  const aL1 = l1Distance(mu);
  const L1 = secondary.position.clone().addScaledVector(_axis, -R * aL1);

  // L2: M2에서 외측으로 R·α
  const aL2 = l2Distance(mu);
  const L2 = secondary.position.clone().addScaledVector(_axis, R * aL2);

  // L3: M1에서 -M2 방향으로 R·β
  const bL3 = l3Distance(mu);
  const L3 = primary.position.clone().addScaledVector(_axis, -R * bL3);

  // L4/L5: COM 기준, M1→M2 축에서 ±60° 회전 + COM에서 거리 R
  // 회전축 = _normal. 회전 시작 벡터: COM → M2 방향과 길이 R(1-μ) 이지만 표준 정의는
  // M1, M2, L4 가 이루는 정삼각형 → COM에서 L4 까지 거리 = R 이지만 방향은 회전.
  // 간단히: M1을 60° 회전한 위치(COM 기준)와 같다.
  const fromComToM1 = primary.position.clone().sub(_com);
  const fromComToM2 = secondary.position.clone().sub(_com);
  const L4 = fromComToM2.clone().applyAxisAngle(_normal, Math.PI / 3).add(_com);
  const L5 = fromComToM2.clone().applyAxisAngle(_normal, -Math.PI / 3).add(_com);

  // 정확히 정삼각형이 되려면 |L4-COM| = R 이 아니라 두 천체를 꼭짓점으로 하는 정삼각형.
  // 위 회전은 |fromComToM2| 길이를 유지하므로, M1 위치를 60° 회전하는 식이 더 정확.
  // 보정: L4/L5 를 (M1+M2)/2 + (M2-M1)/2 회전±60° 중심 보정 — 단순화 위해 다음 식 사용:
  // L4 = COM + 회전(-fromComToM1, +60°) ?  우리가 원하는 건 M1, M2, L4 가 정삼각형.
  // M1, M2 사이 중심 = (M1+M2)/2. L4 = midpoint + perpVec * R*sqrt(3)/2 (수직 방향 normal에 직각이고 axis에 직각)
  const mid = primary.position.clone().add(secondary.position).multiplyScalar(0.5);
  const perp = new THREE.Vector3().crossVectors(_normal, _axis).normalize(); // M1→M2와 회전축 모두에 수직
  const h = (R * Math.sqrt(3)) / 2;
  L4.copy(mid).addScaledVector(perp, h);
  L5.copy(mid).addScaledVector(perp, -h);

  return {
    L1, L2, L3, L4, L5,
    com: _com.clone(),
    axis: _axis.clone(),
    normal: _normal.clone(),
    R, mu,
    primaryId: primary.id,
    secondaryId: secondary.id,
  };
}

// 라그랑주 스냅력을 acceleration에 가산.
// rSnap 내부, 상대속도 < vSnapMax 인 Body에만 작용.
const _delta = new THREE.Vector3();
const _vRelSnap = new THREE.Vector3();
const _refV = new THREE.Vector3(); // 두 주 천체 질량 가중 평균 속도
export function applyLagrangeSnap(bodies, lp, primary, secondary, kSnap, cSnap, rSnap, vSnapMax) {
  if (!lp) return;
  const M = primary.mass + secondary.mass;
  _refV.copy(primary.velocity).multiplyScalar(primary.mass).addScaledVector(secondary.velocity, secondary.mass).divideScalar(M);

  const points = [
    { id: 'L1', pos: lp.L1 }, { id: 'L2', pos: lp.L2 },
    { id: 'L3', pos: lp.L3 }, { id: 'L4', pos: lp.L4 }, { id: 'L5', pos: lp.L5 },
  ];

  for (const b of bodies) {
    if (!b.alive || b.isStatic || b.id === primary.id || b.id === secondary.id) continue;
    if (b.mass > 0.5 * Math.min(primary.mass, secondary.mass)) continue; // 가벼운 객체에만 의미 있음
    let nearest = null, minD2 = Infinity;
    for (const p of points) {
      _delta.subVectors(p.pos, b.position);
      const d2 = _delta.lengthSq();
      if (d2 < minD2) { minD2 = d2; nearest = p; }
    }
    if (!nearest) continue;
    const dist = Math.sqrt(minD2);
    if (dist > rSnap) { b.snappedTo = null; continue; }
    _vRelSnap.subVectors(b.velocity, _refV);
    if (_vRelSnap.length() > vSnapMax && b.snappedTo !== nearest.id) { continue; }
    // 스프링-댐퍼 가속도 가산
    _delta.subVectors(nearest.pos, b.position); // body → L
    b.acceleration.addScaledVector(_delta, kSnap);
    b.acceleration.addScaledVector(_vRelSnap, -cSnap);
    b.snappedTo = nearest.id;
  }
}
