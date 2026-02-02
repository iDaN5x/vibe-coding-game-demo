import * as THREE from 'three';
import { GROUND_SIZE, GROUND_Y, CAMERA } from './constants.js';

let scene;
let camera;
let cameraPivot;
let renderer;
let canvas;

export function createScene(canvasEl) {
  canvas = canvasEl;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(30, 40, 30);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 100;
  dir.shadow.camera.left = -40;
  dir.shadow.camera.right = 40;
  dir.shadow.camera.top = 40;
  dir.shadow.camera.bottom = -40;
  scene.add(dir);

  // Ground
  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  function getCanvasSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { width: Math.max(1, w), height: Math.max(1, h) };
  }

  const size = getCanvasSize();
  camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.1, 500);
  cameraPivot = new THREE.Object3D();
  scene.add(cameraPivot);
  camera.position.set(0, 0, 0);
  cameraPivot.add(camera);

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(size.width, size.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function onResize() {
    const { width, height } = getCanvasSize();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  window.addEventListener('resize', onResize);
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas);

  return { scene, camera, cameraPivot, renderer };
}

export function getScene() {
  return scene;
}
export function getCamera() {
  return camera;
}
export function getCameraPivot() {
  return cameraPivot;
}
export function getRenderer() {
  return renderer;
}

export function render() {
  renderer.render(scene, camera);
}
