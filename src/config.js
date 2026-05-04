// 단일 진실원: 모든 물리/렌더 상수
export const CONFIG = {
  // 중력
  G: 80,                  // 시뮬상수, 실제값 아님
  SOFTENING: 2.0,         // 거리 발산 방지 ε
  WORLD_BOUNDS: 4000,     // 경계 이탈 제거 거리

  // 충돌·블랙홀
  M_CRIT: 500,            // 블랙홀 자동 전환 질량
  C_SIM: 300,             // R_s = 2Gm/c² 계산용 시뮬 광속
  R_SCHWARZ_MIN: 4,       // 시각화용 최소 사건의 지평선 반경

  // 라그랑주 스냅
  R_SNAP: 18,             // 자석 진입 반경
  V_SNAP_MAX: 6,          // 스냅 진입 최대 상대 속도
  K_SNAP: 1.5,            // 스프링 상수
  C_SNAP: 0.8,            // 댐핑 계수
  L_RECALC_THRESHOLD: 1.0,// 주 천체 이동량이 이 값 초과 시 L점 재계산

  // 시간
  TIME_SCALE: 1.0,
  PAUSED: false,
  DT_FIXED: 1 / 60,       // 고정 타임스텝 (시뮬 안정성)
  DT_MAX_FRAMES: 4,       // rAF 한 프레임당 최대 substep

  // 렌더
  CAMERA_FOV: 60,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 50000,
  CAMERA_INIT_POS: [0, 400, 600],

  // 스폰 기본값
  SPAWN_MASS: 20,
  SPAWN_DENSITY: 0.6,     // r = (3m / 4πρ)^(1/3) 시각 보정용
  SPAWN_VEL_MAX: 30,      // 드래그 거리 → 속도 변환 상한

  // 트레일
  TRAIL_LENGTH: 120,
  TRAIL_ENABLED: true,
};

// 색상 팔레트 (스폰 시 순환)
export const PALETTE = [
  0xffd166, 0x06d6a0, 0x118ab2, 0xef476f, 0xf78c6b,
  0xc792ea, 0x82aaff, 0xc3e88d, 0xff5370, 0xffcb6b,
];

// 질량으로부터 시각 반경 계산 (부피 = m / 밀도)
export function radiusFromMass(mass) {
  const r = Math.cbrt((3 * mass) / (4 * Math.PI * CONFIG.SPAWN_DENSITY));
  return Math.max(1.0, r);
}
