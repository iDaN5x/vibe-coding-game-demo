import * as THREE from 'three';
import { getWilsonBallTexture } from './tennisBallTexture.js';
import { WEAPON } from './constants.js';

let scene;
let camera;
let renderer;
let ballMeshes = [];

const BALL_RADIUS = 0.5;
const BALL_SPACING = 1.4;

export function initAmmoDisplay(container) {
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  const width = 152;
  const height = 52;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-width / 40, width / 40, height / 40, -height / 40, 0.1, 100);
  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  const geo = new THREE.SphereGeometry(BALL_RADIUS, 12, 12);

  for (let i = 0; i < WEAPON.magazineSize; i++) {
    const filledMat = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      map: getWilsonBallTexture(),
    });
    const emptyMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const ball = new THREE.Mesh(geo.clone(), filledMat);
    ball.position.x = (i - 1) * BALL_SPACING;
    ball.userData.filledMat = filledMat;
    ball.userData.emptyMat = emptyMat;
    scene.add(ball);
    ballMeshes.push(ball);
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
}

export function updateAmmoDisplay(current, max = WEAPON.magazineSize) {
  if (!ballMeshes.length || !renderer || !scene || !camera) return;
  for (let i = 0; i < ballMeshes.length; i++) {
    const mesh = ballMeshes[i];
    mesh.material = i < current ? mesh.userData.filledMat : mesh.userData.emptyMat;
  }
  renderer.render(scene, camera);
}
