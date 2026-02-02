import * as THREE from 'three';
import {
  ENEMY,
  KADOSH_NICKNAMES,
  TAUNTS,
  GROUND_Y,
  GROUND_SIZE,
  MAX_CORPSES,
} from './constants.js';
import { getWilsonBallTexture } from './tennisBallTexture.js';

let corpseIdCounter = 0;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSpawnPosition() {
  const half = GROUND_SIZE / 2 - 5;
  return new THREE.Vector3(
    (Math.random() - 0.5) * 2 * half,
    GROUND_Y,
    (Math.random() - 0.5) * 2 * half
  );
}

export function createKadosh(scene, nickname) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.position.y = 0.9;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  head.position.y = 1.6;
  group.add(head);

  const racketGroup = new THREE.Group();
  const racketMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
  const faceGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16);
  const face = new THREE.Mesh(faceGeo, racketMat);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0, 0.3);
  racketGroup.add(face);
  const handleGeo = new THREE.CylinderGeometry(0.03, 0.045, 0.55, 8);
  const handle = new THREE.Mesh(handleGeo, racketMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0);
  racketGroup.add(handle);
  racketGroup.position.set(0.5, 1.15, -0.35);
  racketGroup.rotation.y = -0.3;
  group.add(racketGroup);

  const pos = randomSpawnPosition();
  group.position.copy(pos);
  scene.add(group);

  const state = {
    hp: ENEMY.maxHp,
    nickname: nickname || pickRandom(KADOSH_NICKNAMES),
    dead: false,
    state: 'chase',
    lastAttackTime: 0,
    lastTauntTime: 0,
    tauntText: null,
    tauntEndTime: 0,
    serveAnimStart: 0,
    serveHitApplied: false,
    serveProjectileSpawned: false,
  };

  function takeDamage(amount) {
    state.hp = Math.max(0, state.hp - amount);
    if (state.hp <= 0) state.dead = true;
  }

  function update(dt, now, playerPosition) {
    if (state.dead) return;

    const toPlayer = new THREE.Vector3().subVectors(playerPosition, group.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (state.state === 'serve') {
      const elapsed = (now - state.serveAnimStart) * 1000;
      const serveDuration = 400;
      const t = Math.min(1, elapsed / serveDuration);
      racketGroup.rotation.x = t < 0.5 ? -1.2 * (t * 2) : -1.2 + 2 * (t - 0.5) * 1.5;
      if (elapsed >= serveDuration) {
        state.state = 'chase';
        state.lastAttackTime = now;
        state.serveHitApplied = false;
        state.serveProjectileSpawned = false;
      }
      return;
    }

    if (dist < ENEMY.attackRange && now - state.lastAttackTime > ENEMY.attackCooldownMs / 1000) {
      state.state = 'serve';
      state.serveAnimStart = now;
      group.lookAt(playerPosition.x, group.position.y, playerPosition.z);
      return;
    }

    if (dist > 0.5) {
      toPlayer.normalize();
      group.position.x += toPlayer.x * ENEMY.moveSpeed * dt;
      group.position.z += toPlayer.z * ENEMY.moveSpeed * dt;
      group.position.y = GROUND_Y;
      group.lookAt(playerPosition.x, group.position.y, playerPosition.z);
    }

    if (now - state.lastTauntTime > (ENEMY.tauntIntervalMinMs + Math.random() * (ENEMY.tauntIntervalMaxMs - ENEMY.tauntIntervalMinMs)) / 1000) {
      state.lastTauntTime = now;
      state.tauntText = pickRandom(TAUNTS);
      state.tauntEndTime = now + ENEMY.tauntDurationMs / 1000;
    }
    if (state.tauntEndTime > 0 && now > state.tauntEndTime) {
      state.tauntText = null;
    }
  }

  function getPosition() {
    return group.position.clone();
  }

  function getRacketWorldPosition() {
    const v = new THREE.Vector3();
    racketGroup.getWorldPosition(v);
    return v;
  }

  function getRacketWorldPositionForProjectile() {
    const v = new THREE.Vector3(0, 0, 0.35);
    racketGroup.localToWorld(v);
    return v;
  }

  return {
    group,
    state,
    racketGroup,
    takeDamage,
    update,
    getPosition,
    getRacketWorldPosition,
    getRacketWorldPositionForProjectile,
  };
}

const enemyBallGeo = new THREE.SphereGeometry(0.1, 12, 12);
const enemyBallMat = new THREE.MeshBasicMaterial({
  color: 0xffeb3b,
  map: getWilsonBallTexture(),
});
const ENEMY_BALL_SPIN = 12;

export function createEnemyManager(scene, player, onDamagePlayer, onDeathWhisper) {
  const enemies = [];
  const corpses = [];
  const enemyProjectiles = [];

  function spawnOne() {
    const usedNames = new Set(enemies.map((e) => e.state.nickname));
    let nickname = pickRandom(KADOSH_NICKNAMES);
    while (usedNames.has(nickname) && usedNames.size < KADOSH_NICKNAMES.length) {
      nickname = pickRandom(KADOSH_NICKNAMES);
    }
    const k = createKadosh(scene, nickname);
    enemies.push(k);
    return k;
  }

  for (let i = 0; i < ENEMY.count; i++) spawnOne();

  function removeCorpse(corpse) {
    const i = corpses.indexOf(corpse);
    if (i !== -1) {
      corpses.splice(i, 1);
      scene.remove(corpse.group);
    }
  }

  function killEnemy(kadosh, now, killCount = 1) {
    const idx = enemies.indexOf(kadosh);
    if (idx === -1) return;
    enemies.splice(idx, 1);
    kadosh.state.dead = true;

    if (corpses.length >= MAX_CORPSES) {
      const oldest = corpses.reduce((a, b) => (a.spawnTime < b.spawnTime ? a : b));
      removeCorpse(oldest);
    }

    const group = kadosh.group;
    group.remove(kadosh.racketGroup);
    group.rotation.order = 'XYZ';
    group.rotation.x = Math.PI / 2;
    group.rotation.z = 0;
    group.position.x = kadosh.getPosition().x;
    group.position.z = kadosh.getPosition().z;
    group.position.y = GROUND_Y + 0.4;

    const corpse = {
      id: ++corpseIdCounter,
      position: kadosh.getPosition().clone(),
      used: false,
      spawnTime: now,
      group,
    };
    corpse.position.y = GROUND_Y;
    corpses.push(corpse);

    setTimeout(() => {
      if (onDeathWhisper) onDeathWhisper(killCount);
    }, ENEMY.deathWhisperDelayMs);

    spawnOne();
  }

  function spawnEnemyProjectile(fromPos, toPlayer) {
    const dir = toPlayer.clone().normalize();
    const ball = new THREE.Mesh(enemyBallGeo, enemyBallMat.clone());
    ball.position.copy(fromPos);
    ball.userData.velocity = dir.multiplyScalar(ENEMY.projectileSpeed);
    ball.userData.birth = performance.now() / 1000;
    scene.add(ball);
    enemyProjectiles.push(ball);
  }

  function update(dt, now, playerPosition, playerGroup, killCount = 1) {
    const toRemove = [];
    enemies.forEach((k) => {
      k.update(dt, now, playerPosition);
      if (k.state.dead) toRemove.push(k);
    });
    toRemove.forEach((k) => killEnemy(k, now, killCount));

    enemies.forEach((k) => {
      if (k.state.state === 'serve' && !k.state.serveProjectileSpawned) {
        const serveElapsed = (now - k.state.serveAnimStart) * 1000;
        if (serveElapsed >= 320 && serveElapsed <= 380) {
          k.state.serveProjectileSpawned = true;
          const fromPos = k.getRacketWorldPositionForProjectile();
          const toPlayer = new THREE.Vector3().subVectors(playerPosition, fromPos);
          toPlayer.y = 0;
          if (toPlayer.lengthSq() > 0.01) {
            spawnEnemyProjectile(fromPos, toPlayer);
          }
        }
      }
    });

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const ball = enemyProjectiles[i];
      ball.position.addScaledVector(ball.userData.velocity, dt);
      ball.rotation.x += dt * ENEMY_BALL_SPIN;
      ball.rotation.z += dt * ENEMY_BALL_SPIN * 0.7;
      const age = now - ball.userData.birth;
      if (age > ENEMY.projectileLifetime) {
        scene.remove(ball);
        enemyProjectiles.splice(i, 1);
        continue;
      }
      const dist = ball.position.distanceTo(playerPosition);
      if (dist < 1.5) {
        if (onDamagePlayer) onDamagePlayer(ENEMY.damage);
        scene.remove(ball);
        enemyProjectiles.splice(i, 1);
      }
    }

    return corpses;
  }

  function getEnemies() {
    return enemies;
  }

  function getCorpses() {
    return corpses;
  }

  function reset() {
    enemies.forEach((k) => scene.remove(k.group));
    enemies.length = 0;
    corpses.forEach((c) => scene.remove(c.group));
    corpses.length = 0;
    enemyProjectiles.forEach((b) => scene.remove(b));
    enemyProjectiles.length = 0;
    for (let i = 0; i < ENEMY.count; i++) spawnOne();
  }

  return {
    update,
    getEnemies,
    getCorpses,
    killEnemy,
    removeCorpse,
    reset,
  };
}
