#!/usr/bin/env node
/**
 * Generates 8-bit style BGM as a WAV file. One seamless loop (no cut when loop restarts).
 * Run: node scripts/generate-bgm.js
 * Output: public/sounds/bgm.wav
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'sounds');
const outPath = path.join(outDir, 'bgm.wav');

const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;

// One loop: melody ends before loop end, then fade-out + silence so loop point is seamless
const melody = [
  [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
  [392, 0.15], [523, 0.2], [659, 0.25],
  [523, 0.15], [392, 0.15], [330, 0.15], [262, 0.2],
  [330, 0.15], [392, 0.2], [330, 0.25],
  [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
  [392, 0.15], [523, 0.2], [659, 0.25],
  [523, 0.15], [659, 0.15], [523, 0.15], [392, 0.3],
];

const NOTE_STEP = 0.2;
const LOOP_DURATION = 8;           // one loop only for seamless repeat
const FADE_IN_DURATION = 0.08;     // soft start so loop join doesn't click
const FADE_OUT_START = 7.2;        // start fading out before end
const AMPLITUDE = 0.18;            // lower volume

function squareWave(phase) {
  return phase < 0 ? -1 : 1;
}

function generateNote(freq, durationSec, startSampleIndex, samples, envelopeScale) {
  const numSamples = Math.round(durationSec * SAMPLE_RATE);
  const twoPiF = 2 * Math.PI * freq / SAMPLE_RATE;
  for (let i = 0; i < numSamples; i++) {
    const idx = startSampleIndex + i;
    if (idx >= samples.length) break;
    const phase = Math.sin(twoPiF * i);
    const amp = (envelopeScale !== undefined ? envelopeScale : 1) * AMPLITUDE * 32767 * squareWave(phase);
    samples[idx] = Math.max(-32767, Math.min(32767, Math.round(amp)));
  }
}

function applyFadeIn(samples, fadeSec) {
  const fadeSamples = Math.round(fadeSec * SAMPLE_RATE);
  for (let i = 0; i < fadeSamples && i < samples.length; i++) {
    const t = i / fadeSamples;
    samples[i] = Math.round(samples[i] * t);
  }
}

function applyFadeOut(samples, fadeStartSec, fadeSec) {
  const start = Math.round(fadeStartSec * SAMPLE_RATE);
  const fadeSamples = Math.round(fadeSec * SAMPLE_RATE);
  for (let i = 0; i < fadeSamples; i++) {
    const idx = start + i;
    if (idx >= samples.length) break;
    const t = 1 - i / fadeSamples;
    samples[idx] = Math.round(samples[idx] * t);
  }
  for (let i = start + fadeSamples; i < samples.length; i++) {
    samples[i] = 0;
  }
}

function generateBgmSamples() {
  const totalSamples = Math.ceil(SAMPLE_RATE * LOOP_DURATION);
  const samples = new Int16Array(totalSamples);

  melody.forEach(([freq, dur], i) => {
    const noteStart = Math.round(i * NOTE_STEP * SAMPLE_RATE);
    generateNote(freq, dur, noteStart, samples);
  });

  applyFadeIn(samples, FADE_IN_DURATION);
  applyFadeOut(samples, FADE_OUT_START, LOOP_DURATION - FADE_OUT_START);

  return samples;
}

function createWavBuffer(samples) {
  const numChannels = 1;
  const byteRate = SAMPLE_RATE * numChannels * (BITS_PER_SAMPLE / 8);
  const dataSize = samples.length * 2; // 16-bit = 2 bytes per sample
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  function write(str) {
    buffer.write(str, offset);
    offset += str.length;
  }
  function writeU32LE(val) {
    buffer.writeUInt32LE(val, offset);
    offset += 4;
  }
  function writeU16LE(val) {
    buffer.writeUInt16LE(val, offset);
    offset += 2;
  }

  write('RIFF');
  writeU32LE(fileSize);
  write('WAVE');
  write('fmt ');
  writeU32LE(16);           // chunk size
  writeU16LE(1);           // PCM
  writeU16LE(numChannels);
  writeU32LE(SAMPLE_RATE);
  writeU32LE(byteRate);
  writeU16LE((numChannels * BITS_PER_SAMPLE) / 8);
  writeU16LE(BITS_PER_SAMPLE);
  write('data');
  writeU32LE(dataSize);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }

  return buffer;
}

fs.mkdirSync(outDir, { recursive: true });
const samples = generateBgmSamples();
const wav = createWavBuffer(samples);
fs.writeFileSync(outPath, wav);
console.log('Generated:', outPath);
