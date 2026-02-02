import * as THREE from 'three';
import { WEAPON } from './constants.js';
import { getWilsonBallTexture } from './tennisBallTexture.js';

export function createWeapon(playerGroup, scene) {
  const racketGroup = new THREE.Group();

  // Racket: flat oval face (disc) + handle along -Z
  const mat = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
  const faceGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16);
  const face = new THREE.Mesh(faceGeo, mat);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0, 0.35);
  racketGroup.add(face);
  const handleGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.65, 8);
  const handle = new THREE.Mesh(handleGeo, mat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0);
  racketGroup.add(handle);

  racketGroup.position.set(0.5, 1.25, -0.4);
  racketGroup.rotation.y = -0.25;
  playerGroup.add(racketGroup);

  const state = {
    magazine: WEAPON.magazineSize,
    isReloading: false,
    reloadStartTime: 0,
    lastShotTime: 0,
  };

  const projectiles = [];
  const projectileGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const projectileMat = new THREE.MeshBasicMaterial({
    color: 0xffeb3b,
    map: getWilsonBallTexture(),
  });

  const SPIN_SPEED = 12;

  function shoot(origin, direction, now) {
    if (state.isReloading || state.magazine <= 0) return false;
    if (now - state.lastShotTime < WEAPON.shootCooldownMs / 1000) return false;
    state.magazine--;
    state.lastShotTime = now;
    const ball = new THREE.Mesh(projectileGeo.clone(), projectileMat.clone());
    ball.position.copy(origin);
    ball.userData.velocity = direction.clone().multiplyScalar(WEAPON.projectileSpeed);
    ball.userData.birth = now;
    scene.add(ball);
    projectiles.push(ball);
    return true;
  }

  function startReload(now) {
    if (state.isReloading || state.magazine >= WEAPON.magazineSize) return false;
    state.isReloading = true;
    state.reloadStartTime = now;
    return true;
  }

  function update(now, dt, hitTest) {
    if (state.isReloading) {
      const elapsed = (now - state.reloadStartTime) * 1000;
      const t = Math.min(1, elapsed / WEAPON.reloadDurationMs);
      racketGroup.rotation.x = -0.5 * t;
      if (elapsed >= WEAPON.reloadDurationMs) {
        state.magazine = WEAPON.magazineSize;
        state.isReloading = false;
        racketGroup.rotation.x = 0;
      }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const prevPos = p.position.clone();
      p.position.addScaledVector(p.userData.velocity, dt);
      p.rotation.x += dt * SPIN_SPEED;
      p.rotation.z += dt * SPIN_SPEED * 0.7;
      if (hitTest && hitTest(prevPos, p.position)) {
        scene.remove(p);
        projectiles.splice(i, 1);
        continue;
      }
      if (now - p.userData.birth > 3) {
        scene.remove(p);
        projectiles.splice(i, 1);
      }
    }
  }

  function getMagazine() {
    return state.magazine;
  }

  function getIsReloading() {
    return state.isReloading;
  }

  function getProjectiles() {
    return projectiles;
  }

  function reset() {
    projectiles.forEach((p) => scene.remove(p));
    projectiles.length = 0;
    state.magazine = WEAPON.magazineSize;
    state.isReloading = false;
    state.reloadStartTime = 0;
    state.lastShotTime = 0;
    racketGroup.rotation.x = 0;
  }

  return {
    racketGroup,
    state,
    shoot,
    startReload,
    update,
    getMagazine,
    getIsReloading,
    getProjectiles,
    reset,
  };
}
