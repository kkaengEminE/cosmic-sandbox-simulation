import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

export class SceneManager {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = null;

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR,
    );
    this.camera.position.set(...CONFIG.CAMERA_INIT_POS);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.mouseButtons = {
      LEFT: null, // 좌클릭은 인터랙션에 사용
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    // 조명 — 행성 셰이딩이 너무 어두워지지 않도록 최소한
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(200, 300, 400);
    this.scene.add(keyLight);

    this._addStarfield();
    this._addGridGuide();

    window.addEventListener('resize', this._onResize);
  }

  _addStarfield() {
    const N = 1500;
    const positions = new Float32Array(N * 3);
    const radius = CONFIG.WORLD_BOUNDS * 4;
    for (let i = 0; i < N; i++) {
      // 균일 구면 분포
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 1.2, color: 0xffffff, sizeAttenuation: false, transparent: true, opacity: 0.85 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  _addGridGuide() {
    // XZ 평면 가이드 — 마우스 스폰 평면을 사용자에게 시각화
    const grid = new THREE.GridHelper(2000, 40, 0x223344, 0x111a22);
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    this.scene.add(grid);
    this.gridHelper = grid;
  }

  _onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
