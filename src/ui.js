import * as THREE from 'three';
import { WEAPON } from './constants.js';
import { updateAmmoDisplay } from './ammoDisplay.js';

let camera;
let renderer;
let labelsEl;

export function initUI(cam, rend) {
  camera = cam;
  renderer = rend;
  labelsEl = document.getElementById('labels');
}

export function setGameStarted(started) {
  const startScreen = document.getElementById('start-screen');
  const hpBar = document.getElementById('hp-bar-container');
  const magazine = document.getElementById('magazine');
  const scoreEl = document.getElementById('score');
  const crosshair = document.getElementById('crosshair');
  const gameOver = document.getElementById('game-over');
  if (startScreen) startScreen.style.display = started ? 'none' : 'flex';
  if (hpBar) hpBar.style.display = started ? 'block' : 'none';
  if (magazine) magazine.style.display = started ? 'flex' : 'none';
  if (scoreEl) scoreEl.style.display = started ? 'block' : 'none';
  if (crosshair) crosshair.style.display = started ? 'block' : 'none';
  if (gameOver) gameOver.style.display = 'none';
}

export function updateHPBar(hp, maxHp = 100) {
  const bar = document.getElementById('hp-bar');
  if (!bar) return;
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  bar.style.width = `${pct * 100}%`;
}

export function updateMagazine(current, max = WEAPON.magazineSize) {
  updateAmmoDisplay(current, max);
}

export function updateScore(kills) {
  const el = document.getElementById('score');
  if (!el) return;
  el.textContent = `Kills: ${kills}`;
}

export function setCrouchIndicator(crouching) {
  const el = document.getElementById('crouch-indicator');
  if (!el) return;
  el.style.display = crouching ? 'block' : 'none';
}

export function showGameOver() {
  const gameOver = document.getElementById('game-over');
  const crosshair = document.getElementById('crosshair');
  if (gameOver) gameOver.style.display = 'flex';
  if (crosshair) crosshair.style.display = 'none';
}

export function hideGameOver() {
  const gameOver = document.getElementById('game-over');
  const crosshair = document.getElementById('crosshair');
  if (gameOver) gameOver.style.display = 'none';
  if (crosshair) crosshair.style.display = 'block';
}

export function updateLabels(enemies, corpses) {
  if (!labelsEl || !camera) return;

  while (labelsEl.firstChild) labelsEl.removeChild(labelsEl.firstChild);

  const widthHalf = (renderer?.domElement?.width || window.innerWidth) / 2;
  const heightHalf = (renderer?.domElement?.height || window.innerHeight) / 2;

  const v = new THREE.Vector3();

  enemies.forEach((e) => {
    if (e.state.dead) return;
    v.copy(e.getPosition()).add(new THREE.Vector3(0, 2.2, 0));
    v.project(camera);
    const x = (v.x * widthHalf) + widthHalf;
    const y = -(v.y * heightHalf) + heightHalf;
    if (v.z > 1) return;

    const tag = document.createElement('div');
    tag.className = 'name-tag';
    tag.style.left = `${x}px`;
    tag.style.top = `${y}px`;
    tag.textContent = e.state.nickname;
    labelsEl.appendChild(tag);

    if (e.state.tauntText) {
      const bubble = document.createElement('div');
      bubble.className = 'speech-bubble';
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y - 28}px`;
      bubble.textContent = e.state.tauntText;
      labelsEl.appendChild(bubble);
    }
  });
}
