let audioCtx = null;
let bgmGain = null;
let sfxGain = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = 0.12;
    bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();
}

let bgmSource = null;
let bgmBuffer = null;

export async function loadAudio() {
  const ctx = getContext();
  const base = window.__GAME_BASE__ || '';
  try {
    const [bgmRes, djokovicRes] = await Promise.all([
      fetch(`${base}public/sounds/bgm.wav`),
      fetch(`${base}public/sounds/djokovic.wav`),
    ]);
    if (!bgmRes.ok || !djokovicRes.ok) throw new Error('Missing audio files');
    const [bgmArrayBuffer, djokovicArrayBuffer] = await Promise.all([
      bgmRes.arrayBuffer(),
      djokovicRes.arrayBuffer(),
    ]);
    bgmBuffer = await ctx.decodeAudioData(bgmArrayBuffer);
    ctx.djokovicBuffer = await ctx.decodeAudioData(djokovicArrayBuffer);
  } catch (e) {
    console.warn('Audio files not found. Run: npm run generate-audio', e);
  }
}

export function startBGM() {
  const ctx = getContext();
  if (bgmSource || !bgmBuffer) {
    if (!bgmBuffer) return;
    if (bgmSource) return;
  }
  bgmSource = ctx.createBufferSource();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start(0);
}

export function stopBGM() {
  if (bgmSource) {
    try {
      bgmSource.stop();
    } catch (_) {}
    bgmSource = null;
  }
}

export function playReload() {
  const ctx = getContext();
  const now = ctx.currentTime;
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
  }
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  noise.connect(filter);
  filter.connect(sfxGain);
  noise.start(now);
  noise.stop(now + 0.3);
  const pop = ctx.createOscillator();
  pop.type = 'sine';
  pop.frequency.setValueAtTime(800, now);
  pop.frequency.exponentialRampToValueAtTime(100, now + 0.15);
  pop.connect(sfxGain);
  pop.start(now);
  pop.stop(now + 0.15);
}

export function playDjokovic(killCount = 1) {
  const ctx = getContext();
  if (!ctx.djokovicBuffer) return;
  const source = ctx.createBufferSource();
  source.buffer = ctx.djokovicBuffer;
  const pitch = Math.min(2.2, 1 + (killCount - 1) * 0.18);
  source.playbackRate.value = pitch;
  source.connect(sfxGain);
  source.start(0);
}
