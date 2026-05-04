import { Body } from './physics/Body.js';

// 시뮬상 G ≈ 80, c ≈ 300 가정 하의 보기 좋은 초기 조건들.
// 원궤도 속도 v = sqrt(G·M/r).

export function presetSun() {
  const sun = new Body({ name: 'Sun', mass: 1500, position: [0, 0, 0], velocity: [0, 0, 0], color: 0xffd166 });
  const G = 80;
  const orbits = [
    { name: 'Mercury', r: 80, mass: 5, color: 0xb0b0b0 },
    { name: 'Venus', r: 130, mass: 12, color: 0xffaa66 },
    { name: 'Earth', r: 190, mass: 14, color: 0x66aaff },
    { name: 'Mars', r: 250, mass: 8, color: 0xff6644 },
  ];
  const arr = [sun];
  for (const o of orbits) {
    const v = Math.sqrt((G * sun.mass) / o.r);
    arr.push(new Body({
      name: o.name,
      mass: o.mass,
      position: [o.r, 0, 0],
      velocity: [0, 0, v],
      color: o.color,
    }));
  }
  return arr;
}

export function presetBinary() {
  const G = 80;
  const M = 800;
  const m = 800;
  const sep = 200;
  // 두 별이 질량 중심 주위를 회전
  const r1 = (sep * m) / (M + m);
  const r2 = (sep * M) / (M + m);
  const omega = Math.sqrt((G * (M + m)) / Math.pow(sep, 3));
  const v1 = omega * r1;
  const v2 = omega * r2;
  const a = new Body({ name: 'Binary-A', mass: M, position: [-r1, 0, 0], velocity: [0, 0, -v1], color: 0xffd166 });
  const b = new Body({ name: 'Binary-B', mass: m, position: [r2, 0, 0], velocity: [0, 0, v2], color: 0x66e0ff });
  // L4 위치에 작은 행성 (60° 앞)
  const tracer = new Body({ name: 'L4-Test', mass: 1, position: [sep * 0.5 - r1, 0, sep * Math.sqrt(3) / 2], velocity: [0, 0, 0], color: 0x9effa0 });
  // L4에서의 속도 = ω × r (회전축 +y)
  // r 벡터 (질량 중심 기준): (sep/2 - r1 + r1, 0, sep√3/2) = (sep/2, 0, sep√3/2)
  // 위 위치는 절대좌표 — COM = (M*(-r1) + m*r2)/(M+m) = 0 이므로 그대로
  // v = ω × r, ω = +y * omega → v = (omega*r.z, 0, -omega*r.x) = (omega * sep√3/2, 0, -omega * sep/2)
  const rx = sep / 2;
  const rz = sep * Math.sqrt(3) / 2;
  tracer.velocity.set(omega * rz, 0, -omega * rx);
  return [a, b, tracer];
}

export function presetCluster() {
  const arr = [];
  const center = new Body({ name: 'Core', mass: 1200, position: [0, 0, 0], velocity: [0, 0, 0], color: 0xffd166 });
  arr.push(center);
  const G = 80;
  const N = 40;
  for (let i = 0; i < N; i++) {
    const r = 150 + Math.random() * 350;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 30;
    const v = Math.sqrt((G * center.mass) / r) * (0.85 + Math.random() * 0.3);
    const px = r * Math.cos(theta);
    const pz = r * Math.sin(theta);
    arr.push(new Body({
      name: `P-${i}`,
      mass: 2 + Math.random() * 8,
      position: [px, y, pz],
      velocity: [-v * Math.sin(theta), 0, v * Math.cos(theta)],
    }));
  }
  return arr;
}
