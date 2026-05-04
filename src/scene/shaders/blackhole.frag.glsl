// 사건의 지평선 디스크 + 외곽 accretion 글로우.
// 카메라 정면을 향하는 빌보드 평면에 적용.
varying vec2 vUv;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uGlowColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0; // 0..1 from center to edge

  // 사건의 지평선 (안쪽 검은 디스크). 부드러운 가장자리.
  float horizon = smoothstep(0.42, 0.40, r);

  // accretion ring: 도넛 형태 + 회전 + 노이즈
  float ang = atan(c.y, c.x);
  float ring = smoothstep(0.40, 0.55, r) * (1.0 - smoothstep(0.85, 1.0, r));
  float swirl = noise(vec2(ang * 4.0 + uTime * 1.2, r * 6.0 - uTime * 0.8));
  ring *= 0.6 + 0.8 * swirl;

  // 외곽 페이드
  float outer = (1.0 - smoothstep(0.85, 1.0, r));

  vec3 col = mix(uGlowColor * 1.6, vec3(1.0, 0.85, 0.55), 0.4) * ring;
  col *= uIntensity;

  // 검은 디스크
  col *= (1.0 - horizon);

  float alpha = max(ring, horizon * 0.95) * outer;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
