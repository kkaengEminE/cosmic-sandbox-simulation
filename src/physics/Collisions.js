// 비탄성 병합 + 경계 이탈 제거. dispose 콜백은 외부(BodyRenderer)에서 등록.
export function resolveCollisionsAndBounds(bodies, worldBounds, mCrit, onMerge, onRemove) {
  // 1) 충돌 검출 (O(n²) 단순 페어 — 성능 충분)
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!b.alive) continue;
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const dz = a.position.z - b.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < a.radius + b.radius) {
        // 더 무거운 쪽이 흡수. 동률이면 a.
        const [winner, loser] = a.mass >= b.mass ? [a, b] : [b, a];
        // 블랙홀이 한쪽이면 무조건 블랙홀이 winner
        if (a.isBlackHole && !b.isBlackHole) { winner === a || ([winner, loser][0] = a); }
        if (b.isBlackHole && !a.isBlackHole) { winner === b || ([winner, loser][0] = b); }
        const realWinner = a.isBlackHole ? a : (b.isBlackHole ? b : (a.mass >= b.mass ? a : b));
        const realLoser = realWinner === a ? b : a;
        realWinner.absorb(realLoser);
        if (onMerge) onMerge(realWinner, realLoser);
      }
    }
  }

  // 2) 사망 처리 + 경계 이탈
  for (let i = bodies.length - 1; i >= 0; i--) {
    const b = bodies[i];
    if (!b.alive) {
      if (onRemove) onRemove(b);
      bodies.splice(i, 1);
      continue;
    }
    if (b.position.lengthSq() > worldBounds * worldBounds) {
      b.alive = false;
      if (onRemove) onRemove(b);
      bodies.splice(i, 1);
    }
  }

  // 3) 블랙홀 자동 전환 신호 (실제 변환은 main에서 BlackHole 클래스가 처리)
  for (const b of bodies) {
    if (!b.isBlackHole && b.mass >= mCrit) b._wantBlackHole = true;
  }
}
