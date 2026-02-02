import * as THREE from 'three';
import {
  MOVEMENT,
  PLAYER,
  CAMERA,
  GROUND_Y,
  TEABAG_DISTANCE,
  TEABAG_CROUCH_INTERVAL_MS,
} from './constants.js';

export function createPlayer(scene) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366aa });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.position.y = 0.9;
  body.visible = false;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.25, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeo, headMat);
  head.castShadow = true;
  head.position.y = 1.6;
  head.visible = false;
  group.add(head);

  group.position.set(0, GROUND_Y, 0);
  scene.add(group);

  const state = {
    velocity: new THREE.Vector3(0, 0, 0),
    grounded: true,
    crouching: false,
    hp: PLAYER.maxHp,
    input: { forward: 0, right: 0, jump: false, crouch: false },
    eulerY: 0,
    eulerPitch: 0,
    crouchCountOnCorpse: 0,
    lastCorpseId: null,
    lastTeabagCrouchRecordTime: 0,
    dead: false,
  };

  const worldUp = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function update(dt, cameraPivot) {
    if (state.dead) return;

    const speed = state.crouching ? MOVEMENT.crouchSpeed : MOVEMENT.walkSpeed;
    forward.set(0, 0, -1).applyAxisAngle(worldUp, state.eulerY);
    right.set(1, 0, 0).applyAxisAngle(worldUp, state.eulerY);

    const move = new THREE.Vector3(0, 0, 0);
    if (state.input.forward) move.addScaledVector(forward, state.input.forward * speed);
    if (state.input.right) move.addScaledVector(right, state.input.right * speed);
    move.clampLength(0, speed);

    state.velocity.x = move.x;
    state.velocity.z = move.z;

    if (state.grounded) {
      if (state.input.jump && !state.crouching) {
        state.velocity.y = MOVEMENT.jumpForce;
        state.grounded = false;
      } else {
        state.velocity.y = 0;
      }
    } else {
      state.velocity.y -= MOVEMENT.gravity * dt;
    }

    group.position.x += state.velocity.x * dt;
    group.position.y += state.velocity.y * dt;
    group.position.z += state.velocity.z * dt;

    if (group.position.y <= GROUND_Y) {
      group.position.y = GROUND_Y;
      state.velocity.y = 0;
      state.grounded = true;
    }

    group.rotation.y = state.eulerY;

    // Crouch visual
    const targetBodyY = state.crouching ? 0.5 : 0.9;
    const targetHeadY = state.crouching ? 1.1 : 1.6;
    body.position.y += (targetBodyY - body.position.y) * Math.min(1, dt * 10);
    head.position.y += (targetHeadY - head.position.y) * Math.min(1, dt * 10);

    // Camera: first person at eye height (lower when crouching)
    const eyeHeight = state.crouching ? CAMERA.crouchEyeHeight : CAMERA.eyeHeight;
    const eyeY = group.position.y + eyeHeight;
    cameraPivot.position.lerp(new THREE.Vector3(group.position.x, eyeY, group.position.z), CAMERA.lerp);
    cameraPivot.rotation.order = 'YXZ';
    cameraPivot.rotation.y = state.eulerY;
    cameraPivot.rotation.x = -state.eulerPitch;
  }

  function setInput(key, value) {
    switch (key) {
      case 'forward': state.input.forward = value; break;
      case 'right': state.input.right = value; break;
      case 'jump': state.input.jump = value; break;
      case 'crouch': state.input.crouch = value; break;
    }
  }

  function setCrouching(v) {
    state.crouching = v;
  }

  function addRotation(dy, dpitch) {
    state.eulerY += dy;
    if (dpitch !== undefined) {
      state.eulerPitch = Math.max(CAMERA.pitchMin, Math.min(CAMERA.pitchMax, state.eulerPitch + dpitch));
    }
  }

  function takeDamage(amount) {
    state.hp = Math.max(0, state.hp - amount);
    if (state.hp <= 0) state.dead = true;
  }

  function heal(amount) {
    state.hp = Math.min(PLAYER.maxHp, state.hp + amount);
  }

  function getPosition() {
    return group.position.clone();
  }

  function getForward() {
    const v = new THREE.Vector3(0, 0, -1);
    v.applyAxisAngle(worldUp, state.eulerY);
    v.applyAxisAngle(right.set(1, 0, 0).applyAxisAngle(worldUp, state.eulerY), state.eulerPitch);
    return v.clone();
  }

  function getForwardHorizontal() {
    const v = new THREE.Vector3(0, 0, -1).applyAxisAngle(worldUp, state.eulerY);
    return v.normalize().clone();
  }

  function getCorpseInRange(corpses) {
    const pos = group.position;
    for (const c of corpses) {
      if (c.used) continue;
      const dx = pos.x - c.position.x;
      const dz = pos.z - c.position.z;
      if (dx * dx + dz * dz <= TEABAG_DISTANCE * TEABAG_DISTANCE) {
        return c;
      }
    }
    return null;
  }

  function checkTeabag(corpses) {
    if (!state.crouching || state.hp >= PLAYER.maxHp) return null;
    return getCorpseInRange(corpses);
  }

  function recordTeabagCrouch(corpseId, nowMs) {
    if (state.lastCorpseId !== corpseId) {
      state.lastCorpseId = corpseId;
      state.crouchCountOnCorpse = 0;
    }
    state.crouchCountOnCorpse++;
    if (nowMs != null) state.lastTeabagCrouchRecordTime = nowMs;
    return state.crouchCountOnCorpse >= PLAYER.teabagCrouchesRequired;
  }

  /** Call from game loop: while crouching in range, counts one crouch every TEABAG_CROUCH_INTERVAL_MS. Returns true when 3rd crouch completes. */
  function tryRecordTeabagCrouch(corpseId, nowMs) {
    if (nowMs - state.lastTeabagCrouchRecordTime < TEABAG_CROUCH_INTERVAL_MS) return false;
    return recordTeabagCrouch(corpseId, nowMs);
  }

  function resetTeabagForCorpse(corpseId) {
    if (state.lastCorpseId === corpseId) {
      state.lastCorpseId = null;
      state.crouchCountOnCorpse = 0;
    }
  }

  function reset() {
    state.velocity.set(0, 0, 0);
    state.grounded = true;
    state.crouching = false;
    state.hp = PLAYER.maxHp;
    state.input.forward = 0;
    state.input.right = 0;
    state.input.jump = false;
    state.input.crouch = false;
    state.eulerY = 0;
    state.eulerPitch = 0;
    state.crouchCountOnCorpse = 0;
    state.lastCorpseId = null;
    state.lastTeabagCrouchRecordTime = 0;
    state.dead = false;
    group.position.set(0, GROUND_Y, 0);
  }

  return {
    group,
    state,
    update,
    setInput,
    setCrouching,
    addRotation,
    takeDamage,
    heal,
    getPosition,
    getForward,
    getForwardHorizontal,
    getCorpseInRange,
    checkTeabag,
    recordTeabagCrouch,
    tryRecordTeabagCrouch,
    resetTeabagForCorpse,
    reset,
  };
}
