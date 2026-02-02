/* eslint-env browser, es2022 */
import { createScene, getScene, getCamera, getCameraPivot, getRenderer, render } from './scene.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createEnemyManager } from './enemies.js';
import {
  initUI,
  setGameStarted,
  updateHPBar,
  updateMagazine,
  updateScore,
  updateLabels,
  showGameOver,
  hideGameOver,
  setCrouchIndicator,
} from './ui.js';
import { initAmmoDisplay } from './ammoDisplay.js';
import { resumeAudio, loadAudio, startBGM, playReload, playDjokovic } from './audio.js';
import { WEAPON, PLAYER, CAMERA } from './constants.js';

const canvas = document.getElementById('canvas');
const { scene, camera, cameraPivot, renderer } = createScene(canvas);
const player = createPlayer(scene);
const weapon = createWeapon(player.group, scene);

let enemyManager;
let gameStarted = false;
let lastTime = 0;
let kills = 0;
let gameOverShown = false;
const RESTART_HOLD_MS = 2000;
let restartHoldStart = null;

function onDamagePlayer(amount) {
  player.takeDamage(amount);
}

function onDeathWhisper(killCount) {
  playDjokovic(killCount);
}

enemyManager = createEnemyManager(scene, player, onDamagePlayer, onDeathWhisper);

initUI(camera, renderer);

function segmentSphereIntersect(segStart, segEnd, center, radius) {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const dz = segEnd.z - segStart.z;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq < 1e-10) {
    return segStart.distanceTo(center) <= radius;
  }
  const t = Math.max(0, Math.min(1,
    ((center.x - segStart.x) * dx + (center.y - segStart.y) * dy + (center.z - segStart.z) * dz) / lenSq
  ));
  const closestX = segStart.x + t * dx;
  const closestY = segStart.y + t * dy;
  const closestZ = segStart.z + t * dz;
  const distSq = (center.x - closestX) ** 2 + (center.y - closestY) ** 2 + (center.z - closestZ) ** 2;
  return distSq <= radius * radius;
}

function hitTestEnemy(projectilePrevPos, projectilePos) {
  const enemies = enemyManager.getEnemies();
  const hitRadius = 1.5;
  for (const e of enemies) {
    if (e.state.dead) continue;
    const pos = e.getPosition();
    pos.y += 1;
    if (segmentSphereIntersect(projectilePrevPos, projectilePos, pos, hitRadius)) {
      e.takeDamage(WEAPON.damage);
      if (e.state.dead) {
        kills++;
        enemyManager.killEnemy(e, performance.now() / 1000, kills);
      }
      return true;
    }
  }
  return false;
}

document.getElementById('start-btn').addEventListener('click', async () => {
  gameStarted = true;
  setGameStarted(true);
  initAmmoDisplay(document.getElementById('magazine'));
  resumeAudio();
  await loadAudio();
  // startBGM(); // disabled for now
  canvas.requestPointerLock();
});

canvas.addEventListener('click', () => {
  if (!gameStarted || !document.pointerLockElement) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && gameStarted) {
    // Optional: show pause UI
  }
});

const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyR' && gameStarted) {
    if (weapon.startReload(performance.now() / 1000)) playReload();
  }
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
    player.setInput('crouch', true);
    player.setCrouching(true);
    if (gameStarted && enemyManager) {
      const corpses = enemyManager.getCorpses();
      const corpse = player.checkTeabag(corpses);
      if (corpse && player.recordTeabagCrouch(corpse.id, performance.now())) {
        player.heal(PLAYER.healAmount);
        corpse.used = true;
        player.resetTeabagForCorpse(corpse.id);
        enemyManager.removeCorpse(corpse);
      }
    }
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
    player.setInput('crouch', false);
    player.setCrouching(false);
  }
});

document.addEventListener('mousemove', (e) => {
  if (!document.pointerLockElement) return;
  const sens = CAMERA.sensitivity;
  player.addRotation(-e.movementX * sens, -e.movementY * sens);
});

document.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if (gameOverShown) {
    restartHoldStart = performance.now();
    return;
  }
  if (!gameStarted) return;
  const now = performance.now() / 1000;
  const pos = player.getPosition();
  const origin = pos.clone().set(pos.x, pos.y + 1.2, pos.z);
  const direction = player.getForwardHorizontal();
  weapon.shoot(origin, direction, now);
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) restartHoldStart = null;
});

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const t = now / 1000;
  const dt = lastTime ? Math.min(0.05, t - lastTime) : 1 / 60;
  lastTime = t;

  if (!gameStarted) {
    render();
    return;
  }

  if (player.state.dead) {
    if (!gameOverShown) {
      gameOverShown = true;
      showGameOver();
    }
    if (restartHoldStart !== null && performance.now() - restartHoldStart >= RESTART_HOLD_MS) {
      player.reset();
      weapon.reset();
      enemyManager.reset();
      kills = 0;
      gameOverShown = false;
      restartHoldStart = null;
      hideGameOver();
    }
    render();
    return;
  }

  player.setInput('forward', (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0));
  player.setInput('right', (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0));
  player.setInput('jump', !!keys['Space']);

  player.update(dt, cameraPivot);
  weapon.update(t, dt, hitTestEnemy);

  enemyManager.update(dt, t, player.getPosition(), player.group, kills);

  if (!player.getCorpseInRange(enemyManager.getCorpses())) {
    player.state.lastCorpseId = null;
    player.state.crouchCountOnCorpse = 0;
  } else if (player.state.crouching) {
    const corpses = enemyManager.getCorpses();
    const corpse = player.checkTeabag(corpses);
    if (corpse && player.tryRecordTeabagCrouch(corpse.id, performance.now())) {
      player.heal(PLAYER.healAmount);
      corpse.used = true;
      player.resetTeabagForCorpse(corpse.id);
      enemyManager.removeCorpse(corpse);
    }
  }

  updateHPBar(player.state.hp);
  updateMagazine(weapon.getMagazine());
  updateScore(kills);
  setCrouchIndicator(player.state.crouching);
  updateLabels(enemyManager.getEnemies(), enemyManager.getCorpses());

  render();
}

requestAnimationFrame(gameLoop);