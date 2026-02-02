import * as THREE from 'three';

let cachedTexture = null;

export function getWilsonBallTexture() {
  if (cachedTexture) return cachedTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fdd835';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Wilson', size / 2, size / 2);
  cachedTexture = new THREE.CanvasTexture(canvas);
  cachedTexture.needsUpdate = true;
  return cachedTexture;
}
