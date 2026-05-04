import * as THREE from 'three';
import { PALETTE, radiusFromMass } from '../config.js';

let _id = 0;
let _colorIdx = 0;

export class Body {
  constructor({ mass = 20, position = [0, 0, 0], velocity = [0, 0, 0], color, name } = {}) {
    this.id = ++_id;
    this.name = name || `Body-${this.id}`;
    this.mass = mass;
    this.position = new THREE.Vector3(...position);
    this.velocity = new THREE.Vector3(...velocity);
    this.acceleration = new THREE.Vector3();
    this.prevAcceleration = new THREE.Vector3();
    this.radius = radiusFromMass(mass);
    this.color = color ?? PALETTE[(_colorIdx++) % PALETTE.length];

    this.alive = true;
    this.isBlackHole = false;
    this.isStatic = false;          // 사용자가 고정 가능
    this.snappedTo = null;          // 라그랑주 점 ID (string)

    // 외부 시각 핸들 (BodyRenderer가 채움)
    this.mesh = null;
    this.trail = null;
  }

  setMass(m) {
    this.mass = Math.max(0.001, m);
    if (!this.isBlackHole) this.radius = radiusFromMass(this.mass);
  }

  // 운동량 보존 비탄성 병합. this 가 더 무거운 쪽이라 가정.
  absorb(other) {
    const totalMass = this.mass + other.mass;
    // p = m1*v1 + m2*v2
    this.velocity.multiplyScalar(this.mass).addScaledVector(other.velocity, other.mass).divideScalar(totalMass);
    // 질량 가중 위치
    this.position.multiplyScalar(this.mass).addScaledVector(other.position, other.mass).divideScalar(totalMass);
    // 부피 보존: r = (r1³ + r2³)^(1/3) — 시각 일관성을 위해 radiusFromMass와 max
    const volumeRadius = Math.cbrt(this.radius ** 3 + other.radius ** 3);
    this.mass = totalMass;
    if (!this.isBlackHole) this.radius = Math.max(volumeRadius, radiusFromMass(this.mass));
    other.alive = false;
  }
}
